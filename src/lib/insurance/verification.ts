import prisma from "@/src/lib/prisma";
import {HelsiApiClient} from "@/src/lib/helsi/client";

export type PolicyType = "nhsu" | "private" | "corporate" | "none";

export type InsuranceVerificationResult = {
  covered: boolean;
  policyType: PolicyType;
  coverageAmount: number;
  coPayAmount: number;
  totalCost: number;
};

// Standard consultation prices per appointment type (UAH, effective 2026).
// These should be reviewed annually or whenever clinic pricing changes.
const CONSULTATION_PRICES_UAH: Record<string, number> = {
  general: 500,
  specialist: 700,
  default: 500,
};

// NHSU covers a fixed amount per consultation (UAH, per NHSU programme tariffs)
const NHSU_COVERAGE_UAH = 400;
// Private insurance covers a percentage of the total cost
const PRIVATE_COVERAGE_PERCENT = 0.6;
// Corporate (employer-sponsored group) insurance covers a higher percentage
const CORPORATE_COVERAGE_PERCENT = 0.8;

function getConsultationPrice(appointmentType: string): number {
  return CONSULTATION_PRICES_UAH[appointmentType.toLowerCase()] ?? CONSULTATION_PRICES_UAH.default;
}

/**
 * Infers policy type from the stored insurance provider name and group number.
 *
 * Convention used throughout the application:
 *   - providerName "NHSU" → national health scheme declaration
 *   - non-null groupNumber → employer/corporate group plan
 *   - everything else → individual private policy
 *
 * If providers start using group numbers for non-corporate plans, extend this
 * function with additional classification rules.
 */
function inferPolicyType(providerName: string, groupNumber: string | null): Exclude<PolicyType, "none"> {
  const normalizedProvider = providerName.trim().toUpperCase();
  if (normalizedProvider === "NHSU") {
    return "nhsu";
  }
  if (groupNumber) {
    return "corporate";
  }
  return "private";
}

/**
 * Verifies NHSU declaration status via the Helsi API.
 * Returns true (covered) if Helsi confirms the declaration is active,
 * or if Helsi is not configured (graceful degradation to stored data).
 */
async function verifyNhsuViaHelsi(patientId: string, policyNumber: string): Promise<boolean> {
  if (!process.env.HELSI_API_BASE_URL || !process.env.HELSI_API_TOKEN) {
    // Helsi not configured — trust the stored policy record
    return true;
  }

  try {
    const client = new HelsiApiClient();
    const response = await client.get<{active?: boolean}>(`/patients/${patientId}/nhsu`, {
      policyNumber,
    });
    return response?.active === true;
  } catch {
    // Helsi unavailable — fall back to stored policy (covered)
    return true;
  }
}

/**
 * Verifies a patient's insurance coverage for a given appointment type.
 *
 * @param patientId - UUID of the patient
 * @param appointmentType - The appointment type key (e.g. "general", "specialist")
 * @returns Coverage details including covered status, policy type, amounts, and total cost
 * @throws Error if the patient is not found
 */
export async function verifyInsurance(
  patientId: string,
  appointmentType: string,
): Promise<InsuranceVerificationResult> {
  const totalCost = getConsultationPrice(appointmentType);

  const patient = await prisma.patient.findUnique({
    where: {id: patientId},
    select: {
      id: true,
      insurancePolicies: {
        where: {isPrimary: true},
        select: {
          providerName: true,
          policyNumber: true,
          groupNumber: true,
          expirationDate: true,
        },
        take: 1,
      },
    },
  });

  if (!patient) {
    throw new Error(`Patient not found: ${patientId}`);
  }

  const primaryPolicy = patient.insurancePolicies[0] ?? null;

  if (!primaryPolicy) {
    return {
      covered: false,
      policyType: "none",
      coverageAmount: 0,
      coPayAmount: totalCost,
      totalCost,
    };
  }

  // Check if the policy is expired
  const isExpired = primaryPolicy.expirationDate ? primaryPolicy.expirationDate < new Date() : false;

  const policyType = inferPolicyType(primaryPolicy.providerName, primaryPolicy.groupNumber);

  if (isExpired) {
    return {
      covered: false,
      policyType,
      coverageAmount: 0,
      coPayAmount: totalCost,
      totalCost,
    };
  }

  if (policyType === "nhsu") {
    const nhsuActive = await verifyNhsuViaHelsi(patientId, primaryPolicy.policyNumber);
    if (!nhsuActive) {
      return {
        covered: false,
        policyType: "nhsu",
        coverageAmount: 0,
        coPayAmount: totalCost,
        totalCost,
      };
    }
    const coverageAmount = Math.min(NHSU_COVERAGE_UAH, totalCost);
    const coPayAmount = Math.max(0, totalCost - coverageAmount);
    return {
      covered: true,
      policyType: "nhsu",
      coverageAmount,
      coPayAmount,
      totalCost,
    };
  }

  // Private or corporate insurance — coverage is a percentage of total cost
  const coveragePercent = policyType === "corporate" ? CORPORATE_COVERAGE_PERCENT : PRIVATE_COVERAGE_PERCENT;
  const coverageAmount = Math.round(totalCost * coveragePercent);
  const coPayAmount = totalCost - coverageAmount;

  return {
    covered: true,
    policyType,
    coverageAmount,
    coPayAmount,
    totalCost,
  };
}
