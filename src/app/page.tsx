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
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="app-panel rounded-[2rem] px-6 py-7 md:px-8 md:py-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#8da9ff]">
              Knowledge base
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Course notes that feel organized before they feel crowded.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 md:text-base">
              Start with a department, move into the exact course, and turn raw
              uploads into polished study pages your classmates can actually
              reuse.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
                Departments
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                {safeDepartments.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">Indexed for browsing</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
                Flow
              </p>
              <p className="mt-3 text-sm font-medium text-white">
                Department → Course → Section
              </p>
              <p className="mt-1 text-xs text-gray-500">Fast enough to scan</p>
            </div>
            <div className="rounded-2xl border border-[#5f8cff]/20 bg-[#5f8cff]/8 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a9bfff]">
                AI notes
              </p>
              <p className="mt-3 text-sm font-medium text-white">
                Upload once, get a study page
              </p>
              <p className="mt-1 text-xs text-[#b9c7ef]">
                Stored and shareable
              </p>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-800/70 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          Error loading departments: {error.message}
        </p>
      )}

      {safeDepartments.length === 0 && !error && (
        <div className="app-panel rounded-[1.75rem] border-dashed px-6 py-12 text-center">
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
