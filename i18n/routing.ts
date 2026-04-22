import {defineRouting} from "next-intl/routing";

// 365 days * 24 hours * 60 minutes * 60 seconds
const LOCALE_COOKIE_MAX_AGE_SECONDS = 31_536_000;

export const routing = defineRouting({
  locales: ["en", "uk"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
  },
});
