import { locales } from "@/i18n/config";
import { redirect } from "next/navigation";

interface LocalePageProps {
  params: { locale: string };
}

export default function LocaleIndexPage({ params }: LocalePageProps) {
  const { locale } = params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    return redirect("/");
  }

  return redirect(`/${locale}/dashboard`);
}
