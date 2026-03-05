import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStudyHtmlFromFile } from '@/lib/notes/html'

type NoteInsert = {
  id: string
  title: string
  content: string | null
  file_url: string | null
  upvotes: number
  created_at: string
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const sectionId = formData.get('sectionId')
  const title = formData.get('title')
  const file = formData.get('file')

  if (typeof sectionId !== 'string' || !sectionId.trim()) {
    return NextResponse.json({ error: 'sectionId is required' }, { status: 400 })
  }

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'A note file is required' }, { status: 400 })
  }

  const safeName = file.name.replace(/\s+/g, '-').toLowerCase()
  const path = `${sectionId}/${Date.now()}-${safeName}`

  const { data: uploadResult, error: uploadError } = await supabase.storage
    .from('notes')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (uploadError || !uploadResult) {
    return NextResponse.json(
      { error: uploadError?.message ?? 'Failed to upload note file' },
      { status: 500 },
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('notes').getPublicUrl(uploadResult.path)

  let generatedHtml: string
  try {
    generatedHtml = await generateStudyHtmlFromFile({
      fileUrl: publicUrl,
      title: title.trim(),
      mimeType: file.type,
    })
  } catch (error) {
    console.error('Failed to generate study HTML:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to convert file into study webpage',
      },
      { status: 502 },
    )
  }

  const { data: note, error: insertError } = await supabase
    .from('notes')
    .insert({
      section_id: sectionId.trim(),
      title: title.trim(),
      content: generatedHtml,
      file_url: publicUrl,
      created_by: user.id,
    })
    .select('id, title, content, file_url, upvotes, created_at')
    .single()
    .returns<NoteInsert>()

  if (insertError || !note) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Failed to save note' },
      { status: 500 },
    )
  }

  return NextResponse.json({ note }, { status: 201 })
}
