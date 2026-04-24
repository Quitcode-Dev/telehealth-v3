import {NextResponse} from "next/server";
import prisma from "@/src/lib/prisma";
import {getLiqPayService, isLiqPayConfigured} from "@/src/lib/payments/liqpay";
import type {PaymentStatus} from "@prisma/client";

function mapLiqPayStatus(liqpayStatus: string): PaymentStatus {
  if (liqpayStatus === "success" || liqpayStatus === "sandbox") {
    return "SUCCESS";
  }
  if (liqpayStatus === "failure" || liqpayStatus === "error") {
    return "FAILED";
  }
  return "PENDING";
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Payment service is unavailable"}, {status: 503});
  }

  if (!isLiqPayConfigured()) {
    return NextResponse.json({error: "Payment service is unavailable"}, {status: 503});
  }

  const body = await request.formData().catch(() => null);
  if (!body) {
    return NextResponse.json({error: "Invalid callback payload"}, {status: 400});
  }

  const data = body.get("data");
  const signature = body.get("signature");

  if (typeof data !== "string" || typeof signature !== "string") {
    return NextResponse.json({error: "Missing data or signature"}, {status: 400});
  }

  const liqpay = getLiqPayService();

  if (!liqpay.verifyCallback(data, signature)) {
    return NextResponse.json({error: "Invalid signature"}, {status: 400});
  }

  const payload = liqpay.decodeCallbackData(data);

  const paymentStatus = mapLiqPayStatus(payload.status);

  try {
    await prisma.payment.update({
      where: {orderId: payload.order_id},
      data: {status: paymentStatus},
    });

    return new NextResponse(null, {status: 200});
  } catch (error) {
    console.error("Failed to update payment status", error);
    return NextResponse.json({error: "Failed to process callback"}, {status: 502});
  }
}
