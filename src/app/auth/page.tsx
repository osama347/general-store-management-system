import { AuthForm } from '@/components/auth/auth-form'
import { getSession } from '@/lib/auth/auth-redirect'
import { redirect } from 'next/navigation'


export default async function AuthPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-6">
        <AuthForm />
      </div>
    </div>
  )
}

