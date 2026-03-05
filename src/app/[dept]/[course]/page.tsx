import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AddSectionButton from '@/components/AddSectionButton'

type Department = {
  id: string
  code: string
  name: string
}

type Course = {
  id: string
  code: string
  name: string
  department_id: string | null
}

type Section = {
  id: string
  professor: string
  semester: string | null
  description: string | null
  created_at: string
}

type PageProps = {
  params: Promise<{
    dept: string
    course: string
  }>
}

export default async function CoursePage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { dept, course: courseSlug } = await params
  const deptCode = decodeURIComponent(dept)
  const courseCode = decodeURIComponent(courseSlug)

  const { data: department, error: deptError } = await supabase
    .from('departments')
    .select('id, code, name')
    .eq('code', deptCode)
    .single()
    .returns<Department>()

  if (deptError || !department) {
    notFound()
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, code, name, department_id')
    .eq('code', courseCode)
    .eq('department_id', department.id)
    .single()
    .returns<Course>()

  if (courseError || !course) {
    notFound()
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('sections')
    .select('id, professor, semester, description, created_at')
    .eq('course_id', course.id)
    .order('created_at', { ascending: false })
    .returns<Section[]>()

  const safeSections = sections ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            {department.code} · {course.code}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {course.name}
          </h1>
          <div className="mt-2 h-[2px] w-10 rounded-full bg-red-600" />
          <p className="mt-3 text-sm text-gray-400">
            Browse sections for this course, organized by professor and semester.
          </p>
        </div>
        <AddSectionButton courseId={course.id} userId={user.id} />
      </header>

      {sectionsError && (
        <p className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-200">
          Error loading sections: {sectionsError.message}
        </p>
      )}

      {safeSections.length === 0 && !sectionsError && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 px-6 py-10 text-center">
          <h2 className="text-lg font-medium text-white">
            No sections yet
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Use the button above to add a section for a specific professor and semester.
          </p>
        </div>
      )}

      {safeSections.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-200">
              Sections
            </h2>
            <p className="text-xs text-gray-500">
              {safeSections.length} total
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {safeSections.map((section) => (
              <Link
                key={section.id}
                href={`/${encodeURIComponent(department.code)}/${encodeURIComponent(course.code)}/${encodeURIComponent(section.id)}`}
                className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-red-500/70 hover:bg-white/10"
              >
                <div>
                  <p className="text-sm font-semibold tracking-tight text-white">
                    {section.professor}
                  </p>
                  {section.semester && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {section.semester}
                    </p>
                  )}
                  {section.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-gray-300">
                      {section.description}
                    </p>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                  View notes →
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
