import {NextResponse} from "next/server";
import {z} from "zod";
import prisma from "@/src/lib/prisma";
import {getLiqPayService, isLiqPayConfigured} from "@/src/lib/payments/liqpay";

const createPaymentSchema = z.object({
  patientId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().trim().min(1).max(500),
  orderId: z.string().trim().min(1),
}).strict();

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({error: "Payment service is unavailable"}, {status: 503});
  }

  if (!isLiqPayConfigured()) {
    return NextResponse.json({error: "Payment service is unavailable"}, {status: 503});
  }

  const body = await request.json().catch(() => null);
  const parsed = createPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid payment payload"}, {status: 400});
  }

  const {patientId, amount, description, orderId} = parsed.data;

  const patient = await prisma.patient.findUnique({
    where: {id: patientId},
    select: {id: true},
  });

  if (!patient) {
    return NextResponse.json({error: "Patient not found"}, {status: 404});
  }

  try {
    const liqpay = getLiqPayService();
    const paymentData = liqpay.createPayment(amount, description, orderId);

    await prisma.payment.create({
      data: {
        orderId,
        patientId,
        amount,
        description,
        status: "PENDING",
        liqpayData: paymentData.data,
      },
    });

    return NextResponse.json({
      orderId,
      data: paymentData.data,
      signature: paymentData.signature,
    }, {status: 201});
  } catch (error) {
    console.error("Failed to create payment", error);
    return NextResponse.json({error: "Failed to create payment"}, {status: 502});
  }
}
