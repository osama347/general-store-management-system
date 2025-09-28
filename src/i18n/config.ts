export const locales = ["en", "ps",'fa'] as const;

export const defaultLocale = "en" satisfies (typeof locales)[number];

export type Locale = (typeof locales)[number];

export const localePrefix = "always" as const;
