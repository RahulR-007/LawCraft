// supabase/functions/ai-generate-document/index.ts
// RAG-powered structured legal document generation pipeline
//
// Flow:
//   1. Authenticate user
//   2. Validate structured input (parties, jurisdiction, doc type)
//   3. Retrieve relevant legal clauses from pgvector (RAG)
//   4. Build grounded prompt with vetted clause examples
//   5. Call LLM with context
//   6. Validate generated content server-side
//   7. Calculate compliance score
//   8. Flag risks
//   9. Store in generated_documents table
//  10. Decrement tokens & return

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// ── Types ──────────────────────────────────────────────────────────
interface DocumentInput {
    documentType: string          // 'contract', 'nda', 'employment', 'loan', 'lease'
    documentSubType?: string      // 'services_agreement', 'mutual_nda', etc.
    jurisdiction: string          // 'IN', 'US', 'UK', 'EU'
    jurisdictionState?: string    // 'Maharashtra', 'California', etc.
    parties: PartyInfo[]
    customDetails: string         // User's free-text description
    selectedClauses?: string[]    // IDs of selected optional clauses
    amount?: string
    date?: string
    duration?: string
}

interface PartyInfo {
    role: string     // 'party1', 'employer', 'lender', 'landlord', etc.
    name: string
    address?: string
    designation?: string
}

interface ComplianceResult {
    score: number
    maxScore: number
    percentage: number
    missingMandatory: string[]
    presentMandatory: string[]
    riskFlags: RiskFlag[]
}

interface RiskFlag {
    severity: 'info' | 'warning' | 'critical'
    clause: string
    reason: string
    recommendation: string
}

// ── Mandatory elements per document type ───────────────────────────
const MANDATORY_ELEMENTS: Record<string, string[]> = {
    contract: [
        'parties identification', 'effective date', 'consideration',
        'terms and conditions', 'termination clause', 'dispute resolution',
        'governing law', 'severability', 'entire agreement', 'signatures'
    ],
    nda: [
        'parties identification', 'confidential information definition',
        'obligations of receiving party', 'exclusions from confidentiality',
        'duration', 'return of information', 'governing law', 'signatures'
    ],
    employment: [
        'employee identification', 'employer identification', 'position and duties',
        'compensation', 'working hours', 'leave policy', 'termination',
        'confidentiality', 'dispute resolution', 'governing law', 'signatures'
    ],
    loan: [
        'lender identification', 'borrower identification', 'principal amount',
        'interest rate', 'repayment schedule', 'default provisions',
        'prepayment terms', 'governing law', 'signatures'
    ],
    lease: [
        'landlord identification', 'tenant identification', 'property description',
        'lease term', 'rent amount', 'security deposit',
        'maintenance responsibilities', 'termination', 'governing law', 'signatures'
    ],
}

// ── Jurisdiction-specific requirements ─────────────────────────────
const JURISDICTION_REQUIREMENTS: Record<string, string[]> = {
    'IN': [
        'Compliance with Indian Contract Act 1872',
        'Indian Stamp Act provisions where applicable',
        'Arbitration and Conciliation Act 1996 for dispute resolution',
        'Information Technology Act 2000 for electronic agreements',
    ],
    'US': [
        'Compliance with applicable state contract law',
        'UCC provisions where applicable',
        'Federal and state employment law compliance',
    ],
    'UK': [
        'Compliance with English contract law principles',
        'Consumer Rights Act 2015 where applicable',
        'Employment Rights Act 1996 for employment contracts',
    ],
    'EU': [
        'GDPR compliance for data handling clauses',
        'EU Consumer Protection Directives where applicable',
        'Rome I Regulation for cross-border contracts',
    ],
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── 1. Authenticate ────────────────────────────────────────
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 2. Check tokens ────────────────────────────────────────
        const { data: profile } = await supabase
            .from('profiles')
            .select('tokens, plan_name')
            .eq('id', user.id)
            .single()

        const currentTokens = profile?.tokens ?? user.user_metadata?.tokens ?? 0
        if (currentTokens <= 0) {
            return new Response(
                JSON.stringify({ error: 'No tokens remaining. Please upgrade your plan.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 3. Parse & validate input ──────────────────────────────
        const input: DocumentInput = await req.json()

        if (!input.documentType || !input.jurisdiction || !input.parties?.length || !input.customDetails) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: documentType, jurisdiction, parties, customDetails' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 4. RAG: Retrieve relevant legal clauses ────────────────
        // Query legal_clauses table for matching jurisdiction + document type
        const { data: relevantClauses } = await supabase
            .from('legal_clauses')
            .select('clause_title, clause_text, clause_category, legal_source, is_mandatory')
            .eq('jurisdiction', input.jurisdiction)
            .eq('document_type', input.documentType)
            .order('is_mandatory', { ascending: false })
            .limit(20)

        // Build clause context for the prompt
        const clauseContext = (relevantClauses || [])
            .map(c => `### ${c.clause_title} ${c.is_mandatory ? '(MANDATORY)' : '(RECOMMENDED)'}
${c.clause_text}
${c.legal_source ? `Source: ${c.legal_source}` : ''}`)
            .join('\n\n')

        // ── 5. Build structured prompt ─────────────────────────────
        const jurisdictionReqs = JURISDICTION_REQUIREMENTS[input.jurisdiction] || []
        const mandatoryElements = MANDATORY_ELEMENTS[input.documentType] || []

        const partiesDescription = input.parties
            .map(p => `${p.role}: ${p.name}${p.address ? `, Address: ${p.address}` : ''}${p.designation ? `, Designation: ${p.designation}` : ''}`)
            .join('\n')

        const structuredPrompt = `You are a senior legal document drafting specialist. Generate a comprehensive, professional ${input.documentType} document.

JURISDICTION: ${input.jurisdiction}${input.jurisdictionState ? ` — ${input.jurisdictionState}` : ''}

JURISDICTION-SPECIFIC REQUIREMENTS:
${jurisdictionReqs.map(r => `- ${r}`).join('\n')}

PARTIES:
${partiesDescription}

USER REQUIREMENTS:
${input.customDetails}

${input.amount ? `AMOUNT/VALUE: ${input.amount}` : ''}
${input.date ? `EFFECTIVE DATE: ${input.date}` : ''}
${input.duration ? `DURATION: ${input.duration}` : ''}

MANDATORY ELEMENTS (must ALL be included):
${mandatoryElements.map(e => `✓ ${e}`).join('\n')}

${clauseContext ? `REFERENCE LEGAL CLAUSES (use these as templates, adapt to the specific situation):
${clauseContext}` : ''}

DOCUMENT STRUCTURE:
- Use proper legal numbering (1., 1.1, 1.1.1)
- Include WHEREAS recitals/preamble
- Use defined terms consistently (e.g., "Party A" or "the Employer")
- Include all mandatory elements listed above
- Add appropriate jurisdiction-specific provisions
- Include signature blocks for all parties
- Use professional legal language throughout

FORMATTING:
- Use markdown headings (# for title, ## for sections, ### for subsections)
- Bold key defined terms on first use
- Separate sections clearly
- Include proper legal numbering

Generate the COMPLETE legal document now. Do not include meta-commentary or explanations — output ONLY the document text.`

        // ── 6. Call AI API ─────────────────────────────────────────
        const aiApiKey = Deno.env.get('AI_API_KEY')
        const aiBaseUrl = Deno.env.get('AI_BASE_URL') || 'https://aicredits.in/v1'
        const aiModel = Deno.env.get('AI_MODEL') || 'google/gemini-flash-latest'

        if (!aiApiKey) {
            return new Response(
                JSON.stringify({ error: 'AI API key not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Generate document (may need multiple calls for long documents)
        let fullDocument = ''
        let iteration = 0
        const maxIterations = 3

        while (iteration < maxIterations) {
            const userContent = iteration === 0
                ? structuredPrompt
                : `Continue the document from where you left off. Do not repeat any previous content. Continue generating the remaining sections.\n\nDOCUMENT SO FAR (last 2000 chars):\n${fullDocument.slice(-2000)}\n\nContinue from here:`

            const aiResponse = await fetch(`${aiBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiApiKey}`,
                },
                body: JSON.stringify({
                    model: aiModel,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional legal document drafting assistant. Output only the document content in clean markdown format. No meta-commentary.'
                        },
                        { role: 'user', content: userContent },
                    ],
                    stream: false,
                    temperature: 0.6,
                    max_tokens: 4096,
                    top_p: 0.9,
                }),
            })

            if (!aiResponse.ok) break

            const aiData = await aiResponse.json()
            const chunk = aiData.choices?.[0]?.message?.content ?? ''
            if (!chunk.trim()) break

            fullDocument = fullDocument ? `${fullDocument}\n\n${chunk}` : chunk
            iteration++

            // Check if document seems complete (has signatures section)
            const lowerDoc = fullDocument.toLowerCase()
            if (lowerDoc.includes('signature') && lowerDoc.includes('date:') && lowerDoc.includes('witness')) {
                break
            }
        }

        if (!fullDocument.trim()) {
            return new Response(
                JSON.stringify({ error: 'Failed to generate document content' }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 7. Compliance scoring ──────────────────────────────────
        const compliance = calculateCompliance(fullDocument, input.documentType, input.jurisdiction)

        // ── 8. Store document ──────────────────────────────────────
        const title = generateDocumentTitle(input)

        const { data: savedDoc, error: saveError } = await supabase
            .from('generated_documents')
            .insert({
                user_id: user.id,
                document_type: input.documentType,
                title,
                jurisdiction: input.jurisdiction,
                input_params: input,
                generated_content: fullDocument,
                clauses_used: (relevantClauses || []).map((c: any) => c.id).filter(Boolean),
                compliance_score: compliance.percentage,
                risk_flags: compliance.riskFlags,
            })
            .select('id')
            .single()

        // ── 9. Decrement tokens ────────────────────────────────────
        if (profile) {
            await supabase
                .from('profiles')
                .update({
                    tokens: Math.max(0, currentTokens - 1),
                    documents_generated: (profile as any).documents_generated ? (profile as any).documents_generated + 1 : 1,
                    last_generation_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
        }

        // ── 10. Return ─────────────────────────────────────────────
        return new Response(
            JSON.stringify({
                documentId: savedDoc?.id,
                content: fullDocument,
                title,
                compliance,
                clausesUsed: (relevantClauses || []).length,
                tokensRemaining: Math.max(0, currentTokens - 1),
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('ai-generate-document error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// ── Helper functions ───────────────────────────────────────────────

function calculateCompliance(
    content: string,
    documentType: string,
    jurisdiction: string
): ComplianceResult {
    const lower = content.toLowerCase()
    const mandatory = MANDATORY_ELEMENTS[documentType] || []
    const presentMandatory: string[] = []
    const missingMandatory: string[] = []
    const riskFlags: RiskFlag[] = []

    for (const element of mandatory) {
        const searchTerms = element.split(' ')
        const found = searchTerms.some(term => lower.includes(term.toLowerCase()))
        if (found) {
            presentMandatory.push(element)
        } else {
            missingMandatory.push(element)
        }
    }

    const score = presentMandatory.length
    const maxScore = mandatory.length
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100

    // Generate risk flags
    if (!lower.includes('governing law') && !lower.includes('jurisdiction')) {
        riskFlags.push({
            severity: 'critical',
            clause: 'Governing Law',
            reason: 'No governing law or jurisdiction clause found',
            recommendation: 'Add a governing law clause specifying which jurisdiction\'s laws apply to this agreement'
        })
    }

    if (!lower.includes('severability')) {
        riskFlags.push({
            severity: 'warning',
            clause: 'Severability',
            reason: 'No severability clause found',
            recommendation: 'Add a severability clause to protect the agreement if any provision is found invalid'
        })
    }

    if (!lower.includes('dispute') && !lower.includes('arbitration')) {
        riskFlags.push({
            severity: 'warning',
            clause: 'Dispute Resolution',
            reason: 'No dispute resolution mechanism specified',
            recommendation: 'Add a dispute resolution clause (arbitration or court jurisdiction)'
        })
    }

    if (!lower.includes('signature') && !lower.includes('sign')) {
        riskFlags.push({
            severity: 'critical',
            clause: 'Signatures',
            reason: 'No signature block found',
            recommendation: 'Add signature blocks for all parties with date fields'
        })
    }

    // Jurisdiction-specific flags
    if (jurisdiction === 'IN' && !lower.includes('stamp') && documentType === 'contract') {
        riskFlags.push({
            severity: 'info',
            clause: 'Stamp Duty',
            reason: 'No mention of stamp duty requirements',
            recommendation: 'Consider adding a stamp duty clause as required under the Indian Stamp Act'
        })
    }

    return { score, maxScore, percentage, missingMandatory, presentMandatory, riskFlags }
}

function generateDocumentTitle(input: DocumentInput): string {
    const typeNames: Record<string, string> = {
        contract: 'Contract Agreement',
        nda: 'Non-Disclosure Agreement',
        employment: 'Employment Contract',
        loan: 'Loan Agreement',
        lease: 'Lease Agreement',
    }
    const typeName = typeNames[input.documentType] || input.documentType
    const partyNames = input.parties.map(p => p.name).filter(Boolean).join(' & ')
    return partyNames ? `${typeName} — ${partyNames}` : typeName
}
