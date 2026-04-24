"use client";

import {useTranslations} from "next-intl";
import {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/src/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/src/components/ui/card";
import {Input} from "@/src/components/ui/input";

type Specialty = {
  id: string;
  label: string;
};

type Physician = {
  id: string;
  name: string;
  specialtyId: string;
  photoUrl: string | null;
  rating: number;
};

type Slot = {
  id: string;
  physicianId: string;
  specialtyId: string;
  startsAt: string;
  endsAt: string;
};

type BookingStep = 1 | 2 | 3 | 4;

function StarRating({rating}: {rating: number}) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span aria-label={`Rating: ${rating} out of 5`} className="flex items-center gap-0.5 text-yellow-500">
      {Array.from({length: 5}, (_, i) => {
        if (i < full) return <span key={i}>★</span>;
        if (i === full && half) return <span key={i} className="opacity-60">★</span>;
        return <span key={i} className="opacity-20">★</span>;
      })}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </span>
  );
}

function formatTime(isoString: string) {
  try {
    return new Date(isoString).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
  } catch {
    return isoString;
  }
}

function formatDate(dateStr: string) {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function BookAppointmentPage() {
  const t = useTranslations("BookAppointmentPage");
  const router = useRouter();

  const [step, setStep] = useState<BookingStep>(1);

  // Step 1 state
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [isLoadingSpecialties, setIsLoadingSpecialties] = useState(true);

  // Step 2 state
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [selectedPhysicianId, setSelectedPhysicianId] = useState<string>("any");
  const [isLoadingPhysicians, setIsLoadingPhysicians] = useState(false);

  // Step 3 state
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, []);

  // Load specialties on mount
  useEffect(() => {
    async function fetchSpecialties() {
      try {
        const res = await fetch("/api/specialties");
        if (res.ok) {
          const data = (await res.json()) as {specialties: Specialty[]};
          setSpecialties(data.specialties);
        }
      } finally {
        setIsLoadingSpecialties(false);
      }
    }
    void fetchSpecialties();
  }, []);

  // Load physicians when specialty is selected
  useEffect(() => {
    if (!selectedSpecialty) return;
    const specialty = selectedSpecialty;

    async function fetchPhysicians() {
      setIsLoadingPhysicians(true);
      setPhysicians([]);
      setSelectedPhysicianId("any");
      try {
        const res = await fetch(`/api/physicians?specialty=${encodeURIComponent(specialty.id)}`);
        if (res.ok) {
          const data = (await res.json()) as {physicians: Physician[]};
          setPhysicians(data.physicians);
        }
      } finally {
        setIsLoadingPhysicians(false);
      }
    }
    void fetchPhysicians();
  }, [selectedSpecialty]);

  // Fetch slots when date changes (or physician selection changes)
  useEffect(() => {
    if (!selectedSpecialty || !selectedDate || step !== 3) return;

    const params = new URLSearchParams({specialty: selectedSpecialty.id, date: selectedDate});
    if (selectedPhysicianId !== "any") {
      params.set("physicianId", selectedPhysicianId);
    }

    async function fetchSlots() {
      setIsLoadingSlots(true);
      setSlots([]);
      setSlotsError(null);
      setSelectedSlot(null);
      try {
        const res = await fetch(`/api/appointments/slots?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as {slots: Slot[]};
          setSlots(data.slots);
        } else {
          setSlotsError(t("errors.slotsUnavailable"));
        }
      } catch {
        setSlotsError(t("errors.slotsUnavailable"));
      } finally {
        setIsLoadingSlots(false);
      }
    }
    void fetchSlots();
  }, [selectedDate, selectedPhysicianId, selectedSpecialty, step, t]);

  function handleSelectSpecialty(specialty: Specialty) {
    setSelectedSpecialty(specialty);
    setSpecialtySearch("");
    setStep(2);
  }

  function handleSelectPhysician(physicianId: string) {
    setSelectedPhysicianId(physicianId);
    setStep(3);
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep(4);
  }

  const filteredSpecialties = specialtySearch.trim()
    ? specialties.filter((s) => s.label.toLowerCase().includes(specialtySearch.toLowerCase()))
    : specialties;

  const selectedPhysician = physicians.find((p) => p.id === selectedPhysicianId) ?? null;

  const stepLabels: Record<BookingStep, string> = {
    1: t("steps.specialty"),
    2: t("steps.physician"),
    3: t("steps.datetime"),
    4: t("steps.confirm"),
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Step indicator */}
      <nav aria-label={t("stepIndicatorLabel")} className="flex items-center gap-2">
        {([1, 2, 3, 4] as BookingStep[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                s === step ? "bg-foreground text-background" : s < step ? "bg-green-600 text-white" : "border border-border text-muted-foreground",
              ].join(" ")}
              aria-current={s === step ? "step" : undefined}
            >
              {s < step ? "✓" : s}
            </div>
            <span className={["text-sm", s === step ? "font-medium" : "text-muted-foreground"].join(" ")}>
              {stepLabels[s]}
            </span>
            {s < 4 && <span className="text-border">›</span>}
          </div>
        ))}
      </nav>

      {/* Step 1: Specialty Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("steps.specialty")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="search"
              placeholder={t("specialtySearchPlaceholder")}
              value={specialtySearch}
              onChange={(e) => setSpecialtySearch(e.target.value)}
              aria-label={t("specialtySearchPlaceholder")}
            />
            {isLoadingSpecialties ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto rounded-md border border-border" role="listbox" aria-label={t("steps.specialty")}>
                {filteredSpecialties.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">{t("noResults")}</li>
                ) : (
                  filteredSpecialties.map((specialty) => (
                    <li key={specialty.id} role="option" aria-selected={selectedSpecialty?.id === specialty.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSpecialty(specialty)}
                        className="w-full px-3 py-2.5 text-left text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                      >
                        {specialty.label}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Physician Selection */}
      {step === 2 && selectedSpecialty && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("steps.physician")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("selectedSpecialtyLabel")}: <strong>{selectedSpecialty.label}</strong>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingPhysicians ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : (
              <ul className="space-y-2" role="listbox" aria-label={t("steps.physician")}>
                {/* Any available option */}
                <li role="option" aria-selected={selectedPhysicianId === "any"}>
                  <button
                    type="button"
                    onClick={() => handleSelectPhysician("any")}
                    className={[
                      "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                      selectedPhysicianId === "any" ? "border-foreground" : "border-border",
                    ].join(" ")}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xl">
                      🩺
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("anyAvailable")}</p>
                      <p className="text-xs text-muted-foreground">{t("anyAvailableDescription")}</p>
                    </div>
                  </button>
                </li>
                {physicians.map((physician) => (
                  <li key={physician.id} role="option" aria-selected={selectedPhysicianId === physician.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectPhysician(physician.id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                        selectedPhysicianId === physician.id ? "border-foreground" : "border-border",
                      ].join(" ")}
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-muted-foreground">
                        {physician.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={physician.photoUrl} alt={physician.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          physician.name.replace(/^Dr\.\s+/i, "").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{physician.name}</p>
                        <StarRating rating={physician.rating} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" className="border border-border bg-transparent text-foreground" onClick={() => setStep(1)}>
              {t("back")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Date & Time Slot Selection */}
      {step === 3 && selectedSpecialty && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("steps.datetime")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("selectedSpecialtyLabel")}: <strong>{selectedSpecialty.label}</strong>
              {selectedPhysicianId !== "any" && selectedPhysician ? (
                <> · <strong>{selectedPhysician.name}</strong></>
              ) : (
                <> · {t("anyAvailable")}</>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="booking-date">
                {t("dateLabel")}
              </label>
              <Input
                id="booking-date"
                type="date"
                min={today}
                max={maxDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {selectedDate && (
              <div>
                <p className="mb-2 text-sm font-medium">{t("timeSlotsLabel")}</p>
                {isLoadingSlots ? (
                  <p className="text-sm text-muted-foreground">{t("loadingSlots")}</p>
                ) : slotsError ? (
                  <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {slotsError}
                  </p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noSlots")}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="listbox" aria-label={t("timeSlotsLabel")}>
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        role="option"
                        aria-selected={selectedSlot?.id === slot.id}
                        onClick={() => handleSelectSlot(slot)}
                        className={[
                          "rounded-md border px-2 py-2 text-center text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                          selectedSlot?.id === slot.id ? "border-foreground bg-foreground text-background" : "border-border",
                        ].join(" ")}
                      >
                        {formatTime(slot.startsAt)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button type="button" className="border border-border bg-transparent text-foreground" onClick={() => setStep(2)}>
              {t("back")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && selectedSpecialty && selectedSlot && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t("steps.confirm")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("selectedSpecialtyLabel")}</dt>
                <dd className="font-medium">{selectedSpecialty.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("physicianLabel")}</dt>
                <dd className="font-medium">
                  {selectedPhysicianId !== "any" && selectedPhysician
                    ? selectedPhysician.name
                    : t("anyAvailable")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("dateLabel")}</dt>
                <dd className="font-medium">{formatDate(selectedDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("timeLabel")}</dt>
                <dd className="font-medium">
                  {formatTime(selectedSlot.startsAt)}–{formatTime(selectedSlot.endsAt)}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="border border-border bg-transparent text-foreground" onClick={() => setStep(3)}>
                {t("back")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({
                    slotId: selectedSlot.id,
                    physicianId: selectedPhysicianId !== "any" ? selectedPhysicianId : "",
                    physicianName: selectedPhysician?.name ?? "",
                    specialty: selectedSpecialty.label,
                    startsAt: selectedSlot.startsAt,
                    endsAt: selectedSlot.endsAt,
                  });
                  router.push(`/appointments/book/confirm?${params.toString()}`);
                }}
              >
                {t("confirmBooking")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
