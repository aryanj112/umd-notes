'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type Course = {
  id: string
  code: string
  name: string
  department: {
    code: string
    name: string
  } | null
}

type Props = {
  courses: Course[]
}

export default function CourseDirectory({ courses }: Props) {
  const [search, setSearch] = useState('')

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()

    const sorted = [...courses].sort((a, b) => a.name.localeCompare(b.name))

    if (!query) {
      return sorted
    }

    return sorted.filter((course) => {
      const deptCode = course.department?.code.toLowerCase() ?? ''

      return (
        course.name.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query) ||
        deptCode.includes(query)
      )
    })
  }, [courses, search])

  return (
    <section className="space-y-6">
      <div className="app-panel rounded-[1.75rem] p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gray-500">
              Course directory
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              Search the actual class, not the department first.
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              Start with the course title, jump straight into sections, and open
              the note pages that matter.
            </p>
          </div>

          <div className="w-full md:w-96">
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
              Search courses
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Object-oriented programming, calculus, 131..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#5f8cff]/70 focus:bg-white/[0.06]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">
          Courses
        </h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
          {filteredCourses.length} shown
        </p>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-sm text-gray-400">
          No courses match your search.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => {
            const deptCode = course.department?.code ?? 'dept'

            return (
              <Link
                key={course.id}
                href={`/${encodeURIComponent(deptCode)}/${encodeURIComponent(course.code)}`}
                className="app-panel rounded-[1.5rem] p-4 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  {course.code}
                </p>
                <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">
                  {course.name}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
                  <span>{course.department?.name ?? 'Unknown department'}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                    {deptCode}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
