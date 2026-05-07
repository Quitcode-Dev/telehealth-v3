export type DemoRole = "patient" | "physician" | "admin";

export type DemoLoginOption = {
  role: DemoRole;
  label: string;
  displayName: string;
  email: string;
  redirectPath: string;
};

type DemoPersona = DemoLoginOption & {
  locale: string;
  password: string;
};

const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const DEMO_PERSONAS: Record<DemoRole, Omit<DemoPersona, "redirectPath"> & {basePath: string}> = {
  patient: {
    role: "patient",
    label: "Patient",
    displayName: "Oksana Kovalchuk",
    email: process.env.DEMO_PATIENT_EMAIL ?? "demo.patient@medbridge.dev",
    password: process.env.DEMO_PATIENT_PASSWORD ?? "demo-patient",
    locale: "uk",
    basePath: "/dashboard",
  },
  physician: {
    role: "physician",
    label: "Physician",
    displayName: "Dr. Shevchuk",
    email: process.env.DEMO_PHYSICIAN_EMAIL ?? "demo.physician@medbridge.dev",
    password: process.env.DEMO_PHYSICIAN_PASSWORD ?? "demo-physician",
    locale: "en",
    basePath: "/physician",
  },
  admin: {
    role: "admin",
    label: "Admin",
    displayName: "Admin",
    email: process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@medbridge.dev",
    password: process.env.DEMO_ADMIN_PASSWORD ?? "demo-admin",
    locale: "en",
    basePath: "/admin",
  },
};

function getRedirectPath(locale: string | undefined, route: string) {
  return locale ? `/${locale}${route}` : route;
}

export function isDemoModeEnabled() {
  return DEMO_MODE_ENABLED;
}

export function isDemoRole(value: string): value is DemoRole {
  return value in DEMO_PERSONAS;
}

export function getDemoPersona(role: DemoRole, locale?: string): DemoPersona | null {
  if (!DEMO_MODE_ENABLED) {
    return null;
  }

  const persona = DEMO_PERSONAS[role];

  return {
    ...persona,
    redirectPath: getRedirectPath(locale, persona.basePath),
  };
}

export function getDemoLoginOptions(locale: string): DemoLoginOption[] {
  if (!DEMO_MODE_ENABLED) {
    return [];
  }

  return (Object.keys(DEMO_PERSONAS) as DemoRole[]).map((role) => {
    const persona = getDemoPersona(role, locale)!;

    return {
      role: persona.role,
      label: persona.label,
      displayName: persona.displayName,
      email: persona.email,
      redirectPath: persona.redirectPath,
    };
  });
}
