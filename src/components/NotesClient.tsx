'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type NoteRow = {
  id: string
  title: string
  content: string | null
  file_url: string | null
  upvotes: number
  created_at: string
}

type NotesClientProps = {
  sectionId: string
  userId: string
}

type ExplanationMap = Record<string, string>

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export default function NotesClient({ sectionId }: NotesClientProps) {
  const supabase = createClient()

  const [notes, setNotes] = useState<NoteRow[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [notesError, setNotesError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [sectionNumber, setSectionNumber] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [upvotingId, setUpvotingId] = useState<string | null>(null)

  const [explainingId, setExplainingId] = useState<string | null>(null)
  const [explanations, setExplanations] = useState<ExplanationMap>({})
  const [explainError, setExplainError] = useState<string | null>(null)

  useEffect(() => {
    const loadNotes = async () => {
      setLoadingNotes(true)
      setNotesError(null)

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, file_url, upvotes, created_at')
        .eq('section_id', sectionId)
        .order('created_at', { ascending: true })
        .returns<NoteRow[]>()

      if (error) {
        setNotesError(error.message)
        setNotes([])
      } else {
        setNotes(data ?? [])
      }

      setLoadingNotes(false)
    }

    void loadNotes()
  }, [sectionId, supabase])

  const parseSectionNumber = (rawTitle: string): number => {
    const match = rawTitle.trim().match(/^(\d+(?:\.\d+)?)/)
    if (!match) return Number.MAX_SAFE_INTEGER
    return Number.parseFloat(match[1])
  }

  const orderedNotes = useMemo(
    () =>
      [...notes].sort(
        (a, b) => parseSectionNumber(a.title) - parseSectionNumber(b.title),
      ),
    [notes],
  )

  const handleCreateNote = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)

    try {
      const num = sectionNumber.trim()
      const trimmedName = name.trim()

      if (!/^\d+(\.\d+)?$/.test(num)) {
        setSaveError('Section number must look like 1 or 1.1')
        setSaving(false)
        return
      }

      if (!file) {
        setSaveError('Please choose a file to upload')
        setSaving(false)
        return
      }

      const title = `${num} ${trimmedName}`

      const formData = new FormData()
      formData.set('sectionId', sectionId)
      formData.set('title', title)
      formData.set('file', file)

      const response = await fetch('/api/notes', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        setSaveError(data?.error ?? 'Failed to create note')
        setSaving(false)
        return
      }

      const data = (await response.json()) as { note: NoteRow }
      setNotes((current) => [...current, data.note])

      setSectionNumber('')
      setName('')
      setFile(null)
      setModalOpen(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create note')
    } finally {
      setSaving(false)
    }
  }

  const handleUpvote = async (noteId: string) => {
    const target = notes.find((note) => note.id === noteId)
    if (!target) {
      return
    }

    const nextUpvotes = (target.upvotes ?? 0) + 1

    setUpvotingId(noteId)

    try {
      const { error } = await supabase
        .from('notes')
        .update({ upvotes: nextUpvotes })
        .eq('id', noteId)

      if (!error) {
        setNotes((current) =>
          current.map((note) =>
            note.id === noteId ? { ...note, upvotes: nextUpvotes } : note,
          ),
        )
      }
    } finally {
      setUpvotingId(null)
    }
  }

  const handleExplain = async (noteId: string, noteContent: string | null) => {
    if (!noteContent) {
      return
    }

    setExplainingId(noteId)
    setExplainError(null)

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ content: stripHtml(noteContent) }),
      })

      if (!response.ok) {
        const text = await response.text()
        setExplainError(
          text || 'Failed to generate explanation. Please try again.',
        )
        setExplainingId(null)
        return
      }

      const html = await response.text()

      setExplanations((current) => ({
        ...current,
        [noteId]: html,
      }))
    } catch (error) {
      setExplainError(
        error instanceof Error
          ? error.message
          : 'Unexpected error generating explanation',
      )
    } finally {
      setExplainingId(null)
    }
  }

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
          Sections
        </h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
        >
          Add section
        </button>
      </div>

      {loadingNotes && (
        <p className="text-sm text-gray-400">Loading notes…</p>
      )}

      {notesError && !loadingNotes && (
        <p className="rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-200">
          Error loading notes: {notesError}
        </p>
      )}

      {!loadingNotes && !notesError && notes.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 px-6 py-10 text-center">
            <h3 className="text-lg font-medium text-white">
              No sections yet
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Be the first to add a numbered section with files for this class.
          </p>
        </div>
      )}

      {!loadingNotes && !notesError && notes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {orderedNotes.map((note) => (
            <article
              key={note.id}
              className="flex flex-col rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-white">
                    {note.title}
                  </h3>
                  {note.content && (
                    <p className="mt-2 line-clamp-4 text-sm text-gray-300">
                      {stripHtml(note.content)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleUpvote(note.id)}
                  disabled={upvotingId === note.id}
                  className="flex flex-col items-center rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200 transition hover:border-red-500 hover:text-red-400 disabled:opacity-60"
                >
                  <span>▲</span>
                  <span className="mt-0.5">{note.upvotes ?? 0}</span>
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/notes/${encodeURIComponent(note.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-red-400 hover:text-red-300"
                  >
                    Open study page
                  </a>
                  {note.file_url && (
                    <a
                      href={note.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-gray-400 hover:text-white"
                    >
                      Source file
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleExplain(note.id, note.content)}
                    disabled={explainingId === note.id || !note.content}
                    className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-60"
                  >
                    {explainingId === note.id
                      ? 'Explaining with AI…'
                      : 'Summarize'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>

              {explainError && explainingId === null && (
                <p className="mt-2 text-xs text-red-400">
                  {explainError}
                </p>
              )}

              {explanations[note.id] && (
                <div className="mt-3 rounded-lg border border-gray-700 bg-gray-900/80 p-3 text-sm text-gray-100">
                  <div
                    className="prose prose-invert max-w-none prose-p:mb-2 prose-ul:list-disc prose-ul:pl-5 prose-li:my-1 prose-code:rounded prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5"
                    // HTML is generated by our own API with a safe, constrained prompt
                    dangerouslySetInnerHTML={{ __html: explanations[note.id] }}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">
              Add section
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Use a simple number like 1 or 1.1, give it a name, and upload a
              file for this class section.
            </p>

            <form onSubmit={handleCreateNote} className="mt-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="mb-1 block text-xs text-gray-300">
                    Number
                  </label>
                  <input
                    type="text"
                    value={sectionNumber}
                    onChange={(event) => setSectionNumber(event.target.value)}
                    required
                    placeholder="1.1"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-300">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder="Limits and continuity"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-300">
                  File
                </label>
                <input
                  type="file"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] ?? null)
                  }
                  required
                  className="w-full text-sm text-gray-300 file:mr-3 file:rounded-full file:border-0 file:bg-red-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:hover:bg-red-500"
                />
              </div>

              {saveError && (
                <p className="text-sm text-red-400">
                  {saveError}
                </p>
              )}

              <div className="mt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      setModalOpen(false)
                    }
                  }}
                  className="text-sm text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
