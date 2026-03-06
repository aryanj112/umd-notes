import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotesClient from '@/components/NotesClient'

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
  course_id: string | null
  professor: string
  semester: string | null
  description: string | null
}

type PageProps = {
  params: Promise<{
    dept: string
    course: string
    sectionId: string
  }>
}

export default async function SectionNotesPage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { dept, course: courseSlug, sectionId } = await params
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

  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('id, course_id, professor, semester, description')
    .eq('id', sectionId)
    .eq('course_id', course.id)
    .single()
    .returns<Section>()

  if (sectionError || !section) {
    notFound()
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="app-panel rounded-[1.75rem] px-6 py-7 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gray-500">
          {department.code} · {course.code}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
          {course.name}
        </h1>
        <p className="mt-4 text-sm text-gray-300">
          {section.professor}
          {section.semester ? ` · ${section.semester}` : ''}
        </p>
        {section.description && (
          <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-400">
            {section.description}
          </p>
        )}
      </header>

      <NotesClient sectionId={section.id} />
    </div>
  )
}
