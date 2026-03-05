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
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-white">
            <span className="mr-1 inline-flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_14px_rgba(248,113,113,0.9)]" />
            UMD Notes
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {displayName && (
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-200">
              {displayName}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="rounded-full border border-red-500/70 bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-60"
          >
            {loading ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      </div>
    </nav>
  )
}

