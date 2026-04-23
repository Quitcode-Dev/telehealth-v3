import { HelsiApiClient, type HelsiClientOptions } from "@/src/lib/helsi/client";

export const AVAILABILITY_CACHE_TTL_MS = 2 * 60 * 1000;
export const SLOT_LOCK_TTL_MS = 5 * 60 * 1000;

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type HelsiAvailableSlot = {
  id: string;
  physicianId: string;
  specialtyId: string;
  startsAt: string;
  endsAt: string;
};

type AvailabilityCacheEntry = {
  slots: HelsiAvailableSlot[];
  expiresAt: number;
};

type SlotLock = {
  patientId: string;
  expiresAt: number;
};

export type SlotLockResult =
  | {
      locked: true;
      slotId: string;
      patientId: string;
      expiresAt: Date;
    }
  | {
      locked: false;
      slotId: string;
      lockedByPatientId: string;
      expiresAt: Date;
    };

export type HelsiAvailabilityServiceOptions = {
  client?: HelsiApiClient;
  clientOptions?: HelsiClientOptions;
  cacheTtlMs?: number;
  lockTtlMs?: number;
};

function normalizeSlots(payload: unknown): HelsiAvailableSlot[] {
  if (Array.isArray(payload)) {
    return payload as HelsiAvailableSlot[];
  }

  if (payload && typeof payload === "object" && "slots" in payload) {
    const slots = (payload as { slots?: unknown }).slots;
    if (Array.isArray(slots)) {
      return slots as HelsiAvailableSlot[];
    }
  }

  return [];
}

function createCacheKey(specialtyId: string, physicianId: string | undefined, dateRange: DateRange) {
  return [specialtyId, physicianId ?? "all-physicians", dateRange.startDate, dateRange.endDate].join(":");
}

export class HelsiAvailabilityService {
  private readonly client: HelsiApiClient;
  private readonly cacheTtlMs: number;
  private readonly lockTtlMs: number;
  private readonly availabilityCache = new Map<string, AvailabilityCacheEntry>();
  private readonly slotLocks = new Map<string, SlotLock>();

  constructor(options?: HelsiAvailabilityServiceOptions) {
    this.client = options?.client ?? new HelsiApiClient(options?.clientOptions);
    this.cacheTtlMs = options?.cacheTtlMs ?? AVAILABILITY_CACHE_TTL_MS;
    this.lockTtlMs = options?.lockTtlMs ?? SLOT_LOCK_TTL_MS;
  }

  private cleanupExpiredState(now: number) {
    for (const [cacheKey, cacheEntry] of this.availabilityCache.entries()) {
      if (cacheEntry.expiresAt <= now) {
        this.availabilityCache.delete(cacheKey);
      }
    }

    for (const [slotId, lock] of this.slotLocks.entries()) {
      if (lock.expiresAt <= now) {
        this.slotLocks.delete(slotId);
      }
    }
  }

  async getAvailableSlots(
    specialtyId: string,
    physicianIdOrDateRange: string | DateRange,
    maybeDateRange?: DateRange,
  ): Promise<HelsiAvailableSlot[]> {
    const now = Date.now();
    this.cleanupExpiredState(now);

    const physicianId = typeof physicianIdOrDateRange === "string" ? physicianIdOrDateRange : undefined;
    const dateRange = typeof physicianIdOrDateRange === "string" ? maybeDateRange : physicianIdOrDateRange;
    if (!dateRange) {
      throw new Error("dateRange is required");
    }

    const cacheKey = createCacheKey(specialtyId, physicianId, dateRange);
    const cachedEntry = this.availabilityCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > now) {
      return cachedEntry.slots;
    }

    const payload = await this.client.get<unknown>("/availability", {
      specialtyId,
      physicianId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
    const slots = normalizeSlots(payload);
    this.availabilityCache.set(cacheKey, {
      slots,
      expiresAt: now + this.cacheTtlMs,
    });

    return slots;
  }

  lockSlot(slotId: string, patientId: string): SlotLockResult {
    const now = Date.now();
    this.cleanupExpiredState(now);

    const existingLock = this.slotLocks.get(slotId);
    if (existingLock && existingLock.expiresAt > now && existingLock.patientId !== patientId) {
      return {
        locked: false,
        slotId,
        lockedByPatientId: existingLock.patientId,
        expiresAt: new Date(existingLock.expiresAt),
      };
    }

    const expiresAt = now + this.lockTtlMs;
    this.slotLocks.set(slotId, {
      patientId,
      expiresAt,
    });

    return {
      locked: true,
      slotId,
      patientId,
      expiresAt: new Date(expiresAt),
    };
  }
}

export const helsiAvailabilityService = new HelsiAvailabilityService();
