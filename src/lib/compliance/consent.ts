import {ConsentType} from "@prisma/client";
import prisma from "@/src/lib/prisma";

export type {ConsentType};

export type ConsentStatus = {
  granted: boolean;
  version: string | null;
  recordedAt: Date | null;
};

export class ConsentService {
  /**
   * Records patient consent for a specific consent type and version.
   * Creates a new record each time consent is given or revoked, preserving audit history.
   */
  async recordConsent(
    patientId: string,
    consentType: ConsentType,
    version: string,
    granted: boolean,
  ): Promise<void> {
    if (!process.env.DATABASE_URL) {
      console.warn("[consent] DATABASE_URL not set; consent record not persisted");
      return;
    }

    try {
      await prisma.consentRecord.create({
        data: {
          patientId,
          consentType,
          version,
          granted,
        },
      });
    } catch (err) {
      console.error("[consent] Failed to record consent:", err);
    }
  }

  /**
   * Checks whether the patient has an active granted consent for the given type.
   * Returns the most recent consent record for the patient and type.
   */
  async checkConsent(patientId: string, consentType: ConsentType): Promise<ConsentStatus> {
    if (!process.env.DATABASE_URL) {
      console.warn("[consent] DATABASE_URL not set; returning no consent");
      return {granted: false, version: null, recordedAt: null};
    }

    try {
      const record = await prisma.consentRecord.findFirst({
        where: {patientId, consentType},
        orderBy: {createdAt: "desc"},
        select: {granted: true, version: true, createdAt: true},
      });

      if (!record) {
        return {granted: false, version: null, recordedAt: null};
      }

      return {granted: record.granted, version: record.version, recordedAt: record.createdAt};
    } catch (err) {
      console.error("[consent] Failed to check consent:", err);
      return {granted: false, version: null, recordedAt: null};
    }
  }
}

let consentService: ConsentService | null = null;

export function getConsentService(): ConsentService {
  if (!consentService) {
    consentService = new ConsentService();
  }

  return consentService;
}
