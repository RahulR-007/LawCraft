/**
 * Backend Client (Secure)
 *
 * High-level API for LawCraft features.
 * All AI calls now go through authenticated Supabase Edge Functions.
 * DOCX export remains client-side (no secrets needed).
 */

import {
    secureChat,
    secureGenerateDocument,
    secureHealthCheck,
    fetchUserDocuments,
    fetchLegalClauses,
    fetchLawUpdates,
    type DocumentGenerationInput,
    type DocumentGenerationResult,
} from './secureClient'
import { AI_CONFIG, type ChatMessage } from './aiClient'

// ── Health ──────────────────────────────────────────────────────────
export async function backendHealth(): Promise<{ ok: boolean; model?: string }> {
    const ok = await secureHealthCheck()
    return { ok, model: AI_CONFIG.model }
}

// ── Chat ────────────────────────────────────────────────────────────
export async function backendChat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const finalMessages: ChatMessage[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

    const result = await secureChat(finalMessages)
    return result.content
}

// ── Structured Document Generation (replaces word-padding loop) ────

export async function backendGenerateStructuredDocument(
    input: DocumentGenerationInput
): Promise<DocumentGenerationResult> {
    return secureGenerateDocument(input)
}

/**
 * Legacy document generation — kept for backward compatibility.
 * Internally uses the new structured pipeline with default jurisdiction.
 */
export async function backendGenerateDocument(
    prompt: string,
    _minPages = 5
): Promise<{ text: string; pages: number }> {
    // Convert legacy prompt to structured input
    const result = await secureGenerateDocument({
        documentType: 'contract',
        jurisdiction: 'IN',
        parties: [
            { role: 'party1', name: 'Party A' },
            { role: 'party2', name: 'Party B' },
        ],
        customDetails: prompt,
    })

    const chars = result.content.replace(/\s+/g, ' ').trim().length
    const estimatedPages = Math.max(1, Math.ceil(chars / 2500))

    return { text: result.content, pages: estimatedPages }
}

// ── Data fetching ──────────────────────────────────────────────────
export { fetchUserDocuments, fetchLegalClauses, fetchLawUpdates }

// ── Client-side DOCX Export with Rich Markdown Parsing ────────────────

/**
 * Parses inline Markdown formatting (**bold**, *italic*, ***bold-italic***)
 * into structured docx TextRun instances.
 */
function parseInlineMarkdown(docx: typeof import('docx'), text: string, fontSize = 24, defaultBold = false): any[] {
    const { TextRun } = docx
    const cleanedText = text.replace(/═{3,}/g, '').trim()
    if (!cleanedText) return []

    const runs: any[] = []
    const regex = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*)/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(cleanedText)) !== null) {
        if (match.index > lastIndex) {
            const plain = cleanedText.slice(lastIndex, match.index)
            if (plain) {
                runs.push(
                    new TextRun({
                        text: plain,
                        font: 'Times New Roman',
                        size: fontSize,
                        bold: defaultBold,
                    })
                )
            }
        }

        const matched = match[0]
        if (matched.startsWith('***') && matched.endsWith('***')) {
            runs.push(
                new TextRun({
                    text: matched.slice(3, -3),
                    font: 'Times New Roman',
                    size: fontSize,
                    bold: true,
                    italics: true,
                })
            )
        } else if (matched.startsWith('**') && matched.endsWith('**')) {
            runs.push(
                new TextRun({
                    text: matched.slice(2, -2),
                    font: 'Times New Roman',
                    size: fontSize,
                    bold: true,
                })
            )
        } else if (matched.startsWith('*') && matched.endsWith('*')) {
            runs.push(
                new TextRun({
                    text: matched.slice(1, -1),
                    font: 'Times New Roman',
                    size: fontSize,
                    italics: true,
                })
            )
        }

        lastIndex = regex.lastIndex
    }

    if (lastIndex < cleanedText.length) {
        const remaining = cleanedText.slice(lastIndex)
        if (remaining) {
            runs.push(
                new TextRun({
                    text: remaining,
                    font: 'Times New Roman',
                    size: fontSize,
                    bold: defaultBold,
                })
            )
        }
    }

    return runs.length > 0
        ? runs
        : [
              new TextRun({
                  text: cleanedText,
                  font: 'Times New Roman',
                  size: fontSize,
                  bold: defaultBold,
              }),
          ]
}

/**
 * Converts Markdown content into native docx Paragraph elements with proper
 * headings, bold/italic formatting, indentation, and page layout.
 */
function convertMarkdownToDocxParagraphs(docx: typeof import('docx'), content: string): any[] {
    const { Paragraph, TextRun, AlignmentType, HeadingLevel } = docx
    const paragraphs: any[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // Skip empty lines or pure divider lines
        if (!line || /^[═=\-_]{3,}$/.test(line)) {
            continue
        }

        // 1. Heading 1 (# Heading)
        if (line.startsWith('# ')) {
            const headingText = line.slice(2).replace(/\*\*/g, '').trim()
            paragraphs.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 360, after: 180 },
                    children: [
                        new TextRun({
                            text: headingText.toUpperCase(),
                            font: 'Times New Roman',
                            size: 32, // 16pt
                            bold: true,
                        }),
                    ],
                })
            )
            continue
        }

        // 2. Heading 2 (## Heading)
        if (line.startsWith('## ')) {
            const headingText = line.slice(3).replace(/\*\*/g, '').trim()
            paragraphs.push(
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 280, after: 120 },
                    children: [
                        new TextRun({
                            text: headingText,
                            font: 'Times New Roman',
                            size: 28, // 14pt
                            bold: true,
                        }),
                    ],
                })
            )
            continue
        }

        // 3. Heading 3 (### Heading)
        if (line.startsWith('### ')) {
            const headingText = line.slice(4).replace(/\*\*/g, '').trim()
            paragraphs.push(
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 80 },
                    children: [
                        new TextRun({
                            text: headingText,
                            font: 'Times New Roman',
                            size: 26, // 13pt
                            bold: true,
                        }),
                    ],
                })
            )
            continue
        }

        // 4. Disclaimer Callout Box / Warning Line
        if (line.includes('⚠️') || line.toUpperCase().includes('DISCLAIMER') || line.toUpperCase().includes('LEGAL NOTICE')) {
            const runs = parseInlineMarkdown(docx, line, 20, false)
            paragraphs.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 240, line: 260 },
                    children: runs,
                })
            )
            continue
        }

        // 5. Bullet List (- or * or •)
        if (/^[-*•]\s+/.test(line)) {
            const listText = line.replace(/^[-*•]\s+/, '')
            const runs = parseInlineMarkdown(docx, listText, 24)
            paragraphs.push(
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 80, after: 80, line: 276 },
                    indent: { left: 720 },
                    children: [
                        new TextRun({ text: '•  ', font: 'Times New Roman', size: 24, bold: true }),
                        ...runs,
                    ],
                })
            )
            continue
        }

        // 6. Numbered List
        const numMatch = line.match(/^(\d+\.)\s+(.+)$/)
        if (numMatch) {
            const numPrefix = numMatch[1]
            const listText = numMatch[2]
            const runs = parseInlineMarkdown(docx, listText, 24)
            paragraphs.push(
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 100, after: 100, line: 276 },
                    indent: { left: 720 },
                    children: [
                        new TextRun({ text: `${numPrefix}  `, font: 'Times New Roman', size: 24, bold: true }),
                        ...runs,
                    ],
                })
            )
            continue
        }

        // 7. Regular Body Paragraph
        const runs = parseInlineMarkdown(docx, line, 24)
        paragraphs.push(
            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 80, after: 160, line: 276 },
                children: runs,
            })
        )
    }

    return paragraphs
}

export async function backendExportDocx(_title: string, content: string): Promise<Blob> {
    const docx = await import('docx')
    const { Document, Packer, BorderStyle, PageBorderDisplay, PageBorderOffsetFrom } = docx
    const formattedParagraphs = convertMarkdownToDocxParagraphs(docx, content)

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440, // 1 inch
                            right: 1440,
                            bottom: 1440,
                            left: 1440,
                        },
                        borders: {
                            pageBorders: {
                                display: PageBorderDisplay.ALL_PAGES,
                                offsetFrom: PageBorderOffsetFrom.PAGE,
                            },
                            pageBorderTop: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                            pageBorderRight: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                            pageBorderBottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                            pageBorderLeft: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                        },
                    },
                },
                children: formattedParagraphs,
            },
        ],
    })

    return Packer.toBlob(doc)
}

export async function downloadDocx(content: string, filename: string = 'document') {
    const blob = await backendExportDocx(filename, content)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename.replace(/[^a-z0-9_-]/gi, '_')}.docx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

