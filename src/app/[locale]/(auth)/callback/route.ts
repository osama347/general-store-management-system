import { createClient } from "@/lib/supabase/server";
import { defaultLocale, locales } from "@/i18n/config";
import { NextResponse } from "next/server";

interface RouteParams {
  params: { locale: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const locale = locales.includes(params.locale as (typeof locales)[number])
    ? params.locale
    : defaultLocale;
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/")
    ? nextParam
    : `/${locale}/dashboard`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/auth?message=Could not authenticate user`);
}
