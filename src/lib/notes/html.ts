const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

export const DEFAULT_STUDY_PROMPT =
  'Turn this uploaded class note into a polished study webpage for UMD students. ' +
  'Return only HTML markup for the article body, not markdown and not a full document. ' +
  'Use semantic tags like section, h1, h2, h3, p, ul, ol, li, table, blockquote, code, pre, figure, figcaption, and div. ' +
  'Build something expansive and interactive-looking, not a thin article. ' +
  'Include distinct sections such as: what it is, why it is useful, core ideas, terminology, worked examples if present, common mistakes, and an answer key. ' +
  'If possible from the material, include a generator or practice builder students can use conceptually, such as a step-by-step recipe, formula builder, checklist, or input/output table. ' +
  'If possible, include a quiz section with at least 3 questions and a separate revealed answer key section. ' +
  'If the source supports it, include tables, comparison blocks, challenge prompts, and alternate ways to think about the topic. ' +
  'Keep the original material accurate. If the file is sparse, clearly mark uncertainty or missing details instead of inventing content. ' +
  'Vary the section order, examples, visual framing, and pacing so two generations of the same file do not feel identical.'

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function sanitizeGeneratedHtml(html: string) {
  return html
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<\/?(html|head|body|meta|title)[^>]*>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(iframe|object|embed|form|input|button|textarea|select)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+=(['"]).*?\1/gi, '')
    .replace(/\shref=(['"])javascript:.*?\1/gi, ' href="#"')
    .trim()
}

export function stripHtmlTags(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractOutputText(data: OpenAIResponse) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => (content.type === 'output_text' ? content.text ?? '' : ''))
      .join('\n')
      .trim() ?? ''
  )
}

export async function generateStudyHtmlFromFile({
  fileUrl,
  title,
  mimeType,
  customPrompt,
}: {
  fileUrl: string
  title: string
  mimeType: string
  customPrompt?: string
}) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const generationVariant = Math.floor(Math.random() * 1_000_000)
  const basePrompt = customPrompt?.trim() || DEFAULT_STUDY_PROMPT
  const fullPrompt =
    `${basePrompt} ` +
    `The note title is "${title}" and the file MIME type is "${mimeType || 'unknown'}". ` +
    `Use variation seed ${generationVariant} to choose a different structure and different examples than prior generations when possible.`

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: fullPrompt,
            },
            {
              type: 'input_file',
              file_url: fileUrl,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as OpenAIResponse
  const generated = sanitizeGeneratedHtml(extractOutputText(data))

  if (!generated) {
    throw new Error('OpenAI did not return any HTML')
  }

  return generated
}

export function buildStudyPageDocument(title: string, bodyHtml: string) {
  const safeTitle = escapeHtml(title)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0a0a0b;
        --panel: #121317;
        --border: rgba(255,255,255,0.08);
        --text: #f5f7fb;
        --muted: #b6bfcc;
        --accent: #ef4444;
        --accent-soft: rgba(239,68,68,0.14);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        background:
          radial-gradient(circle at top, rgba(239,68,68,0.16), transparent 34%),
          linear-gradient(180deg, #0b0b0d 0%, #09090b 100%);
        color: var(--text);
      }
      main {
        max-width: 920px;
        margin: 0 auto;
        padding: 48px 20px 80px;
      }
      article {
        background: rgba(18,19,23,0.94);
        border: 1px solid var(--border);
        border-radius: 28px;
        padding: 32px;
        box-shadow: 0 30px 80px rgba(0,0,0,0.45);
      }
      h1, h2, h3 { line-height: 1.1; }
      h1 { font-size: clamp(2rem, 5vw, 3.5rem); margin: 0 0 18px; }
      h2 {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid var(--border);
        font-size: 1.5rem;
      }
      h3 { margin-top: 24px; font-size: 1.1rem; color: #ffd9d9; }
      p, li, blockquote { color: var(--muted); font-size: 1.02rem; line-height: 1.75; }
      ul, ol { padding-left: 1.4rem; }
      code, pre {
        font-family: "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
        background: rgba(255,255,255,0.06);
        border-radius: 10px;
      }
      code { padding: 0.15rem 0.4rem; }
      pre { padding: 14px 16px; overflow-x: auto; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        border: 1px solid var(--border);
      }
      th, td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        text-align: left;
      }
      blockquote {
        margin: 20px 0;
        padding: 14px 18px;
        border-left: 4px solid var(--accent);
        background: var(--accent-soft);
      }
      a { color: #fda4af; }
    </style>
  </head>
  <body>
    <main>
      <article>
        ${bodyHtml}
      </article>
    </main>
  </body>
</html>`
}
