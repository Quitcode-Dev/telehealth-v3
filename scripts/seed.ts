import {resolve} from "node:path";
import {config as loadEnv} from "dotenv";
import {PrismaPg} from "@prisma/adapter-pg";
import {
  LabResultCategory,
  LabResultStatus,
  NotificationType,
  PrismaClient,
} from "@prisma/client";
import {createClient} from "@supabase/supabase-js";

loadEnv({path: resolve(process.cwd(), ".env.local")});
loadEnv();

let prisma: PrismaClient | null = null;
let demoPassword = "";
let supabase: ReturnType<typeof createClient> | null = null;

function initializeClients() {
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  demoPassword = process.env.DEMO_PASSWORD ?? "";

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set to run the seed script");
  }

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set to run the seed script");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be set to run the seed script");
  }

  if (!demoPassword) {
    throw new Error("DEMO_PASSWORD must be set to run the seed script");
  }

  prisma = new PrismaClient({
    adapter: new PrismaPg({connectionString: databaseUrl}),
  });

  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getPrismaClient() {
  if (!prisma) {
    throw new Error("Prisma seed client is not initialized");
  }

  return prisma;
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase seed client is not initialized");
  }

  return supabase;
}

const DEMO_SPECIALTIES = [
  "General Practice",
  "Cardiology",
  "Neurology",
  "Dermatology",
  "Gynecology",
] as const;

const DEMO_PHYSICIANS = [
  {name: "Dr. Roman Shevchuk", specialty: "General Practice"},
  {name: "Dr. Tetyana Kovalchuk", specialty: "Gynecology"},
  {name: "Dr. Serhiy Lysenko", specialty: "Neurology"},
] as const;

const DEMO_USERS = [
  {
    email: "demo.patient@medbridge.dev",
    label: "patient",
    fullName: "Oksana Kovalchuk",
  },
  {
    email: "demo.physician@medbridge.dev",
    label: "physician",
    fullName: "Dr. Roman Shevchuk",
  },
  {
    email: "demo.admin@medbridge.dev",
    label: "admin",
    fullName: "Iryna Hnatyuk",
  },
] as const;

const USERS = {
  oksana: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "demo.patient@medbridge.dev",
    firstName: "Oksana",
    lastName: "Kovalchuk",
    phoneNumber: "+380671110001",
    localePreference: "uk",
  },
  roman: {
    id: "11111111-1111-4111-8111-111111111112",
    email: "demo.physician@medbridge.dev",
    firstName: "Roman",
    lastName: "Shevchuk",
    phoneNumber: "+380671110002",
    localePreference: "uk",
  },
  iryna: {
    id: "11111111-1111-4111-8111-111111111113",
    email: "demo.admin@medbridge.dev",
    firstName: "Iryna",
    lastName: "Hnatyuk",
    phoneNumber: "+380671110003",
    localePreference: "uk",
  },
  marta: {
    id: "11111111-1111-4111-8111-111111111114",
    email: "marta.boyko@medbridge.dev",
    firstName: "Marta",
    lastName: "Boyko",
    phoneNumber: "+380671110004",
    localePreference: "uk",
  },
  ihor: {
    id: "11111111-1111-4111-8111-111111111115",
    email: "ihor.melnyk@medbridge.dev",
    firstName: "Ihor",
    lastName: "Melnyk",
    phoneNumber: "+380671110005",
    localePreference: "uk",
  },
  solomiia: {
    id: "11111111-1111-4111-8111-111111111116",
    email: "solomiia.hrytsenko@medbridge.dev",
    firstName: "Solomiia",
    lastName: "Hrytsenko",
    phoneNumber: "+380671110006",
    localePreference: "uk",
  },
  taras: {
    id: "11111111-1111-4111-8111-111111111117",
    email: "taras.petriv@medbridge.dev",
    firstName: "Taras",
    lastName: "Petriv",
    phoneNumber: "+380671110007",
    localePreference: "uk",
  },
} as const;

const PATIENTS = [
  {
    id: "22222222-2222-4222-8222-222222222221",
    userId: USERS.oksana.id,
    fullName: "Oksana Kovalchuk",
    dateOfBirth: "1992-04-18",
    phoneNumber: USERS.oksana.phoneNumber,
    address: "12 Heroiv UPA St, Lviv, Lviv Oblast, 79041",
    emergencyContactName: "Andriy Kovalchuk",
    emergencyContactPhone: "+380671220001",
    allergies: "Penicillin",
    currentMedications: "Vitamin D",
    prefersPushNotifications: true,
    prefersSmsNotifications: true,
    prefersViberNotifications: false,
    insuranceProviderName: "NHSU",
    policyNumber: "UA-LV-0001",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    userId: USERS.marta.id,
    fullName: "Marta Boyko",
    dateOfBirth: "1988-11-02",
    phoneNumber: USERS.marta.phoneNumber,
    address: "7 Shevchenka Ave, Drohobych, Lviv Oblast, 82100",
    emergencyContactName: "Petro Boyko",
    emergencyContactPhone: "+380671220002",
    allergies: "None reported",
    currentMedications: "Levothyroxine",
    prefersPushNotifications: true,
    prefersSmsNotifications: false,
    prefersViberNotifications: true,
    insuranceProviderName: "PZU Ukraine",
    policyNumber: "UA-LV-0002",
  },
  {
    id: "22222222-2222-4222-8222-222222222223",
    userId: USERS.ihor.id,
    fullName: "Ihor Melnyk",
    dateOfBirth: "1979-07-24",
    phoneNumber: USERS.ihor.phoneNumber,
    address: "4 Kalynova St, Stryi, Lviv Oblast, 82400",
    emergencyContactName: "Nataliia Melnyk",
    emergencyContactPhone: "+380671220003",
    allergies: "Ibuprofen",
    currentMedications: "Amlodipine",
    prefersPushNotifications: true,
    prefersSmsNotifications: true,
    prefersViberNotifications: false,
    insuranceProviderName: "Uniqa",
    policyNumber: "UA-LV-0003",
  },
  {
    id: "22222222-2222-4222-8222-222222222224",
    userId: USERS.solomiia.id,
    fullName: "Solomiia Hrytsenko",
    dateOfBirth: "2001-02-14",
    phoneNumber: USERS.solomiia.phoneNumber,
    address: "19 Shashkevycha St, Chervonohrad, Lviv Oblast, 80100",
    emergencyContactName: "Iryna Hrytsenko",
    emergencyContactPhone: "+380671220004",
    allergies: "Latex",
    currentMedications: "Topical corticosteroid",
    prefersPushNotifications: true,
    prefersSmsNotifications: false,
    prefersViberNotifications: true,
    insuranceProviderName: "NHSU",
    policyNumber: "UA-LV-0004",
  },
  {
    id: "22222222-2222-4222-8222-222222222225",
    userId: USERS.taras.id,
    fullName: "Taras Petriv",
    dateOfBirth: "1966-09-09",
    phoneNumber: USERS.taras.phoneNumber,
    address: "33 Hrushevskoho St, Sambir, Lviv Oblast, 81400",
    emergencyContactName: "Mariya Petriv",
    emergencyContactPhone: "+380671220005",
    allergies: "Aspirin",
    currentMedications: "Metformin",
    prefersPushNotifications: false,
    prefersSmsNotifications: true,
    prefersViberNotifications: false,
    insuranceProviderName: "Arsenal Insurance",
    policyNumber: "UA-LV-0005",
  },
] as const;

function dateFromTodayAt(daysFromToday: number, hour: number, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + daysFromToday);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function getReminderLeadText(appointmentDate: Date) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfAppointmentDay = new Date(appointmentDate);
  startOfAppointmentDay.setHours(0, 0, 0, 0);

  const dayDifference = Math.round(
    (startOfAppointmentDay.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (dayDifference <= 0) {
    return "today";
  }

  if (dayDifference === 1) {
    return "tomorrow";
  }

  return `in ${dayDifference} days`;
}

const APPOINTMENTS = [
  {
    id: "33333333-3333-4333-8333-333333333331",
    patientId: PATIENTS[0].id,
    scheduledAt: dateFromTodayAt(-10, 10, 30),
    status: "COMPLETED" as const,
    reasonForVisit: "Follow-up after annual wellness check",
    providerName: DEMO_PHYSICIANS[0].name,
    location: "Lviv Central Clinic, 21 Horodotska St",
    notes: JSON.stringify({slotId: "seed-roman-past-1", specialty: DEMO_PHYSICIANS[0].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-333333333332",
    patientId: PATIENTS[0].id,
    scheduledAt: dateFromTodayAt(-4, 9, 0),
    status: "COMPLETED" as const,
    reasonForVisit: "Discuss blood test results",
    providerName: DEMO_PHYSICIANS[2].name,
    location: "Lviv Neurology Center, 8 Zelena St",
    notes: JSON.stringify({slotId: "seed-serhiy-past-1", specialty: DEMO_PHYSICIANS[2].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    patientId: PATIENTS[0].id,
    scheduledAt: dateFromTodayAt(1, 11, 0),
    status: "SCHEDULED" as const,
    reasonForVisit: "Recurring headaches consultation",
    providerName: DEMO_PHYSICIANS[2].name,
    location: "Lviv Neurology Center, 8 Zelena St",
    notes: JSON.stringify({slotId: "seed-serhiy-upcoming-1", specialty: DEMO_PHYSICIANS[2].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-333333333334",
    patientId: PATIENTS[0].id,
    scheduledAt: dateFromTodayAt(5, 15, 0),
    status: "SCHEDULED" as const,
    reasonForVisit: "General practice check-in",
    providerName: DEMO_PHYSICIANS[0].name,
    location: "Lviv Central Clinic, 21 Horodotska St",
    notes: JSON.stringify({slotId: "seed-roman-upcoming-1", specialty: DEMO_PHYSICIANS[0].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-333333333335",
    patientId: PATIENTS[0].id,
    scheduledAt: dateFromTodayAt(3, 13, 30),
    status: "CANCELLED" as const,
    reasonForVisit: "Skin rash review",
    providerName: DEMO_PHYSICIANS[1].name,
    location: "Lviv Women’s Health Center, 5 Franka St",
    notes: JSON.stringify({slotId: "seed-tetyana-cancelled-1", specialty: DEMO_PHYSICIANS[1].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-333333333336",
    patientId: PATIENTS[1].id,
    scheduledAt: dateFromTodayAt(-12, 14, 0),
    status: "COMPLETED" as const,
    reasonForVisit: "Prenatal follow-up",
    providerName: DEMO_PHYSICIANS[1].name,
    location: "Lviv Women’s Health Center, 5 Franka St",
    notes: JSON.stringify({slotId: "seed-tetyana-past-2", specialty: DEMO_PHYSICIANS[1].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-333333333337",
    patientId: PATIENTS[1].id,
    scheduledAt: dateFromTodayAt(2, 9, 30),
    status: "SCHEDULED" as const,
    reasonForVisit: "Routine gynecology follow-up",
    providerName: DEMO_PHYSICIANS[1].name,
    location: "Lviv Women’s Health Center, 5 Franka St",
    notes: JSON.stringify({slotId: "seed-tetyana-upcoming-2", specialty: DEMO_PHYSICIANS[1].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-333333333338",
    patientId: PATIENTS[2].id,
    scheduledAt: dateFromTodayAt(-7, 16, 0),
    status: "COMPLETED" as const,
    reasonForVisit: "Blood pressure follow-up",
    providerName: DEMO_PHYSICIANS[0].name,
    location: "Lviv Central Clinic, 21 Horodotska St",
    notes: JSON.stringify({slotId: "seed-roman-past-3", specialty: DEMO_PHYSICIANS[0].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-333333333339",
    patientId: PATIENTS[3].id,
    scheduledAt: dateFromTodayAt(6, 10, 0),
    status: "SCHEDULED" as const,
    reasonForVisit: "Migraine management",
    providerName: DEMO_PHYSICIANS[2].name,
    location: "Lviv Neurology Center, 8 Zelena St",
    notes: JSON.stringify({slotId: "seed-serhiy-upcoming-3", specialty: DEMO_PHYSICIANS[2].specialty}),
  },
  {
    id: "33333333-3333-4333-8333-33333333333a",
    patientId: PATIENTS[4].id,
    scheduledAt: dateFromTodayAt(4, 12, 30),
    status: "CANCELLED" as const,
    reasonForVisit: "Medication review",
    providerName: DEMO_PHYSICIANS[0].name,
    location: "Lviv Central Clinic, 21 Horodotska St",
    notes: JSON.stringify({slotId: "seed-roman-cancelled-4", specialty: DEMO_PHYSICIANS[0].specialty}),
  },
] as const;

const LAB_RESULTS = [
  {
    id: "44444444-4444-4444-8444-444444444441",
    appointmentId: APPOINTMENTS[0].id,
    testName: "Complete blood count",
    resultValue: "WBC 13.2 ×10^9/L (high)",
    contextNote: "Elevated white blood cells suggest a mild infection. Repeat CBC in one week if symptoms continue.",
    status: LabResultStatus.RELEASED,
    category: LabResultCategory.ROUTINE,
    sourceSystem: "DILA",
    observedAt: dateFromTodayAt(-10, 8, 15),
    releasedAt: dateFromTodayAt(-9, 13, 0),
  },
  {
    id: "44444444-4444-4444-8444-444444444442",
    appointmentId: APPOINTMENTS[1].id,
    testName: "Lipid panel",
    resultValue: "LDL 3.6 mmol/L (borderline high)",
    contextNote: "Cholesterol is slightly above target. Continue diet changes and daily walks.",
    status: LabResultStatus.RELEASED,
    category: LabResultCategory.ROUTINE,
    sourceSystem: "Synevo",
    observedAt: dateFromTodayAt(-5, 7, 45),
    releasedAt: dateFromTodayAt(-4, 12, 30),
  },
  {
    id: "44444444-4444-4444-8444-444444444443",
    appointmentId: APPOINTMENTS[1].id,
    testName: "TSH",
    resultValue: "TSH 2.4 mIU/L",
    contextNote: "Thyroid function is within the expected range.",
    status: LabResultStatus.REVIEWED,
    category: LabResultCategory.ROUTINE,
    sourceSystem: "DILA",
    observedAt: dateFromTodayAt(-4, 8, 0),
    releasedAt: dateFromTodayAt(-3, 10, 0),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    appointmentId: APPOINTMENTS[3].id,
    testName: "Vitamin D",
    resultValue: null,
    contextNote: "Sample is in processing at the laboratory.",
    status: LabResultStatus.PENDING,
    category: LabResultCategory.ROUTINE,
    sourceSystem: "DILA",
    observedAt: dateFromTodayAt(-1, 9, 30),
    releasedAt: null,
  },
  {
    id: "44444444-4444-4444-8444-444444444445",
    appointmentId: APPOINTMENTS[3].id,
    testName: "MRI brain report",
    resultValue: null,
    contextNote: "Sensitive imaging findings are pending physician review before release.",
    status: LabResultStatus.PENDING_REVIEW,
    category: LabResultCategory.SENSITIVE,
    sourceSystem: "Lviv Regional Diagnostic Center",
    observedAt: dateFromTodayAt(-2, 14, 0),
    releasedAt: null,
  },
  {
    id: "44444444-4444-4444-8444-444444444446",
    appointmentId: APPOINTMENTS[3].id,
    testName: "Ferritin",
    resultValue: "Ferritin 42 ng/mL",
    contextNote: "Iron stores are stable. Continue your current supplement plan.",
    status: LabResultStatus.RELEASED,
    category: LabResultCategory.ROUTINE,
    sourceSystem: "Synevo",
    observedAt: dateFromTodayAt(-1, 7, 30),
    releasedAt: dateFromTodayAt(0, 9, 0),
  },
] as const;

const REMINDER_NOTIFICATIONS = [
  {
    id: "55555555-5555-4555-8555-555555555551",
    userId: USERS.oksana.id,
    resourceId: APPOINTMENTS[2].id,
    title: "Appointment reminder",
    content: `${DEMO_PHYSICIANS[2].name} ${getReminderLeadText(APPOINTMENTS[2].scheduledAt)} at ${APPOINTMENTS[2].scheduledAt.toLocaleTimeString("uk-UA", {hour: "2-digit", minute: "2-digit"})}`,
    link: "/appointments",
  },
  {
    id: "55555555-5555-4555-8555-555555555552",
    userId: USERS.oksana.id,
    resourceId: APPOINTMENTS[3].id,
    title: "Appointment reminder",
    content: `${DEMO_PHYSICIANS[0].name} ${getReminderLeadText(APPOINTMENTS[3].scheduledAt)} at ${APPOINTMENTS[3].scheduledAt.toLocaleTimeString("uk-UA", {hour: "2-digit", minute: "2-digit"})}`,
    link: "/appointments",
  },
  {
    id: "55555555-5555-4555-8555-555555555553",
    userId: USERS.marta.id,
    resourceId: APPOINTMENTS[6].id,
    title: "Appointment reminder",
    content: `${DEMO_PHYSICIANS[1].name} ${getReminderLeadText(APPOINTMENTS[6].scheduledAt)} at ${APPOINTMENTS[6].scheduledAt.toLocaleTimeString("uk-UA", {hour: "2-digit", minute: "2-digit"})}`,
    link: "/appointments",
  },
] as const;

const MESSAGE_THREAD = {
  id: "66666666-6666-4666-8666-666666666661",
  subject: "Preparation for your neurology follow-up",
  creatorId: USERS.roman.id,
  recipientId: USERS.oksana.id,
};

const MESSAGES = [
  {
    id: "77777777-7777-4777-8777-777777777771",
    threadId: MESSAGE_THREAD.id,
    senderId: USERS.roman.id,
    body: "Please bring your headache diary and any recent blood pressure readings to tomorrow’s visit.",
    readAt: null,
  },
  {
    id: "77777777-7777-4777-8777-777777777772",
    threadId: MESSAGE_THREAD.id,
    senderId: USERS.oksana.id,
    body: "Understood, I will upload the notes before the appointment.",
    readAt: dateFromTodayAt(-1, 18, 0),
  },
] as const;

async function findAuthUserByEmail(email: string) {
  const adminClient = getSupabaseClient();
  let page = 1;

  for (;;) {
    const {data, error} = await adminClient.auth.admin.listUsers({page, perPage: 200});

    if (error) {
      throw error;
    }

    const existingUser = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return existingUser;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function seedAuthUsers() {
  const adminClient = getSupabaseClient();

  for (const demoUser of DEMO_USERS) {
    const existingUser = await findAuthUserByEmail(demoUser.email);

    if (existingUser) {
      console.log(`✓ Found ${demoUser.label} auth user ${demoUser.email}`);
      continue;
    }

    const {error} = await adminClient.auth.admin.createUser({
      email: demoUser.email,
      password: demoPassword,
      // Supabase admin APIs expect snake_case field names here.
      email_confirm: true,
      user_metadata: {
        full_name: demoUser.fullName,
        role: demoUser.label,
      },
    });

    if (error) {
      throw error;
    }

    console.log(`✓ Created ${demoUser.label} auth user ${demoUser.email}`);
  }
}

async function seedUsers() {
  const prisma = getPrismaClient();

  for (const user of Object.values(USERS)) {
    await prisma.user.upsert({
      where: {email: user.email},
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        localePreference: user.localePreference,
      },
      create: user,
    });

    console.log(`✓ Upserted user ${user.firstName} ${user.lastName}`);
  }
}

async function seedPatients() {
  const prisma = getPrismaClient();

  for (const patient of PATIENTS) {
    await prisma.patient.upsert({
      where: {userId: patient.userId},
      update: {
        dateOfBirth: new Date(patient.dateOfBirth),
        phoneNumber: patient.phoneNumber,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        allergies: patient.allergies,
        currentMedications: patient.currentMedications,
        prefersPushNotifications: patient.prefersPushNotifications,
        prefersSmsNotifications: patient.prefersSmsNotifications,
        prefersViberNotifications: patient.prefersViberNotifications,
      },
      create: {
        id: patient.id,
        userId: patient.userId,
        dateOfBirth: new Date(patient.dateOfBirth),
        phoneNumber: patient.phoneNumber,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        allergies: patient.allergies,
        currentMedications: patient.currentMedications,
        prefersPushNotifications: patient.prefersPushNotifications,
        prefersSmsNotifications: patient.prefersSmsNotifications,
        prefersViberNotifications: patient.prefersViberNotifications,
      },
    });

    await prisma.insurancePolicy.upsert({
      where: {
        unique_patient_policy: {
          patientId: patient.id,
          providerName: patient.insuranceProviderName,
          policyNumber: patient.policyNumber,
        },
      },
      update: {
        isPrimary: true,
      },
      create: {
        patientId: patient.id,
        providerName: patient.insuranceProviderName,
        policyNumber: patient.policyNumber,
        isPrimary: true,
      },
    });

    console.log(`✓ Upserted patient ${patient.fullName} (${patient.address})`);
  }
}

async function seedAppointments() {
  const prisma = getPrismaClient();

  for (const appointment of APPOINTMENTS) {
    await prisma.appointment.upsert({
      where: {id: appointment.id},
      update: {
        patientId: appointment.patientId,
        scheduledAt: appointment.scheduledAt,
        status: appointment.status,
        reasonForVisit: appointment.reasonForVisit,
        providerName: appointment.providerName,
        location: appointment.location,
        notes: appointment.notes,
      },
      create: appointment,
    });
  }

  console.log(`✓ Upserted ${APPOINTMENTS.length} appointments`);
}

async function seedLabResults() {
  const prisma = getPrismaClient();

  for (const labResult of LAB_RESULTS) {
    await prisma.labResult.upsert({
      where: {id: labResult.id},
      update: {
        patientId: PATIENTS[0].id,
        appointmentId: labResult.appointmentId,
        testName: labResult.testName,
        resultValue: labResult.resultValue,
        contextNote: labResult.contextNote,
        status: labResult.status,
        category: labResult.category,
        sourceSystem: labResult.sourceSystem,
        observedAt: labResult.observedAt,
        releasedAt: labResult.releasedAt,
      },
      create: {
        id: labResult.id,
        patientId: PATIENTS[0].id,
        appointmentId: labResult.appointmentId,
        testName: labResult.testName,
        resultValue: labResult.resultValue,
        contextNote: labResult.contextNote,
        status: labResult.status,
        category: labResult.category,
        sourceSystem: labResult.sourceSystem,
        observedAt: labResult.observedAt,
        releasedAt: labResult.releasedAt,
      },
    });
  }

  console.log(`✓ Upserted ${LAB_RESULTS.length} lab results for ${PATIENTS[0].fullName}`);
}

async function seedReminderNotifications() {
  const prisma = getPrismaClient();

  for (const notification of REMINDER_NOTIFICATIONS) {
    await prisma.notification.upsert({
      where: {id: notification.id},
      update: {
        userId: notification.userId,
        type: NotificationType.REMINDER,
        title: notification.title,
        content: notification.content,
        link: notification.link,
        resourceId: notification.resourceId,
      },
      create: {
        ...notification,
        type: NotificationType.REMINDER,
      },
    });
  }

  console.log(`✓ Upserted ${REMINDER_NOTIFICATIONS.length} reminder notifications`);
}

async function seedMessages() {
  const prisma = getPrismaClient();

  await prisma.messageThread.upsert({
    where: {id: MESSAGE_THREAD.id},
    update: {
      subject: MESSAGE_THREAD.subject,
      creatorId: MESSAGE_THREAD.creatorId,
      recipientId: MESSAGE_THREAD.recipientId,
    },
    create: MESSAGE_THREAD,
  });

  for (const message of MESSAGES) {
    await prisma.message.upsert({
      where: {id: message.id},
      update: {
        threadId: message.threadId,
        senderId: message.senderId,
        body: message.body,
        readAt: message.readAt,
      },
      create: message,
    });
  }

  console.log("✓ Upserted demo care-team message thread");
}

async function main() {
  initializeClients();

  console.log(`✓ Loaded ${DEMO_SPECIALTIES.length} demo specialties`);
  console.log("✓ Loaded 3 physicians with Mon–Fri 09:00–17:00 demo availability");

  await seedAuthUsers();
  await seedUsers();
  await seedPatients();
  await seedAppointments();
  await seedLabResults();
  await seedReminderNotifications();
  await seedMessages();

  console.log("✓ Seed completed successfully");
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
