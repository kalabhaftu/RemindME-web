'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.')
      return
    }
    setLoading(true)
    setErrorMsg('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
    } else {
      setErrorMsg('Account created! Please check your email to verify your account before signing in.')
    }
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#050609] text-white">
      {/* Animated blue/black background blobs (No purple) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#1e3a8a] to-[#3b82f6] opacity-[0.12] mix-blend-screen filter blur-[90px]"
          style={{
            top: '10%',
            left: '10%',
            animation: 'login-float-1 30s infinite alternate ease-in-out'
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#0f172a] to-[#0ea5e9] opacity-[0.08] mix-blend-screen filter blur-[100px]"
          style={{
            bottom: '10%',
            right: '10%',
            animation: 'login-float-2 35s infinite alternate ease-in-out'
          }}
        />
      </div>

      {/* Floating Island Login Card with Backing Refraction */}
      <div className="w-full max-w-md relative rounded-[32px] overflow-hidden">
        {/* Backing Refractor */}
        <div 
          className="absolute inset-0 bg-[rgba(10,12,20,0.55)] border border-[rgba(255,255,255,0.06)] rounded-[32px] backdrop-blur-[24px] z-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
          style={{
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.12), 0 20px 50px rgba(0,0,0,0.3)',
            filter: `url(#liquid-glass-refraction)`
          }}
        />
        {/* Interactive Sharp Content on Top */}
        <div className="relative z-10 p-8 md:p-10 w-full">
          <h1 className="text-3xl mb-8 text-center font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            RemindME
          </h1>
          
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-[rgba(239,68,68,0.15)] border border-red-500/30 text-red-300 text-xs font-semibold leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] focus:border-[#3B82F6] focus:bg-[rgba(255,255,255,0.06)] focus:outline-none transition-all text-sm text-white font-medium placeholder-[rgba(255,255,255,0.3)]"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] focus:border-[#3B82F6] focus:bg-[rgba(255,255,255,0.06)] focus:outline-none transition-all text-sm text-white font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-full bg-[#3B82F6] hover:bg-[#5B9CFF] text-white font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(59,130,246,0.3)] border-t border-[rgba(255,255,255,0.25)] active:scale-95 cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={handleSignUp}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-text-primary font-semibold text-xs uppercase tracking-wider hover:bg-[rgba(255,255,255,0.08)] transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <hr className="w-full border-[rgba(255,255,255,0.06)]" />
            <span className="px-3 text-text-tertiary text-xs font-semibold uppercase tracking-wider">or</span>
            <hr className="w-full border-[rgba(255,255,255,0.06)]" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full mt-6 py-3 px-4 flex items-center justify-center gap-2.5 rounded-full bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-gray-100 transition-all active:scale-[0.98] cursor-pointer shadow-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" style={{ display: 'block' }}>
              <path
                fill="#4285F4"
                style={{ fill: '#4285F4' }}
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                style={{ fill: '#34A853' }}
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                style={{ fill: '#FBBC05' }}
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                style={{ fill: '#EA4335' }}
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes login-float-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes login-float-2 {
          0% { transform: translate(0px, 0px) scale(1.05); }
          100% { transform: translate(-40px, -50px) scale(0.95); }
        }
      `}</style>
    </div>
  )
}
