import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AddCourseButton from '@/components/AddCourseButton'
import CourseBrowser from '@/components/CourseBrowser'

type Department = {
  id: string
  code: string
  name: string
}

type Course = {
  id: string
  code: string
  name: string
}

type PageProps = {
  params: Promise<{
    dept: string
  }>
}

export default async function DepartmentPage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { dept } = await params
  const deptCode = decodeURIComponent(dept)

  const { data: deptRows, error: deptError } = await supabase
    .from('departments')
    .select('id, code, name')
    .eq('code', deptCode)
    .limit(1)
    .returns<Department[]>()

  const department = deptRows?.[0] ?? null

  if (deptError || !department) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 pt-8">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Department not found
        </h1>
        <p className="text-sm text-gray-400">
          We couldn&apos;t find a department with code{' '}
          <span className="font-mono text-gray-200">{deptCode}</span>. Check
          the URL or go back to the home page to pick a department from the
          list.
        </p>
        {deptError && (
          <p className="text-xs text-red-400">
            Debug info: {deptError.message}
          </p>
        )}
      </div>
    )
  }

  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, code, name')
    .eq('department_id', department.id)
    .order('code', { ascending: true })
    .returns<Course[]>()

  const safeCourses = courses ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            {department.code}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {department.name}
          </h1>
          <div className="mt-2 h-[2px] w-10 rounded-full bg-red-600" />
          <p className="mt-3 text-sm text-gray-400">
            Select a course to view its sections and shared notes.
          </p>
        </div>
        <AddCourseButton departmentId={department.id} />
      </header>

      {coursesError && (
        <p className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-200">
          Error loading courses: {coursesError.message}
        </p>
      )}

      {safeCourses.length === 0 && !coursesError && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 px-6 py-10 text-center">
          <h2 className="text-lg font-medium text-white">
            No courses yet
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Use the button above to add your first course for this department.
          </p>
        </div>
      )}

      {safeCourses.length > 0 && (
        <CourseBrowser
          departmentCode={department.code}
          courses={safeCourses}
        />
      )}
    </div>
  )
}
