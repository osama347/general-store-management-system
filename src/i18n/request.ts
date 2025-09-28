import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { defaultLocale, locales } from "@/i18n/config";

export default getRequestConfig(async ({ locale }) => {
  const currentLocale = (locale ?? defaultLocale) as (typeof locales)[number];

  if (!locales.includes(currentLocale)) {
    notFound();
  }

  return {
    locale: currentLocale,
    messages: (await import(`@/i18n/messages/${currentLocale}.json`)).default,
  };
});
