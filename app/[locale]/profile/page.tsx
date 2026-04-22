"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useEffect, useMemo, useState} from "react";
import {useForm, useWatch} from "react-hook-form";
import {z} from "zod";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Form} from "@/src/components/ui/form";
import {Input} from "@/src/components/ui/input";

const profileSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().optional().refine((value) => !value || z.email().safeParse(value).success, "Invalid email"),
  dateOfBirth: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  phoneNumber: z.string().trim().min(1),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  insuranceProviderName: z.string().trim().optional(),
  insurancePolicyNumber: z.string().trim().optional(),
  insuranceGroupNumber: z.string().trim().optional(),
  allergies: z.string().trim().optional(),
  currentMedications: z.string().trim().optional(),
  prefersPushNotifications: z.boolean(),
  prefersSmsNotifications: z.boolean(),
  prefersViberNotifications: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileResponse = {
  demographics: {
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth: string | null;
    gender: string | null;
    phoneNumber: string | null;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  insurance: {
    providerName: string;
    policyNumber: string;
    groupNumber: string;
  };
  medicalSummary: {
    allergies: string;
    currentMedications: string;
  };
  communicationPreferences: {
    push: boolean;
    sms: boolean;
    viber: boolean;
  };
};

type EditableSection = "contact" | "insurance" | "medical" | "communication";

const SECTION_FIELDS: Record<EditableSection, Array<keyof ProfileFormValues>> = {
  contact: ["firstName", "lastName", "email", "phoneNumber", "emergencyContactName", "emergencyContactPhone"],
  insurance: ["insuranceProviderName", "insurancePolicyNumber", "insuranceGroupNumber"],
  medical: ["allergies", "currentMedications"],
  communication: ["prefersPushNotifications", "prefersSmsNotifications", "prefersViberNotifications"],
};

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("error" in error)) {
    return null;
  }

  const message = (error as {error?: unknown}).error;
  return typeof message === "string" ? message : null;
}

export default function ProfilePage() {
  const t = useTranslations("ProfilePage");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSection, setIsSavingSection] = useState<EditableSection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingSections, setEditingSections] = useState<Record<EditableSection, boolean>>({
    contact: false,
    insurance: false,
    medical: false,
    communication: false,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      gender: "",
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      insuranceProviderName: "",
      insurancePolicyNumber: "",
      insuranceGroupNumber: "",
      allergies: "",
      currentMedications: "",
      prefersPushNotifications: true,
      prefersSmsNotifications: false,
      prefersViberNotifications: false,
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      const response = await fetch("/api/patients/me");

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const apiMessage = getErrorMessage(payload);
        setErrorMessage(apiMessage ?? t("errors.loadFailed"));
        setIsLoading(false);
        return;
      }

      const payload = (await response.json()) as ProfileResponse;
      form.reset({
        firstName: payload.demographics.firstName,
        lastName: payload.demographics.lastName,
        email: payload.demographics.email ?? "",
        dateOfBirth: payload.demographics.dateOfBirth ?? "",
        gender: payload.demographics.gender ?? "",
        phoneNumber: payload.demographics.phoneNumber ?? "",
        emergencyContactName: payload.demographics.emergencyContactName ?? "",
        emergencyContactPhone: payload.demographics.emergencyContactPhone ?? "",
        insuranceProviderName: payload.insurance.providerName ?? "",
        insurancePolicyNumber: payload.insurance.policyNumber ?? "",
        insuranceGroupNumber: payload.insurance.groupNumber ?? "",
        allergies: payload.medicalSummary.allergies ?? "",
        currentMedications: payload.medicalSummary.currentMedications ?? "",
        prefersPushNotifications: payload.communicationPreferences.push,
        prefersSmsNotifications: payload.communicationPreferences.sms,
        prefersViberNotifications: payload.communicationPreferences.viber,
      });
      setIsLoading(false);
    }

    void fetchProfile();
  }, [form, t]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  async function saveSection(section: EditableSection) {
    setErrorMessage(null);
    const fields = SECTION_FIELDS[section];
    const isValid = await form.trigger(fields);

    if (!isValid) {
      return;
    }

    const values = form.getValues();
    const payload = Object.fromEntries(fields.map((field) => [field, values[field]]));
    setIsSavingSection(section);

    const response = await fetch("/api/patients/me", {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    });

    setIsSavingSection(null);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const apiMessage = getErrorMessage(body);
      setErrorMessage(apiMessage ?? t("errors.saveFailed"));
      return;
    }

    const updated = (await response.json()) as ProfileResponse;
    form.reset(
      {
        firstName: updated.demographics.firstName,
        lastName: updated.demographics.lastName,
        email: updated.demographics.email ?? "",
        dateOfBirth: updated.demographics.dateOfBirth ?? "",
        gender: updated.demographics.gender ?? "",
        phoneNumber: updated.demographics.phoneNumber ?? "",
        emergencyContactName: updated.demographics.emergencyContactName ?? "",
        emergencyContactPhone: updated.demographics.emergencyContactPhone ?? "",
        insuranceProviderName: updated.insurance.providerName ?? "",
        insurancePolicyNumber: updated.insurance.policyNumber ?? "",
        insuranceGroupNumber: updated.insurance.groupNumber ?? "",
        allergies: updated.medicalSummary.allergies ?? "",
        currentMedications: updated.medicalSummary.currentMedications ?? "",
        prefersPushNotifications: updated.communicationPreferences.push,
        prefersSmsNotifications: updated.communicationPreferences.sms,
        prefersViberNotifications: updated.communicationPreferences.viber,
      },
      {keepDirty: false},
    );
    setEditingSections((previous) => ({...previous, [section]: false}));
    setToastMessage(t("saveSuccess"));
  }

  const firstName = useWatch({control: form.control, name: "firstName"});
  const lastName = useWatch({control: form.control, name: "lastName"});
  const email = useWatch({control: form.control, name: "email"});
  const dateOfBirth = useWatch({control: form.control, name: "dateOfBirth"});
  const gender = useWatch({control: form.control, name: "gender"});
  const fullName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);

  if (isLoading) {
    return <p>{t("loading")}</p>;
  }

  return (
    <Form {...form}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {toastMessage ? (
          <div className="fixed right-4 top-4 z-50 rounded-md bg-green-600 px-4 py-2 text-sm text-white shadow-md">{toastMessage}</div>
        ) : null}

        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>

        {errorMessage ? (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t("sections.demographics.title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <strong>{t("fields.fullName")}:</strong> {fullName || "-"}
            </p>
            <p>
              <strong>{t("fields.email")}:</strong> {email || "-"}
            </p>
            <p>
              <strong>{t("fields.dateOfBirth")}:</strong> {dateOfBirth || "-"}
            </p>
            <p>
              <strong>{t("fields.gender")}:</strong> {gender || "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("sections.contact.title")}</CardTitle>
            <Button type="button" className="border border-border bg-transparent text-foreground" onClick={() => setEditingSections((prev) => ({...prev, contact: !prev.contact}))}>
              {editingSections.contact ? t("actions.cancel") : t("actions.edit")}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input placeholder={t("fields.firstName")} disabled={!editingSections.contact || isSavingSection === "contact"} {...form.register("firstName")} />
            <Input placeholder={t("fields.lastName")} disabled={!editingSections.contact || isSavingSection === "contact"} {...form.register("lastName")} />
            <Input placeholder={t("fields.email")} disabled={!editingSections.contact || isSavingSection === "contact"} {...form.register("email")} />
            <Input placeholder={t("fields.phoneNumber")} disabled={!editingSections.contact || isSavingSection === "contact"} {...form.register("phoneNumber")} />
            <Input
              placeholder={t("fields.emergencyContactName")}
              disabled={!editingSections.contact || isSavingSection === "contact"}
              {...form.register("emergencyContactName")}
            />
            <Input
              placeholder={t("fields.emergencyContactPhone")}
              disabled={!editingSections.contact || isSavingSection === "contact"}
              {...form.register("emergencyContactPhone")}
            />
            {editingSections.contact ? (
              <Button type="button" onClick={() => void saveSection("contact")} disabled={isSavingSection === "contact"} className="sm:col-span-2">
                {isSavingSection === "contact" ? t("actions.saving") : t("actions.save")}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("sections.insurance.title")}</CardTitle>
            <Button type="button" className="border border-border bg-transparent text-foreground" onClick={() => setEditingSections((prev) => ({...prev, insurance: !prev.insurance}))}>
              {editingSections.insurance ? t("actions.cancel") : t("actions.edit")}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder={t("fields.insuranceProviderName")}
              disabled={!editingSections.insurance || isSavingSection === "insurance"}
              {...form.register("insuranceProviderName")}
            />
            <Input
              placeholder={t("fields.insurancePolicyNumber")}
              disabled={!editingSections.insurance || isSavingSection === "insurance"}
              {...form.register("insurancePolicyNumber")}
            />
            <Input
              placeholder={t("fields.insuranceGroupNumber")}
              disabled={!editingSections.insurance || isSavingSection === "insurance"}
              {...form.register("insuranceGroupNumber")}
            />
            {editingSections.insurance ? (
              <Button type="button" onClick={() => void saveSection("insurance")} disabled={isSavingSection === "insurance"} className="sm:col-span-2">
                {isSavingSection === "insurance" ? t("actions.saving") : t("actions.save")}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("sections.medical.title")}</CardTitle>
            <Button type="button" className="border border-border bg-transparent text-foreground" onClick={() => setEditingSections((prev) => ({...prev, medical: !prev.medical}))}>
              {editingSections.medical ? t("actions.cancel") : t("actions.edit")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder={t("fields.allergies")}
              disabled={!editingSections.medical || isSavingSection === "medical"}
              {...form.register("allergies")}
            />
            <textarea
              className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder={t("fields.currentMedications")}
              disabled={!editingSections.medical || isSavingSection === "medical"}
              {...form.register("currentMedications")}
            />
            {editingSections.medical ? (
              <Button type="button" onClick={() => void saveSection("medical")} disabled={isSavingSection === "medical"}>
                {isSavingSection === "medical" ? t("actions.saving") : t("actions.save")}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("sections.communication.title")}</CardTitle>
            <Button type="button" className="border border-border bg-transparent text-foreground" onClick={() => setEditingSections((prev) => ({...prev, communication: !prev.communication}))}>
              {editingSections.communication ? t("actions.cancel") : t("actions.edit")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={!editingSections.communication || isSavingSection === "communication"} {...form.register("prefersPushNotifications")} />
              {t("fields.prefersPushNotifications")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={!editingSections.communication || isSavingSection === "communication"} {...form.register("prefersSmsNotifications")} />
              {t("fields.prefersSmsNotifications")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={!editingSections.communication || isSavingSection === "communication"} {...form.register("prefersViberNotifications")} />
              {t("fields.prefersViberNotifications")}
            </label>
            {editingSections.communication ? (
              <Button type="button" onClick={() => void saveSection("communication")} disabled={isSavingSection === "communication"}>
                {isSavingSection === "communication" ? t("actions.saving") : t("actions.save")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}
