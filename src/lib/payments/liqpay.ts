import {createHash} from "crypto";

export type LiqPayAction = "pay" | "subscribe" | "paydonate";

export type LiqPayPaymentData = {
  data: string;
  signature: string;
};

export type LiqPayCallbackPayload = {
  order_id: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  payment_id?: number;
  err_code?: string;
  err_description?: string;
};

function getPublicKey(): string {
  const key = process.env.LIQPAY_PUBLIC_KEY;
  if (!key) {
    throw new Error("LIQPAY_PUBLIC_KEY is not configured");
  }
  return key;
}

function getPrivateKey(): string {
  const key = process.env.LIQPAY_PRIVATE_KEY;
  if (!key) {
    throw new Error("LIQPAY_PRIVATE_KEY is not configured");
  }
  return key;
}

function isSandbox(): boolean {
  return process.env.LIQPAY_SANDBOX !== "0";
}

// LiqPay API v3 mandates SHA1 for HMAC computation; this is a platform
// requirement and cannot be changed. Keep the private key secret to
// maintain the security of this integration.
function buildSignature(privateKey: string, data: string): string {
  return createHash("sha1")
    .update(privateKey + data + privateKey)
    .digest("base64");
}

function encodeData(params: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(params)).toString("base64");
}

function decodeData(data: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(data, "base64").toString("utf-8")) as Record<string, unknown>;
}

export type LiqPayServiceOptions = {
  publicKey?: string;
  privateKey?: string;
  sandbox?: boolean;
};

export class LiqPayService {
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly sandbox: boolean;

  constructor(options?: LiqPayServiceOptions) {
    this.publicKey = options?.publicKey ?? getPublicKey();
    this.privateKey = options?.privateKey ?? getPrivateKey();
    this.sandbox = options?.sandbox ?? isSandbox();
  }

  /**
   * Creates a LiqPay payment and returns the encoded data and signature
   * needed to render the checkout widget or redirect to the payment page.
   *
   * @param amount - Amount to charge in UAH
   * @param description - Human-readable payment description
   * @param orderId - Unique order identifier
   * @returns Object with base64-encoded data and HMAC-SHA1 signature
   */
  createPayment(amount: number, description: string, orderId: string): LiqPayPaymentData {
    const params: Record<string, unknown> = {
      version: 3,
      public_key: this.publicKey,
      action: "pay" satisfies LiqPayAction,
      amount,
      currency: "UAH",
      description,
      order_id: orderId,
      sandbox: this.sandbox ? 1 : 0,
    };

    const data = encodeData(params);
    const signature = buildSignature(this.privateKey, data);

    return {data, signature};
  }

  /**
   * Verifies the LiqPay server-to-server callback signature.
   *
   * @param data - Base64-encoded JSON payload from LiqPay
   * @param signature - SHA1 signature from LiqPay
   * @returns true if the signature is valid, false otherwise
   */
  verifyCallback(data: string, signature: string): boolean {
    const expectedSignature = buildSignature(this.privateKey, data);
    return expectedSignature === signature;
  }

  /**
   * Decodes the base64 callback data payload.
   *
   * @param data - Base64-encoded JSON payload from LiqPay
   * @returns Parsed callback payload
   */
  decodeCallbackData(data: string): LiqPayCallbackPayload {
    const decoded = decodeData(data);
    return decoded as LiqPayCallbackPayload;
  }
}

let instance: LiqPayService | null = null;

/**
 * Returns a singleton LiqPayService instance using environment variables.
 * Throws if required env vars are absent.
 */
export function getLiqPayService(): LiqPayService {
  if (!instance) {
    instance = new LiqPayService();
  }
  return instance;
}

export function isLiqPayConfigured(): boolean {
  return Boolean(process.env.LIQPAY_PUBLIC_KEY && process.env.LIQPAY_PRIVATE_KEY);
}
