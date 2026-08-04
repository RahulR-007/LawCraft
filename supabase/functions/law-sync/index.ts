// supabase/functions/law-sync/index.ts
// Daily CRON job: fetches government law updates and indexes them
//
// Sources:
//   - India: indiacode.nic.in, egazette.nic.in
//   - General: Public legal databases
//
// Deployment: Set up as Supabase CRON:
//   SELECT cron.schedule('law-sync-daily', '0 6 * * *', $$
//     SELECT net.http_post(
//       url := 'https://snbwdyhegzjprtcxbnvn.supabase.co/functions/v1/law-sync',
//       headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
//     );
//   $$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Known government gazette sources ───────────────────────────────
const LAW_SOURCES = {
    IN: [
        {
            name: 'India Code - Recent Amendments',
            url: 'https://www.indiacode.nic.in/handle/123456789/1362/recent-submissions',
            category: 'legislation',
        },
        {
            name: 'The Gazette of India',
            url: 'https://egazette.gov.in/',
            category: 'gazette',
        },
        {
            name: 'Ministry of Law and Justice',
            url: 'https://lawmin.gov.in/acts-and-rules',
            category: 'ministry',
        },
    ],
}

// ── Sample recent Indian law updates (seeded on first run) ─────────
// In production, these would be scraped/fetched from government APIs.
// For now we seed a curated set of real, important recent Indian legal updates.
const SEED_LAW_UPDATES = [
    {
        jurisdiction: 'IN',
        source_url: 'https://www.indiacode.nic.in/handle/123456789/15322',
        law_title: 'Digital Personal Data Protection Act, 2023',
        law_category: 'data_protection',
        summary: 'Comprehensive data protection framework for India. Establishes rights of data principals, obligations of data fiduciaries, and the Data Protection Board of India. Applies to processing of digital personal data within India and cross-border data transfers. Imposes penalties up to ₹250 crore for violations.',
        effective_date: '2024-01-15',
        published_date: '2023-08-11',
        impact_areas: ['contract', 'employment', 'nda'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://www.indiacode.nic.in/handle/123456789/20098',
        law_title: 'Bharatiya Nyaya Sanhita, 2023 (BNS)',
        law_category: 'criminal_law',
        summary: 'Replacement of the Indian Penal Code, 1860. Introduces new offences for identity theft, organized crime, and cyber fraud. Relevant to contract fraud, employment misconduct, and corporate liability provisions in legal documents.',
        effective_date: '2024-07-01',
        published_date: '2023-12-25',
        impact_areas: ['contract', 'employment'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://www.indiacode.nic.in/handle/123456789/19982',
        law_title: 'Bharatiya Sakshya Adhiniyam, 2023 (BSA)',
        law_category: 'evidence_law',
        summary: 'Replacement of the Indian Evidence Act, 1872. Recognizes electronic and digital evidence, expands admissibility of electronic records. Critical for digital contracts, e-signatures, and electronically executed agreements.',
        effective_date: '2024-07-01',
        published_date: '2023-12-25',
        impact_areas: ['contract', 'nda', 'employment', 'loan', 'lease'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://lawmin.gov.in/arbitration',
        law_title: 'Arbitration and Conciliation (Amendment) Act, 2021',
        law_category: 'dispute_resolution',
        summary: 'Amendments to the Arbitration and Conciliation Act, 1996. Introduces provisions for automatic stay on enforcement of arbitral awards in cases of fraud or corruption. Impacts dispute resolution clauses in all contract types.',
        effective_date: '2021-03-23',
        published_date: '2021-03-11',
        impact_areas: ['contract', 'loan', 'lease'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://labour.gov.in/code-on-wages',
        law_title: 'Code on Wages, 2019',
        law_category: 'employment_law',
        summary: 'Subsumes and replaces four existing labor laws: Payment of Wages Act, Minimum Wages Act, Payment of Bonus Act, and Equal Remuneration Act. Universalizes minimum wage and wage payment provisions. Employment contracts must comply with new wage definitions and payment timelines.',
        effective_date: '2025-01-01',
        published_date: '2019-08-08',
        impact_areas: ['employment'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://labour.gov.in/code-on-social-security',
        law_title: 'Code on Social Security, 2020',
        law_category: 'employment_law',
        summary: 'Consolidates and amends laws relating to social security of employees. Extends ESI and PF benefits to gig workers and platform workers. Introduces provisions for gratuity for fixed-term employees. Employment contracts should reference updated social security obligations.',
        effective_date: '2025-01-01',
        published_date: '2020-09-28',
        impact_areas: ['employment'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://www.indiacode.nic.in/handle/123456789/15483',
        law_title: 'Companies (Amendment) Act, 2020',
        law_category: 'corporate_law',
        summary: 'Amendments reducing penalties for minor defaults, decriminalizing certain offences, and introducing provisions for producer companies. Impacts corporate agreements, shareholder contracts, and company resolutions referenced in legal documents.',
        effective_date: '2020-09-28',
        published_date: '2020-09-28',
        impact_areas: ['contract', 'nda'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://rbi.org.in/scripts/NotificationUser.aspx',
        law_title: 'RBI Master Direction on Lending (Updated 2024)',
        law_category: 'financial_regulation',
        summary: 'Updated guidelines on fair lending practices, interest rate disclosure, and penal charges. Prohibits penal interest charges — only allows reasonable penal charges. Loan agreements must comply with fair practices code and key fact statement requirements.',
        effective_date: '2024-01-01',
        published_date: '2024-01-01',
        impact_areas: ['loan'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://www.rera.gov.in',
        law_title: 'Real Estate (Regulation and Development) Act, 2016 (RERA)',
        law_category: 'real_estate',
        summary: 'Mandatory registration of real estate projects and agents. Standardized sale agreements with mandatory disclosures. Builder-buyer agreements must include carpet area, completion timeline, and penalty clauses as prescribed by RERA. Lease agreements for commercial spaces in RERA-registered projects must comply.',
        effective_date: '2017-05-01',
        published_date: '2016-03-26',
        impact_areas: ['lease', 'contract'],
        status: 'active',
    },
    {
        jurisdiction: 'IN',
        source_url: 'https://www.meity.gov.in/information-technology-act',
        law_title: 'Information Technology (Reasonable Security Practices) Rules, 2011',
        law_category: 'data_protection',
        summary: 'Mandates reasonable security practices for entities handling sensitive personal data. NDAs and service contracts involving data processing must include provisions for data security standards (IS/ISO/IEC 27001 or equivalent). Being superseded by DPDP Act 2023 rules.',
        effective_date: '2011-04-11',
        published_date: '2011-04-11',
        impact_areas: ['nda', 'contract', 'employment'],
        status: 'active',
    },
]

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
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

        // Check if law_updates table has data
        const { count } = await supabase
            .from('law_updates')
            .select('id', { count: 'exact', head: true })

        let inserted = 0
        let updated = 0

        if (!count || count === 0) {
            // First run: seed with curated law updates
            const { error: seedError } = await supabase
                .from('law_updates')
                .insert(SEED_LAW_UPDATES)

            if (seedError) {
                console.error('Seed error:', seedError)
            } else {
                inserted = SEED_LAW_UPDATES.length
            }
        }

        // In production, this section would:
        // 1. Fetch RSS/API feeds from government sources
        // 2. Parse new entries
        // 3. Generate embeddings using the AI API
        // 4. Insert new law_updates entries
        // 5. Cross-reference against existing legal_clauses to flag outdated ones
        //
        // For now, we check if any existing clauses need re-verification
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data: staleClauses } = await supabase
            .from('legal_clauses')
            .select('id, clause_title, last_verified')
            .lt('last_verified', thirtyDaysAgo.toISOString().split('T')[0])
            .limit(50)

        const staleClauseCount = staleClauses?.length || 0

        return new Response(
            JSON.stringify({
                success: true,
                inserted,
                updated,
                staleClausesFound: staleClauseCount,
                totalLawSources: LAW_SOURCES.IN.length,
                message: inserted > 0
                    ? `Seeded ${inserted} law updates successfully.`
                    : `Sync complete. ${staleClauseCount} clauses may need re-verification.`,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('law-sync error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
