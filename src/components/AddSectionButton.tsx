'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  courseId: string
  userId: string
}

export default function AddSectionButton({ courseId, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [professor, setProfessor] = useState('')
  const [semester, setSemester] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: insertError } = await supabase.from('sections').insert({
        course_id: courseId,
        professor: professor.trim(),
        semester: semester.trim() || null,
        description: description.trim() || null,
        created_by: userId,
      })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      setOpen(false)
      setProfessor('')
      setSemester('')
      setDescription('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add section')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
      >
        Add section
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">
              Add section
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Add a new section for this course with professor and semester details.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-300">
                  Professor
                </label>
                <input
                  type="text"
                  value={professor}
                  onChange={(event) => setProfessor(event.target.value)}
                  placeholder="Dr. Smith"
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">
                  Semester
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={(event) => setSemester(event.target.value)}
                  placeholder="Fall 2026"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description for this section..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!loading) {
                      setOpen(false)
                    }
                  }}
                  className="text-sm text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-60"
                >
                  {loading ? 'Saving...' : 'Save section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

