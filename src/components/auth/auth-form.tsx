'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

type AuthMode = 'sign-in' | 'forgot-password'

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()
  const locale = useLocale()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
        
        // Show success message
        toast.success('Successfully signed in!')

        // Wait a moment for auth state to propagate
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Use Next.js router for proper navigation without full page reload
        // This ensures the auth state is properly maintained
        router.push(`/${locale}/dashboard`)
        router.refresh() // Refresh to ensure server components get new session
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/${locale}/reset-password`,
        })
        
        if (error) throw error
        toast.success('Check your email for the password reset link!')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    return mode === 'forgot-password' ? 'Reset Password' : 'Welcome Back'
  }

  const getDescription = () => {
    return mode === 'forgot-password' 
      ? 'Enter your email to reset your password' 
      : 'Sign in to your account to continue'
  }

  return (
    <Card className="w-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
        <CardDescription className="text-slate-600">
          {getDescription()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {mode === 'sign-in' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Don't have an account? Contact your administrator to receive an invitation.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {mode !== 'forgot-password' && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'forgot-password' ? 'Send Reset Link' : 'Sign In'}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {mode === 'sign-in' && (
          <button
            type="button"
            onClick={() => setMode('forgot-password')}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            Forgot your password?
          </button>
        )}

        {mode === 'forgot-password' && (
          <div className="text-sm text-slate-600">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className="text-slate-900 hover:underline font-medium"
            >
              Sign in
            </button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
