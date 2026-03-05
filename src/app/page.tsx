import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DepartmentBrowser from '@/components/DepartmentBrowser'

type Department = {
  id: string
  code: string
  name: string
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: departments, error } = await supabase
    .from('departments')
    .select('id, code, name')
    .order('code', { ascending: true })
    .returns<Department[]>()

  const safeDepartments = departments ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="mt-4">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Browse departments
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Start from your STEM department, favorite the ones you care about, and
          quickly jump into courses and shared notes.
        </p>
      </header>

      {error && (
        <p className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-200">
          Error loading departments: {error.message}
        </p>
      )}

      {safeDepartments.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 px-6 py-10 text-center">
          <h2 className="text-lg font-medium text-white">
            No departments yet
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Departments are seeded from your Supabase database. Once they are
            added, you will be able to search and favorite them here.
          </p>
        </div>
      )}

      {safeDepartments.length > 0 && (
        <DepartmentBrowser departments={safeDepartments} />
      )}
    </div>
  )
}
