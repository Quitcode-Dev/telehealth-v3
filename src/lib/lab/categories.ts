export type LabCategory = "ROUTINE" | "SENSITIVE";

/**
 * LOINC codes that map to sensitive result categories.
 * Sensitive results require physician review before patient release.
 * This mapping is configurable per clinical policy.
 */
export const SENSITIVE_LOINC_CODES: ReadonlySet<string> = new Set([
  // HIV / Immunodeficiency
  "85319-2", // HIV 1+2 Ab
  "56888-1", // HIV 1 and 2 Ab+Ag [Presence]
  "43185-8", // HIV 1 RNA

  // Hepatitis
  "16935-9", // Hepatitis B surface Ag
  "43304-5", // Hepatitis C Ab

  // Sexually transmitted infections
  "11268-0", // Chlamydia trachomatis DNA
  "24111-7", // Neisseria gonorrhoeae DNA
  "17723-7", // Treponema pallidum Ab (Syphilis)

  // Oncology / tumour markers
  "10334-1", // Cancer Ag 125 (CA-125)
  "81695-9", // BRCA1/2 gene mutation
  "21907-1", // Carcinoembryonic Ag (CEA)
  "2857-1",  // Prostate specific Ag (PSA)

  // Genetic / pathology
  "55227-9", // Chromosomal microarray
  "82810-3", // KRAS gene mutation

  // Substance / toxicology
  "5334-5",  // Drug screen panel
  "3397-7",  // Alcohol level

  // Mental health
  "89204-2", // Psychiatric evaluation

  // Pregnancy
  "2106-3",  // Chorionic gonadotropin (hCG)
]);

/**
 * Returns the category for a given LOINC code.
 * Defaults to ROUTINE when the code is not in the sensitive list.
 */
export function categorizeByLoincCode(loincCode: string): LabCategory {
  return SENSITIVE_LOINC_CODES.has(loincCode) ? "SENSITIVE" : "ROUTINE";
}
