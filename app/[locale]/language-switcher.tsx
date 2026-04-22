"use client";

import {useLocale} from "next-intl";
import {useTransition} from "react";
import {routing} from "@/i18n/routing";
import {usePathname, useRouter} from "@/i18n/navigation";

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
          const label = nextLocale === "uk" ? "UK" : "EN";
          const switchLabel = nextLocale === "uk" ? "Switch to Ukrainian" : "Switch to English";

          return (
            <button
              key={nextLocale}
              type="button"
              aria-label={switchLabel}
              aria-pressed={isSelected}
              disabled={isPending || isSelected}
              onClick={() => {
                startTransition(() => {
                  router.replace(pathname, {locale: nextLocale});
                });
              }}
              className="h-10 px-4 text-sm font-semibold tracking-wide text-black disabled:opacity-100 disabled:bg-black disabled:text-white dark:text-zinc-50 dark:disabled:bg-zinc-50 dark:disabled:text-black"
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
