"use client";

import {LanguageSwitcher} from "@/app/[locale]/language-switcher";
import type {ReactNode} from "react";
import {useActiveProfile} from "@/src/components/family/ActiveProfileContext";
import {NotificationBell} from "@/src/components/notifications/NotificationBell";

type HeaderProps = {
  mobileMenuTrigger: ReactNode;
};

export function Header({mobileMenuTrigger}: HeaderProps) {
  const {activeProfileId, profiles, setActiveProfileId, isLoading} = useActiveProfile();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-3">
        {mobileMenuTrigger}
        <span className="text-lg font-semibold text-primary">MedBridge</span>
      </div>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 text-sm lg:flex">
          <span className="text-muted-foreground">Active profile</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            value={activeProfileId ?? ""}
            onChange={(event) => setActiveProfileId(event.target.value || null)}
            disabled={isLoading}
          >
            <option value="">My profile</option>
            {profiles.map((profile) => (
              <option key={profile.patientId} value={profile.patientId}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
        <LanguageSwitcher className="hidden sm:block" />
        <NotificationBell />
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-sm"
        >
          Account menu
        </button>
      </div>
    </header>
  );
}
