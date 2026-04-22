"use client";

import {useLocale} from "next-intl";
import {useTransition} from "react";
import {routing} from "@/i18n/routing";
import {usePathname, useRouter} from "@/i18n/navigation";

const baseButtonClassName =
  "h-10 px-4 text-sm font-semibold tracking-wide text-black dark:text-zinc-50";
const selectedButtonClassName =
  "bg-black text-white dark:bg-zinc-50 dark:text-black";
const localeLabels: Record<(typeof routing.locales)[number], string> = {
  en: "EN",
  uk: "UK",
};
const localeSwitchLabels: Record<(typeof routing.locales)[number], string> = {
  en: "Switch to English",
  uk: "Switch to Ukrainian",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <nav aria-label="Language switcher" className="w-full flex justify-end p-4">
      <div role="group" className="inline-flex rounded-full border border-black/[.08] dark:border-white/[.145]">
        {routing.locales.map((nextLocale) => {
          const isSelected = locale === nextLocale;
          const label = localeLabels[nextLocale];
          const switchLabel = isSelected ? `${label} selected` : localeSwitchLabels[nextLocale];
          const buttonClassName = [baseButtonClassName, isSelected ? selectedButtonClassName : null]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={nextLocale}
              type="button"
              aria-label={switchLabel}
              aria-pressed={isSelected}
              disabled={isPending}
              onClick={() => {
                if (isSelected) {
                  return;
                }

                startTransition(() => {
                  router.replace(pathname, {locale: nextLocale});
                });
              }}
              className={buttonClassName}
            >
              {isSelected && (
                <span aria-hidden="true" className="mr-1 inline-block h-2 w-2 rounded-full bg-current" />
              )}
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
