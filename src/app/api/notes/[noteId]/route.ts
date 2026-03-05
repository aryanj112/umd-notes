import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildStudyPageDocument } from '@/lib/notes/html'

type NotePageRow = {
  title: string
  content: string | null
}

type RouteContext = {
  params: Promise<{
    noteId: string
  }>
}

export async function GET(_: Request, { params }: RouteContext) {
  const { noteId } = await params
  const supabase = await createClient()

  const { data: note, error } = await supabase
    .from('notes')
    .select('title, content')
    .eq('id', noteId)
    .single()
    .returns<NotePageRow>()

  if (error || !note || !note.content) {
    return new NextResponse('Note not found', { status: 404 })
  }

  return new NextResponse(buildStudyPageDocument(note.title, note.content), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  })
}
