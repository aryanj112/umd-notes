'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  display_name: string | null
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isAuthRoute = pathname === '/auth'

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setDisplayName(null)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', user.id)
        .single()
        .returns<Profile>()

      if (profileError) {
        setDisplayName(null)
        return
      }

      setDisplayName(profile.display_name)
    }

    // Avoid running on auth page where we do not render navbar
    if (!isAuthRoute) {
      void fetchProfile()
    }
  }, [isAuthRoute])

  if (isAuthRoute) {
    return null
  }

  const handleLogout = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setLoading(false)
    router.push('/auth')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-white/6 bg-[#08090d]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            U
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[-0.03em] text-white">
              UMD Notes
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Shared study workspace
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {displayName && (
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-xs text-gray-200">
              {displayName}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-60"
          >
            {loading ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      </div>
    </nav>
  )
}
