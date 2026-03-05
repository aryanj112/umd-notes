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
      <div className="app-panel rounded-[1.75rem] p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gray-500">
              Departments
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              Find the right academic lane fast.
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Search by code or name, pin the departments you revisit, and keep
              the course tree compact instead of noisy.
            </p>
            {loadingFavorites ? (
              <p className="mt-3 text-xs text-gray-500">
                Syncing your favorites…
              </p>
            ) : null}
            {favoritesError && (
              <p className="mt-3 text-xs text-red-400">
                Error loading favorites: {favoritesError}
              </p>
            )}
          </div>

          <div className="w-full md:w-80">
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="CMSC, math, biology…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#5f8cff]/70 focus:bg-white/[0.06]"
            />
          </div>
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-200">
              Starred departments
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
              {favorites.length} pinned
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {favorites.map((dept) => {
              const isFavorite = favoriteIds.has(dept.id)

              return (
                <div
                  key={dept.id}
                  className="app-panel rounded-[1.5rem] p-4 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/${encodeURIComponent(dept.code)}`}
                      className="flex-1"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#9db6ff]">
                        {dept.code}
                      </p>
                      <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                        {dept.name}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleToggleFavorite(dept.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        isFavorite
                          ? 'border-[#5f8cff]/35 bg-[#5f8cff]/14 text-[#b7c8ff]'
                          : 'border-white/10 bg-white/[0.04] text-gray-400 hover:border-white/20 hover:text-white'
                      }`}
                      aria-label={
                        isFavorite
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                    >
                      {isFavorite ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                    <span>Jump into course list</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                      Open
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-200">
            All departments
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            {departments.length} total
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {others.map((dept) => {
            const isFavorite = favoriteIds.has(dept.id)

            return (
              <div
                key={dept.id}
                className="app-panel rounded-[1.5rem] p-4 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/${encodeURIComponent(dept.code)}`}
                    className="flex-1"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500">
                      {dept.code}
                    </p>
                    <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                      {dept.name}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleToggleFavorite(dept.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      isFavorite
                        ? 'border-[#5f8cff]/35 bg-[#5f8cff]/14 text-[#b7c8ff]'
                        : 'border-white/10 bg-white/[0.04] text-gray-400 hover:border-white/20 hover:text-white'
                    }`}
                    aria-label={
                      isFavorite
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                  >
                    {isFavorite ? 'Saved' : 'Save'}
                  </button>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                  <span>Browse courses</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                    Open
                  </span>
                </div>
              </div>
            )
          })}

          {favorites.length === 0 && others.length === 0 && (
            <p className="col-span-full rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-6 text-sm text-gray-400">
              No departments match your search.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
