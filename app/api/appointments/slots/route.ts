import {NextResponse} from "next/server";
import {z} from "zod";
import {HelsiAvailabilityService} from "@/src/lib/helsi/availability";

const slotsQuerySchema = z.object({
  specialty: z.string().trim().min(1),
  date: z.string().trim().date(),
  physicianId: z.string().trim().min(1).optional(),
});

function isHelsiConfigured() {
  return Boolean(process.env.HELSI_API_BASE_URL && process.env.HELSI_API_TOKEN);
}

export async function GET(request: Request) {
  if (!isHelsiConfigured()) {
    return NextResponse.json({error: "Appointment slots are unavailable"}, {status: 503});
  }

  const url = new URL(request.url);
  const parsed = slotsQuerySchema.safeParse({
    specialty: url.searchParams.get("specialty"),
    date: url.searchParams.get("date"),
    physicianId: url.searchParams.get("physicianId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({error: "Invalid slots query parameters"}, {status: 400});
  }

  const {specialty, date, physicianId} = parsed.data;
  const availabilityService = new HelsiAvailabilityService();

  try {
    const slots = physicianId
      ? await availabilityService.getAvailableSlots(specialty, physicianId, {startDate: date, endDate: date})
      : await availabilityService.getAvailableSlots(specialty, {startDate: date, endDate: date});

    return NextResponse.json({slots});
  } catch {
    return NextResponse.json({error: "Failed to fetch appointment slots"}, {status: 502});
  }
}
