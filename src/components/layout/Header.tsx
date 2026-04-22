import {LanguageSwitcher} from "@/app/[locale]/language-switcher";
import type {ReactNode} from "react";

type HeaderProps = {
  mobileMenuTrigger: ReactNode;
};

export function Header({mobileMenuTrigger}: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-3">
        {mobileMenuTrigger}
        <span className="text-lg font-semibold text-primary">MedBridge</span>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher className="hidden sm:block" />
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-sm"
          aria-label="View alerts"
        >
          View alerts
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-sm"
          aria-label="Open account menu"
        >
          Account menu
        </button>
      </div>
    </header>
  );
}
