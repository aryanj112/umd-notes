'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_STUDY_PROMPT } from '@/lib/notes/html'

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
}

type VoteRow = {
  note_id: string
  value: number
}

export default function NotesClient({ sectionId }: NotesClientProps) {
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [notesError, setNotesError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [sectionNumber, setSectionNumber] = useState('')
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState(DEFAULT_STUDY_PROMPT)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [voteState, setVoteState] = useState<Record<string, -1 | 0 | 1>>({})
  const [votingId, setVotingId] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)

  useEffect(() => {
    const loadNotes = async () => {
      setLoadingNotes(true)
      setNotesError(null)
      setVoteError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

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

      if (user && (data?.length ?? 0) > 0) {
        const { data: votes, error: voteLoadError } = await supabase
          .from('note_votes')
          .select('note_id, value')
          .in(
            'note_id',
            (data ?? []).map((note) => note.id),
          )
          .returns<VoteRow[]>()

        if (!voteLoadError) {
          setVoteState(
            Object.fromEntries(
              (votes ?? []).map((vote) => [vote.note_id, vote.value as -1 | 0 | 1]),
            ),
          )
        }
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
      formData.set('prompt', prompt)

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
      setPrompt(DEFAULT_STUDY_PROMPT)
      setFile(null)
      setModalOpen(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create note')
    } finally {
      setSaving(false)
    }
  }

  const handleVote = async (noteId: string, nextValue: -1 | 1) => {
    if (!userId) {
      setVoteError('You must be logged in to vote on notes.')
      return
    }

    const target = notes.find((note) => note.id === noteId)
    if (!target) {
      return
    }

    setVoteError(null)
    setVotingId(noteId)

    const currentValue = voteState[noteId] ?? 0
    const finalValue = currentValue === nextValue ? 0 : nextValue
    const nextUpvotes = (target.upvotes ?? 0) + (finalValue - currentValue)

    try {
      if (finalValue === 0) {
        const { error: deleteError } = await supabase
          .from('note_votes')
          .delete()
          .eq('note_id', noteId)

        if (deleteError) {
          throw deleteError
        }
      } else if (currentValue === 0) {
        const { error: insertError } = await supabase.from('note_votes').insert({
          user_id: userId,
          note_id: noteId,
          value: finalValue,
        })

        if (insertError) {
          throw insertError
        }
      } else {
        const { error: updateVoteError } = await supabase
          .from('note_votes')
          .update({ value: finalValue })
          .eq('note_id', noteId)

        if (updateVoteError) {
          throw updateVoteError
        }
      }

      const { error: updateError } = await supabase
        .from('notes')
        .update({ upvotes: nextUpvotes })
        .eq('id', noteId)

      if (updateError) {
        throw updateError
      }

      setVoteState((current) => ({
        ...current,
        [noteId]: finalValue,
      }))
      setNotes((current) =>
        current.map((note) =>
          note.id === noteId ? { ...note, upvotes: nextUpvotes } : note,
        ),
      )
    } catch (error) {
      setVoteError(
        error instanceof Error ? error.message : 'Failed to update vote',
      )
    } finally {
      setVotingId(null)
    }
  }

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
          Notes
        </h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08]"
        >
          Add note
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

      {voteError && (
        <p className="mb-4 rounded-lg border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-200">
          Vote error: {voteError}
        </p>
      )}

      {!loadingNotes && !notesError && notes.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 px-6 py-10 text-center">
            <h3 className="text-lg font-medium text-white">
              No notes yet
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Be the first to add a note file and turn it into a study page.
          </p>
        </div>
      )}

      {!loadingNotes && !notesError && notes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {orderedNotes.map((note) => (
            <article
              key={note.id}
              className="app-panel flex flex-col rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-white">
                    {note.title}
                  </h3>
                  <p className="mt-2 text-xs text-gray-500">
                    Generated study page saved for this note.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2">
                  <button
                    type="button"
                    onClick={() => void handleVote(note.id, 1)}
                    disabled={votingId === note.id}
                    className={`rounded-lg px-2 py-1 text-xs ${
                      (voteState[note.id] ?? 0) === 1
                        ? 'bg-[#5f8cff]/18 text-[#b7c8ff]'
                        : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                    } disabled:opacity-60`}
                  >
                    ▲
                  </button>
                  <span className="text-xs font-medium text-gray-200">
                    {note.upvotes ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleVote(note.id, -1)}
                    disabled={votingId === note.id}
                    className={`rounded-lg px-2 py-1 text-xs ${
                      (voteState[note.id] ?? 0) === -1
                        ? 'bg-white/[0.1] text-white'
                        : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                    } disabled:opacity-60`}
                  >
                    ▼
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/notes/${encodeURIComponent(note.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-[#9db6ff] hover:text-white"
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
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">
              Add note
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Upload a class note and optionally steer how the AI turns it into
              a richer study page.
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
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#5f8cff]/70 focus:outline-none"
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
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#5f8cff]/70 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-300">
                  Generation prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={9}
                  className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#5f8cff]/70 focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Edit the full base prompt directly before upload.
                </p>
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
                  className="w-full text-sm text-gray-300 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white file:hover:bg-white/15"
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
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
