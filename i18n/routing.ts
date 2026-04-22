import {defineRouting} from "next-intl/routing";

const LOCALE_COOKIE_MAX_AGE = 31_536_000;

export const routing = defineRouting({
  locales: ["en", "uk"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  },
});
