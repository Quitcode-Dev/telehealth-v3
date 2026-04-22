import {defineRouting} from "next-intl/routing";

const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;

export const routing = defineRouting({
  locales: ["en", "uk"],
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: SECONDS_IN_YEAR,
    sameSite: "lax",
  },
});
