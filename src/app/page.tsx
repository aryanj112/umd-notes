import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CourseDirectory from '@/components/CourseDirectory'

type CourseRow = {
  id: string
  code: string
  name: string
  department: {
    code: string
    name: string
  } | null
}

type SupabaseCourseRow = {
  id: string
  code: string
  name: string
  departments: {
    code: string
    name: string
  } | {
    code: string
    name: string
  }[] | null
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data, error } = await supabase
    .from('courses')
    .select('id, code, name, departments(code, name)')
    .order('name', { ascending: true })
    .returns<SupabaseCourseRow[]>()

  const courses: CourseRow[] = (data ?? []).map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    department: Array.isArray(course.departments)
      ? (course.departments[0] ?? null)
      : course.departments,
  }))

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="app-panel rounded-[2rem] px-6 py-7 md:px-8 md:py-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#8da9ff]">
              Knowledge base
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Search by course title and land where the notes actually live.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 md:text-base">
              Skip the department index. Find the class directly, move into its
              sections, and open study pages built from uploaded notes.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
                Courses
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                {courses.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">Ready to search</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
                Flow
              </p>
              <p className="mt-3 text-sm font-medium text-white">
                Course → Section → Note
              </p>
              <p className="mt-1 text-xs text-gray-500">One fewer click path</p>
            </div>
            <div className="rounded-2xl border border-[#5f8cff]/20 bg-[#5f8cff]/8 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a9bfff]">
                AI notes
              </p>
              <p className="mt-3 text-sm font-medium text-white">
                Upload once, study in HTML
              </p>
              <p className="mt-1 text-xs text-[#b9c7ef]">
                Course pages stay focused
              </p>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-800/70 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          Error loading courses: {error.message}
        </p>
      )}

      {courses.length === 0 && !error && (
        <div className="app-panel rounded-[1.75rem] border-dashed px-6 py-12 text-center">
          <h2 className="text-lg font-medium text-white">
            No courses yet
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Once courses exist in your database, they will show up here for
            direct search.
          </p>
        </div>
      )}

      {courses.length > 0 && <CourseDirectory courses={courses} />}
    </div>
  )
}
