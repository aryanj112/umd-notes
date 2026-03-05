'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Course = {
  id: string
  code: string
  name: string
}

type FavoriteCourseRow = {
  course_id: string
}

type Props = {
  departmentCode: string
  courses: Course[]
}

export default function CourseBrowser({ departmentCode, courses }: Props) {
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
        .from('favorite_courses')
        .select('course_id')
        .eq('user_id', user.id)
        .returns<FavoriteCourseRow[]>()

      if (error) {
        setFavoritesError(error.message)
        setFavoriteIds(new Set())
      } else {
        setFavoriteIds(new Set((data ?? []).map((row) => row.course_id)))
      }

      setLoadingFavorites(false)
    }

    void loadUserAndFavorites()
  }, [supabase])

  const handleToggleFavorite = async (courseId: string) => {
    if (!userId) {
      return
    }

    const isFavorite = favoriteIds.has(courseId)

    if (isFavorite) {
      const { error } = await supabase
        .from('favorite_courses')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId)

      if (!error) {
        setFavoriteIds((current) => {
          const next = new Set(current)
          next.delete(courseId)
          return next
        })
      }
      return
    }

    const { error } = await supabase.from('favorite_courses').insert({
      user_id: userId,
      course_id: courseId,
    })

    if (!error) {
      setFavoriteIds((current) => new Set(current).add(courseId))
    }
  }

  const { favorites, others } = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = courses.filter((course) => {
      if (!query) return true
      return (
        course.code.toLowerCase().includes(query) ||
        course.name.toLowerCase().includes(query)
      )
    })

    const favs = filtered
      .filter((course) => favoriteIds.has(course.id))
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))

    const rest = filtered
      .filter((course) => !favoriteIds.has(course.id))
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))

    return { favorites: favs, others: rest }
  }, [courses, favoriteIds, search])

  const basePath = `/${encodeURIComponent(departmentCode)}`

  return (
    <section className="space-y-8">
      <div className="app-panel rounded-[1.75rem] p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gray-500">
              Courses
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              Course lists with less clutter and faster entry points.
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Search by name or code, pin the classes you care about, and move
              directly into sections and uploaded study pages.
            </p>
            {loadingFavorites ? (
              <p className="mt-3 text-xs text-gray-500">
                Syncing your saved courses…
              </p>
            ) : null}
            {favoritesError && (
              <p className="mt-3 text-xs text-red-400">
                Error loading course favorites: {favoritesError}
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
              placeholder="131, algorithms, systems…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#5f8cff]/70 focus:bg-white/[0.06]"
            />
          </div>
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-200">
              Starred courses
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
              {favorites.length} pinned
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {favorites.map((course) => {
              const isFavorite = favoriteIds.has(course.id)

              return (
                <div
                  key={course.id}
                  className="app-panel rounded-[1.5rem] p-4 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`${basePath}/${encodeURIComponent(course.code)}`}
                      className="flex-1"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#9db6ff]">
                        {course.code}
                      </p>
                      <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                        {course.name}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleToggleFavorite(course.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        isFavorite
                          ? 'border-[#5f8cff]/35 bg-[#5f8cff]/14 text-[#b7c8ff]'
                          : 'border-white/10 bg-white/[0.04] text-gray-400 hover:border-white/20 hover:text-white'
                      }`}
                      aria-label={
                        isFavorite
                          ? 'Remove course from favorites'
                          : 'Add course to favorites'
                      }
                    >
                      {isFavorite ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                    <span>Open section list</span>
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
            All courses
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            {courses.length} total
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {others.map((course) => {
            const isFavorite = favoriteIds.has(course.id)

            return (
              <div
                key={course.id}
                className="app-panel rounded-[1.5rem] p-4 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`${basePath}/${encodeURIComponent(course.code)}`}
                    className="flex-1"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500">
                      {course.code}
                    </p>
                    <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                      {course.name}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleToggleFavorite(course.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      isFavorite
                        ? 'border-[#5f8cff]/35 bg-[#5f8cff]/14 text-[#b7c8ff]'
                        : 'border-white/10 bg-white/[0.04] text-gray-400 hover:border-white/20 hover:text-white'
                    }`}
                    aria-label={
                      isFavorite
                        ? 'Remove course from favorites'
                        : 'Add course to favorites'
                    }
                  >
                    {isFavorite ? 'Saved' : 'Save'}
                  </button>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                  <span>Browse sections</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                    Open
                  </span>
                </div>
              </div>
            )
          })}

          {favorites.length === 0 && others.length === 0 && (
            <p className="col-span-full rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-6 text-sm text-gray-400">
              No classes match your search.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
