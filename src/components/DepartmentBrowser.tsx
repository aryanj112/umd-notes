'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Department = {
  id: string
  code: string
  name: string
}

type FavoriteRow = {
  department_id: string
}

type Props = {
  departments: Department[]
}

export default function DepartmentBrowser({ departments }: Props) {
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [favoritesError, setFavoritesError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadUserAndFavorites = async () => {
      setLoadingFavorites(true)
      setFavoritesError(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setUserId(null)
        setFavoriteIds(new Set())
        setLoadingFavorites(false)
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from('favorite_departments')
        .select('department_id')
        .eq('user_id', user.id)
        .returns<FavoriteRow[]>()

      if (error) {
        setFavoritesError(error.message)
        setFavoriteIds(new Set())
      } else {
        setFavoriteIds(new Set((data ?? []).map((row) => row.department_id)))
      }

      setLoadingFavorites(false)
    }

    void loadUserAndFavorites()
  }, [supabase])

  const handleToggleFavorite = async (departmentId: string) => {
    if (!userId) {
      return
    }

    const isFavorite = favoriteIds.has(departmentId)

    if (isFavorite) {
      const { error } = await supabase
        .from('favorite_departments')
        .delete()
        .eq('user_id', userId)
        .eq('department_id', departmentId)

      if (!error) {
        setFavoriteIds((current) => {
          const next = new Set(current)
          next.delete(departmentId)
          return next
        })
      }
      return
    }

    const { error } = await supabase.from('favorite_departments').insert({
      user_id: userId,
      department_id: departmentId,
    })

    if (!error) {
      setFavoriteIds((current) => new Set(current).add(departmentId))
    }
  }

  const { favorites, others } = useMemo(() => {
    const query = search.trim().toLowerCase()

    const validDepartments = departments.filter(
      (dept) => typeof dept.code === 'string' && dept.code.trim().length > 0,
    )

    const filtered = validDepartments.filter((dept) => {
      if (!query) return true
      return (
        dept.code.toLowerCase().includes(query) ||
        dept.name.toLowerCase().includes(query)
      )
    })

    const favs = filtered
      .filter((dept) => favoriteIds.has(dept.id))
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))

    const rest = filtered
      .filter((dept) => !favoriteIds.has(dept.id))
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))

    return { favorites: favs, others: rest }
  }, [departments, favoriteIds, search])

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Departments
          </h2>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">
            Your STEM home base
          </h3>
          <div className="mt-2 h-[2px] w-10 rounded-full bg-red-600" />
          {loadingFavorites ? (
            <p className="mt-2 text-xs text-gray-500">
              Loading your favorites…
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Favorite departments you care about, then dive into courses and
              notes.
            </p>
          )}
          {favoritesError && (
            <p className="mt-2 text-xs text-red-400">
              Error loading favorites: {favoritesError}
            </p>
          )}
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code or name…"
            className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-gray-500 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-200">
              Your favorites
            </h4>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {favorites.map((dept) => {
              const isFavorite = favoriteIds.has(dept.id)

              return (
                <div
                  key={dept.id}
                  className="group flex min-w-[220px] flex-col justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-red-500/70 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/${encodeURIComponent(dept.code)}`}
                      className="flex-1"
                    >
                      <p className="text-sm font-semibold tracking-tight text-white">
                        {dept.code}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                        {dept.name}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleToggleFavorite(dept.id)}
                      className={`ml-1 rounded-full border px-2 py-1 text-xs transition ${
                        isFavorite
                          ? 'border-red-500 bg-red-600/20 text-red-400'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-red-500 hover:text-red-400'
                      }`}
                      aria-label={
                        isFavorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                    >
                      {isFavorite ? '♥' : '♡'}
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] text-gray-400">
                    View courses →
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-200">
            All departments
          </h4>
          <p className="text-xs text-gray-500">
            {departments.length} total
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {others.map((dept) => {
            const isFavorite = favoriteIds.has(dept.id)

            return (
              <div
                key={dept.id}
                className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-red-500/70 hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/${encodeURIComponent(dept.code)}`}
                    className="flex-1"
                  >
                    <p className="text-sm font-semibold tracking-tight text-white">
                      {dept.code}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                      {dept.name}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleToggleFavorite(dept.id)}
                    className={`ml-1 rounded-full border px-2 py-1 text-xs transition ${
                      isFavorite
                        ? 'border-red-500 bg-red-600/20 text-red-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-red-500 hover:text-red-400'
                    }`}
                    aria-label={
                      isFavorite
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                  >
                    {isFavorite ? '♥' : '♡'}
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                  View courses →
                </p>
              </div>
            )
          })}

          {favorites.length === 0 && others.length === 0 && (
            <p className="col-span-full text-sm text-gray-400">
              No departments match your search.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

