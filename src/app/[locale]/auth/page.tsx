import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth/auth-redirect";
import { locales } from "@/i18n/config";
import { redirect } from "next/navigation";

interface AuthPageProps {
  params: { locale: string };
}

export default async function LocaleAuthPage({ params }: AuthPageProps) {
  const { locale } = params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    redirect("/");
  }

  const session = await getSession();

  if (session?.user) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-6">
        <AuthForm />
      </div>
    </div>
  );
}
