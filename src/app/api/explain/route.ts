import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateExplanationHtml, stripHtmlTags } from '@/lib/notes/html'

type ExplainRequestBody = {
  content: string
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let body: ExplainRequestBody
  try {
    body = (await request.json()) as ExplainRequestBody
  } catch {
    return new NextResponse('Invalid JSON body', { status: 400 })
  }

  const trimmedContent = body.content?.trim()
  if (!trimmedContent) {
    return new NextResponse('Content is required', { status: 400 })
  }

  try {
    const explanation = await generateExplanationHtml(stripHtmlTags(trimmedContent))

    return new NextResponse(explanation, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    return new NextResponse('Error generating explanation', { status: 500 })
  }
}
