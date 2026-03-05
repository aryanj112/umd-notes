'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup' | 'reset'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else window.location.href = '/'
    }

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: username,
          umd_email: email,
        })
        setMessage('Account created! You can now log in.')
        setMode('login')
      }
    }

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) setError(error.message)
      else setMessage('Password reset email sent — check your inbox.')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="app-panel rounded-[2rem] px-7 py-8 md:px-10 md:py-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#8da9ff]">
            Shared study system
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            Notes, sections, and course pages in one clean workspace.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-gray-400">
            Upload raw class notes, convert them into polished study pages with
            AI, and keep the best material attached to the exact UMD course and
            section it belongs to.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
                Browse
              </p>
              <p className="mt-3 text-sm font-medium text-white">
                Department → Course → Section
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
                Convert
              </p>
              <p className="mt-3 text-sm font-medium text-white">
                File uploads become HTML study pages
              </p>
            </div>
            <div className="rounded-2xl border border-[#5f8cff]/20 bg-[#5f8cff]/8 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a9bfff]">
                Reuse
              </p>
              <p className="mt-3 text-sm font-medium text-white">
                Shareable pages for classmates
              </p>
            </div>
          </div>
        </section>

        <div className="w-full">
          <div className="mb-5 px-1">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
              Sign in to continue
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Use your UMD email and keep your notes tied to your profile.
            </p>
          </div>

          <div className="app-panel-strong rounded-[2rem] p-8">
            <div className="mb-6 flex gap-1 rounded-2xl border border-white/8 bg-black/20 p-1">
              {(['login', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); setMessage('') }}
                  className={`flex-1 rounded-[0.9rem] py-2.5 text-sm font-medium ${mode === m
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    placeholder="terrapin123"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#5f8cff]/70"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-gray-400">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@umd.edu"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#5f8cff]/70"
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <label className="mb-1.5 block text-sm text-gray-400">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-[#5f8cff]/70"
                  />
                </div>
              )}

              {error && (
                <p className="rounded-2xl border border-red-800/70 bg-red-950/60 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              )}

              {message && (
                <p className="rounded-2xl border border-emerald-800/70 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? 'Loading...' : mode === 'login' ? 'Log In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
              </button>
            </form>

            {mode === 'login' && (
              <button
                onClick={() => { setMode('reset'); setError(''); setMessage('') }}
                className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-300"
              >
                Forgot password?
              </button>
            )}

            {mode === 'reset' && (
              <button
                onClick={() => { setMode('login'); setError(''); setMessage('') }}
                className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-300"
              >
                ← Back to login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
