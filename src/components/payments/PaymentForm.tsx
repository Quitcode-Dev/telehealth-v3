"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useTranslations, useLocale} from "next-intl";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";

type LiqPayCallbackData = {
  status: string;
  err_description?: string;
  order_id?: string;
};

type LiqPayCheckoutInstance = {
  on: (event: string, callback: (data: LiqPayCallbackData) => void) => LiqPayCheckoutInstance;
};

declare global {
  interface Window {
    LiqPayCheckout?: {
      init: (options: {
        data: string;
        signature: string;
        embedTo: string;
        language?: string;
        mode?: string;
      }) => LiqPayCheckoutInstance;
    };
  }
}

export type PaymentFormProps = {
  /** Patient UUID for the appointment */
  patientId: string;
  /** Slot ID being booked */
  slotId: string;
  /** Amount to charge in UAH */
  amount: number;
  /** Human-readable payment description */
  description: string;
  /** Reason for visit (forwarded to appointment creation) */
  reasonForVisit: string;
  /** Called with the confirmed appointment ID on success */
  onSuccess: (appointmentId: string) => void;
  /** Called when the user cancels or goes back */
  onCancel: () => void;
};

type PaymentState =
  | {status: "initializing"}
  | {status: "widget_ready"; data: string; signature: string; orderId: string}
  | {status: "processing"}
  | {status: "error"; message: string; retryable: boolean};

const WIDGET_CONTAINER_ID = "liqpay-checkout-widget";
const LIQPAY_SCRIPT_SRC = "https://static.liqpay.ua/libjs/checkout.js";

function generateOrderId(slotId: string): string {
  return `appt-${slotId}-${Date.now()}`;
}

export function PaymentForm({
  patientId,
  slotId,
  amount,
  description,
  reasonForVisit,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const t = useTranslations("PaymentForm");
  const locale = useLocale();
  // LiqPay widget supports "uk" and "en" language codes.
  const liqpayLanguage = locale === "uk" ? "uk" : "en";
  const [state, setState] = useState<PaymentState>({status: "initializing"});
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const initPayment = useCallback(async () => {
    setState({status: "initializing"});
    const orderId = generateOrderId(slotId);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({patientId, amount, description, orderId}),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {error?: string};
        throw new Error(json.error ?? t("errors.initFailed"));
      }
      const json = (await res.json()) as {data: string; signature: string};
      setState({status: "widget_ready", data: json.data, signature: json.signature, orderId});
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.initFailed");
      // Network issues and transient service errors are retryable.
      setState({status: "error", message, retryable: true});
    }
  }, [patientId, amount, description, slotId, t]);

  useEffect(() => {
    void initPayment();
  }, [initPayment]);

  // Snapshot the widget credentials into stable variables so the
  // script-loading effect only re-runs when we have new LiqPay data.
  const widgetStateData = state.status === "widget_ready" ? state.data : null;
  const widgetStateSignature = state.status === "widget_ready" ? state.signature : null;
  const widgetStateOrderId = state.status === "widget_ready" ? state.orderId : null;

  const widgetData = useMemo(
    () =>
      widgetStateData && widgetStateSignature && widgetStateOrderId
        ? {data: widgetStateData, signature: widgetStateSignature, orderId: widgetStateOrderId}
        : null,
    [widgetStateData, widgetStateSignature, widgetStateOrderId],
  );

  useEffect(() => {
    if (!widgetData) return;

    const {data, signature, orderId} = widgetData;

    // Remove any previously-injected script before re-loading.
    if (scriptRef.current && document.body.contains(scriptRef.current)) {
      document.body.removeChild(scriptRef.current);
      scriptRef.current = null;
    }

    const script = document.createElement("script");
    scriptRef.current = script;
    script.src = LIQPAY_SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      if (!window.LiqPayCheckout) {
        setState({status: "error", message: t("errors.widgetLoadFailed"), retryable: true});
        return;
      }

      window.LiqPayCheckout.init({
        data,
        signature,
        embedTo: `#${WIDGET_CONTAINER_ID}`,
        language: liqpayLanguage,
        mode: "embed",
      }).on("liqpay.callback", (callbackData) => {
        const successStatuses = ["success", "sandbox"];
        if (successStatuses.includes(callbackData.status)) {
          setState({status: "processing"});
          void (async () => {
            try {
              const res = await fetch("/api/appointments", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({slotId, patientId, reasonForVisit, paymentId: orderId}),
              });
              if (!res.ok) {
                const json = (await res.json().catch(() => ({}))) as {error?: string};
                throw new Error(json.error ?? t("errors.confirmFailed"));
              }
              const json = (await res.json()) as {appointmentId: string};
              onSuccessRef.current(json.appointmentId);
            } catch (err) {
              const message = err instanceof Error ? err.message : t("errors.confirmFailed");
              setState({status: "error", message, retryable: false});
            }
          })();
        } else {
          const message = callbackData.err_description ?? t("errors.paymentDeclined");
          setState({status: "error", message, retryable: true});
        }
      });
    };

    script.onerror = () => {
      setState({status: "error", message: t("errors.widgetLoadFailed"), retryable: true});
    };

    document.body.appendChild(script);

    return () => {
      if (scriptRef.current && document.body.contains(scriptRef.current)) {
        document.body.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  // widgetData reference is stable for a given data/signature pair; we also depend on
  // slotId, patientId, reasonForVisit, t and liqpayLanguage which are stable across retries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetData, liqpayLanguage]);

  const isLoading = state.status === "initializing" || state.status === "processing";
  const loadingMessage = state.status === "initializing" ? t("initializing") : t("processing");

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading states */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
        )}

        {/* Error state */}
        {state.status === "error" && (
          <div className="space-y-3">
            <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.message}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {state.retryable && (
                <Button type="button" onClick={() => void initPayment()}>
                  {t("retryPayment")}
                </Button>
              )}
              <Button
                type="button"
                className="border border-border bg-transparent text-foreground"
                onClick={onCancel}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* LiqPay widget container — always present so LiqPay can embed into it */}
        <div
          id={WIDGET_CONTAINER_ID}
          className={state.status === "widget_ready" ? undefined : "hidden"}
          aria-label={t("widgetLabel")}
        />
      </CardContent>
    </Card>
  );
}
