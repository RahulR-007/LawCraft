-- LawCraft AI — Legal Knowledge Base Migration
-- Enables pgvector, creates legal clause library, law updates feed, and document history

-- ============================================================
-- 1. Enable pgvector extension (if not already enabled)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 2. Legal Clauses Library (RAG source)
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_clauses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jurisdiction TEXT NOT NULL,            -- 'IN', 'US', 'UK', 'EU'
    document_type TEXT NOT NULL,           -- 'contract', 'nda', 'employment', 'lease', 'loan'
    clause_category TEXT NOT NULL,         -- 'governing_law', 'termination', 'indemnity', etc.
    clause_title TEXT NOT NULL,
    clause_text TEXT NOT NULL,
    legal_source TEXT,                     -- 'Indian Contract Act 1872, Section 10'
    last_verified DATE NOT NULL DEFAULT CURRENT_DATE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    embedding VECTOR(1536),                -- pgvector for semantic search
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clauses_jurisdiction_type
    ON legal_clauses (jurisdiction, document_type);
CREATE INDEX IF NOT EXISTS idx_clauses_category
    ON legal_clauses (clause_category);
CREATE INDEX IF NOT EXISTS idx_clauses_mandatory
    ON legal_clauses (is_mandatory);

-- ============================================================
-- 3. Government Law Updates Feed
-- ============================================================
CREATE TABLE IF NOT EXISTS law_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jurisdiction TEXT NOT NULL,
    source_url TEXT NOT NULL,              -- Government gazette URL
    law_title TEXT NOT NULL,
    law_category TEXT NOT NULL,
    summary TEXT NOT NULL,
    full_text TEXT,
    effective_date DATE,
    published_date DATE NOT NULL,
    impact_areas TEXT[],                   -- {'contract', 'employment', 'tax'}
    status TEXT DEFAULT 'active',          -- 'active', 'superseded', 'repealed'
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_law_updates_jurisdiction
    ON law_updates (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_law_updates_status
    ON law_updates (status);
CREATE INDEX IF NOT EXISTS idx_law_updates_published
    ON law_updates (published_date DESC);

-- ============================================================
-- 4. Generated Documents (per-user, secured with RLS)
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    input_params JSONB NOT NULL,           -- Structured form data
    generated_content TEXT NOT NULL,
    clauses_used UUID[],                   -- References to legal_clauses
    compliance_score NUMERIC(5,2),
    risk_flags JSONB DEFAULT '[]',
    docx_storage_path TEXT,                -- Supabase Storage path
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_docs_user
    ON generated_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_type
    ON generated_documents (document_type);
CREATE INDEX IF NOT EXISTS idx_generated_docs_created
    ON generated_documents (created_at DESC);

-- ============================================================
-- 5. Profiles Table (Create if not exists & User Signup Trigger)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    fullname TEXT,
    plan_name TEXT DEFAULT 'Free',
    tokens INTEGER DEFAULT 20,
    preferred_jurisdiction TEXT DEFAULT 'IN',
    documents_generated INTEGER DEFAULT 0,
    last_generation_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columns safety check for existing profiles tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_jurisdiction TEXT DEFAULT 'IN';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS documents_generated INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_generation_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 20;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Free';

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Automatic profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, fullname, plan_name, tokens)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'fullname', NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'plan_name', 'Free'),
        COALESCE((NEW.raw_user_meta_data->>'tokens')::INTEGER, 20)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. Row Level Security
-- ============================================================

-- Legal clauses: public read (it's legal knowledge, not sensitive)
ALTER TABLE legal_clauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read legal clauses"
    ON legal_clauses FOR SELECT USING (true);

-- Law updates: public read
ALTER TABLE law_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read law updates"
    ON law_updates FOR SELECT USING (true);

-- Generated documents: users can only see/create their own
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own documents"
    ON generated_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own documents"
    ON generated_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents"
    ON generated_documents FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 7. Seed Initial Legal Clauses (Indian Jurisdiction)
-- ============================================================

-- CONTRACT clauses (India)
INSERT INTO legal_clauses (jurisdiction, document_type, clause_category, clause_title, clause_text, legal_source, is_mandatory) VALUES

-- Governing Law
('IN', 'contract', 'governing_law', 'Governing Law & Jurisdiction',
'This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any disputes arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts located in [City], [State], India.',
'Indian Contract Act 1872; Code of Civil Procedure 1908, Section 20', TRUE),

-- Severability
('IN', 'contract', 'severability', 'Severability',
'If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such invalidity, illegality, or unenforceability shall not affect the validity of the remaining provisions, which shall continue in full force and effect. The parties agree to negotiate in good faith a replacement provision that most closely approximates the intent of the invalid provision.',
'Indian Contract Act 1872, Section 24', TRUE),

-- Entire Agreement
('IN', 'contract', 'entire_agreement', 'Entire Agreement',
'This Agreement constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, warranties, commitments, offers, contracts and understandings, whether written or oral, relating to such subject matter. No amendment or modification of this Agreement shall be effective unless made in writing and signed by both Parties.',
'Indian Contract Act 1872, Sections 92-93; Indian Evidence Act 1872', TRUE),

-- Force Majeure
('IN', 'contract', 'force_majeure', 'Force Majeure',
'Neither Party shall be liable for any failure or delay in performing their obligations under this Agreement if such failure or delay results from circumstances beyond the reasonable control of that Party, including but not limited to: acts of God, natural disasters, epidemics, pandemics, war, terrorism, riots, fire, flood, earthquake, governmental actions, strikes, or lockouts. The affected Party shall promptly notify the other Party in writing of the force majeure event and its expected duration.',
'Indian Contract Act 1872, Section 56 (Doctrine of Frustration)', FALSE),

-- Confidentiality
('IN', 'contract', 'confidentiality', 'Confidentiality',
'Each Party agrees to maintain strict confidentiality with respect to all Confidential Information received from the other Party. "Confidential Information" means any non-public information, whether written, oral, or electronic, disclosed by one Party to the other in connection with this Agreement. This obligation of confidentiality shall survive the termination of this Agreement for a period of three (3) years.',
'Indian Contract Act 1872; Information Technology Act 2000, Section 72A', FALSE),

-- Indemnification
('IN', 'contract', 'indemnification', 'Indemnification',
'Each Party (the "Indemnifying Party") shall indemnify, defend, and hold harmless the other Party and its officers, directors, employees, agents, and successors (the "Indemnified Parties") from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys'' fees) arising out of or resulting from: (a) any breach of this Agreement by the Indemnifying Party; (b) any negligent or wrongful act or omission of the Indemnifying Party; or (c) any violation of applicable law by the Indemnifying Party.',
'Indian Contract Act 1872, Section 124-125', FALSE),

-- Termination
('IN', 'contract', 'termination', 'Termination',
'Either Party may terminate this Agreement: (a) by giving thirty (30) days'' prior written notice to the other Party; (b) immediately upon written notice if the other Party commits a material breach and fails to cure such breach within fifteen (15) days of receiving written notice; or (c) immediately if the other Party becomes insolvent, files for bankruptcy, or has a receiver appointed. Upon termination, all rights and obligations shall cease except those that by their nature are intended to survive termination.',
'Indian Contract Act 1872, Sections 62-67; Specific Relief Act 1963', TRUE),

-- Dispute Resolution
('IN', 'contract', 'dispute_resolution', 'Dispute Resolution',
'Any dispute, controversy, or claim arising out of or relating to this Agreement shall first be attempted to be resolved through amicable negotiations between the Parties. If the dispute cannot be resolved within thirty (30) days of written notice, it shall be referred to and finally resolved by arbitration in accordance with the Arbitration and Conciliation Act, 1996, as amended. The arbitration shall be conducted by a sole arbitrator mutually agreed upon by the Parties. The seat of arbitration shall be [City], India. The language of arbitration shall be English.',
'Arbitration and Conciliation Act 1996; Indian Contract Act 1872', TRUE),

-- Notices
('IN', 'contract', 'notices', 'Notices',
'All notices, requests, demands, and other communications under this Agreement shall be in writing and shall be deemed to have been duly given: (a) when delivered personally; (b) when sent by registered post or speed post with acknowledgment due; (c) when sent by email with delivery confirmation; or (d) three (3) business days after being sent by courier service to the addresses specified in this Agreement. Either Party may change its address for notices by giving written notice to the other Party.',
'Indian Contract Act 1872; Information Technology Act 2000, Section 4', FALSE),

-- Stamp Duty
('IN', 'contract', 'stamp_duty', 'Stamp Duty & Registration',
'The Parties agree that this Agreement shall be duly stamped as per the applicable stamp duty rates prescribed under the Indian Stamp Act, 1899, and the relevant State Stamp Act. The cost of stamp duty shall be borne equally by both Parties, or as otherwise agreed in writing. If this Agreement is required to be registered under the Indian Registration Act, 1908, the Parties shall cooperate to ensure timely registration.',
'Indian Stamp Act 1899; Indian Registration Act 1908', FALSE);

-- NDA clauses (India)
INSERT INTO legal_clauses (jurisdiction, document_type, clause_category, clause_title, clause_text, legal_source, is_mandatory) VALUES

('IN', 'nda', 'definition', 'Definition of Confidential Information',
'"Confidential Information" means any and all non-public, proprietary, or confidential information disclosed by the Disclosing Party to the Receiving Party, whether orally, in writing, electronically, or by any other means, including but not limited to: (a) trade secrets, inventions, patents, copyrights, and other intellectual property; (b) business plans, strategies, and financial information; (c) customer lists, vendor information, and marketing data; (d) technical specifications, designs, algorithms, and source code; (e) employee information and HR policies; and (f) any information marked as "Confidential" or that a reasonable person would understand to be confidential given the nature of the information and circumstances of disclosure.',
'Indian Contract Act 1872; Information Technology Act 2000', TRUE),

('IN', 'nda', 'exclusions', 'Exclusions from Confidential Information',
'Confidential Information shall not include information that: (a) was publicly known at the time of disclosure or subsequently became publicly known through no fault of the Receiving Party; (b) was known to the Receiving Party prior to disclosure, as evidenced by written records; (c) was independently developed by the Receiving Party without reference to the Confidential Information; (d) was lawfully received from a third party without restriction on disclosure; or (e) is required to be disclosed by law, regulation, or court order, provided that the Receiving Party gives prompt written notice to the Disclosing Party and cooperates with the Disclosing Party''s efforts to seek a protective order.',
'Indian Contract Act 1872; Indian Evidence Act 1872', TRUE),

('IN', 'nda', 'obligations', 'Obligations of Receiving Party',
'The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; (b) not disclose the Confidential Information to any third party without the prior written consent of the Disclosing Party; (c) use the Confidential Information solely for the purpose of [Purpose]; (d) take all reasonable precautions to prevent unauthorized disclosure, which shall be no less than the measures taken to protect its own confidential information; (e) limit access to Confidential Information to its employees, agents, and contractors who have a need to know and who are bound by confidentiality obligations no less restrictive than those contained herein.',
'Indian Contract Act 1872, Section 27; Information Technology Act 2000, Section 72A', TRUE),

('IN', 'nda', 'return_of_information', 'Return & Destruction of Information',
'Upon the expiration or termination of this Agreement, or upon the written request of the Disclosing Party, the Receiving Party shall promptly: (a) return all copies, reproductions, and summaries of Confidential Information to the Disclosing Party; or (b) destroy all Confidential Information in its possession and certify such destruction in writing. Notwithstanding the foregoing, the Receiving Party may retain one archival copy solely for legal compliance purposes, subject to continuing confidentiality obligations.',
'Information Technology Act 2000; Indian Contract Act 1872', TRUE);

-- EMPLOYMENT clauses (India)
INSERT INTO legal_clauses (jurisdiction, document_type, clause_category, clause_title, clause_text, legal_source, is_mandatory) VALUES

('IN', 'employment', 'appointment', 'Appointment & Position',
'The Employer hereby appoints the Employee to the position of [Job Title] in the [Department] department, and the Employee hereby accepts such appointment. The Employee shall report to [Reporting Manager/Designation]. The Employee''s primary place of work shall be [Office Address], subject to reasonable transfers as may be required by the Employer from time to time.',
'Industrial Employment (Standing Orders) Act 1946; Indian Contract Act 1872', TRUE),

('IN', 'employment', 'compensation', 'Compensation & Benefits',
'The Employee shall receive a gross annual compensation of ₹[Amount] (Rupees [Amount in Words] only), payable in twelve (12) equal monthly instalments. The compensation structure shall be as detailed in Annexure A. The Employer shall deduct applicable taxes at source including income tax under the Income Tax Act, 1961, and contributions to the Employees'' Provident Fund under the Employees'' Provident Funds and Miscellaneous Provisions Act, 1952, and Employees'' State Insurance under the ESI Act, 1948, as applicable.',
'Payment of Wages Act 1936; Minimum Wages Act 1948; EPF Act 1952; ESI Act 1948; Income Tax Act 1961', TRUE),

('IN', 'employment', 'leave', 'Leave Policy',
'The Employee shall be entitled to leave as per the Employer''s leave policy and in compliance with applicable labor laws, including: (a) Earned Leave / Privilege Leave as prescribed under the applicable Shops and Establishments Act; (b) Sick Leave / Medical Leave; (c) Casual Leave; (d) Maternity Leave as per the Maternity Benefit Act, 1961 (as amended in 2017), providing 26 weeks of paid leave for women employees; (e) Paternity Leave as per company policy; and (f) Public Holidays as notified by the Central/State Government.',
'Factories Act 1948; Shops and Establishments Act; Maternity Benefit Act 1961', TRUE),

('IN', 'employment', 'termination', 'Termination of Employment',
'Either Party may terminate this employment: (a) By the Employee: by providing [Notice Period] days'' prior written notice; (b) By the Employer: by providing [Notice Period] days'' prior written notice or payment of salary in lieu of notice; (c) The Employer may terminate immediately for cause, including but not limited to: misconduct, fraud, breach of confidentiality, conviction of a criminal offence, or habitual neglect of duty. Upon termination, the Employee shall return all property, documents, and Confidential Information belonging to the Employer.',
'Industrial Disputes Act 1947; Industrial Employment (Standing Orders) Act 1946; Indian Contract Act 1872', TRUE);

-- LOAN clauses (India)
INSERT INTO legal_clauses (jurisdiction, document_type, clause_category, clause_title, clause_text, legal_source, is_mandatory) VALUES

('IN', 'loan', 'principal', 'Principal & Interest',
'The Lender hereby agrees to lend, and the Borrower hereby agrees to borrow, the principal sum of ₹[Amount] (Rupees [Amount in Words] only) (the "Loan"). The Loan shall bear simple/compound interest at the rate of [Rate]% per annum, calculated on the outstanding principal balance. Interest shall accrue from the date of disbursement and shall be payable [monthly/quarterly/annually/at maturity].',
'Indian Contract Act 1872, Section 2(d); Negotiable Instruments Act 1881', TRUE),

('IN', 'loan', 'repayment', 'Repayment Schedule',
'The Borrower shall repay the Loan together with accrued interest in [Number] equal monthly instalments of ₹[EMI Amount] each, commencing from [First EMI Date]. Each instalment shall be due and payable on the [Day]th day of each calendar month. Payments shall be made by [mode of payment] to the Lender''s designated bank account.',
'Indian Contract Act 1872; SARFAESI Act 2002', TRUE),

('IN', 'loan', 'default', 'Default & Remedies',
'The following shall constitute an Event of Default: (a) failure to pay any instalment within [Grace Period] days of the due date; (b) breach of any material term of this Agreement; (c) the Borrower becoming insolvent or filing for bankruptcy; (d) any representation or warranty made by the Borrower proving to be false or misleading. Upon an Event of Default, the Lender may: (i) declare the entire outstanding amount immediately due and payable; (ii) charge a default interest rate of [Default Rate]% per annum on overdue amounts; (iii) exercise any rights over the collateral/security, if any; and (iv) pursue all remedies available under applicable law.',
'Indian Contract Act 1872, Sections 73-75; SARFAESI Act 2002; Insolvency and Bankruptcy Code 2016', TRUE);

-- LEASE clauses (India)
INSERT INTO legal_clauses (jurisdiction, document_type, clause_category, clause_title, clause_text, legal_source, is_mandatory) VALUES

('IN', 'lease', 'property', 'Property Description & Use',
'The Landlord hereby leases to the Tenant the property located at [Full Address], more particularly described as [Property Description including area in sq. ft., floor, building name] (the "Premises"). The Premises shall be used solely for [residential/commercial/office] purposes. The Tenant shall not use the Premises for any unlawful purpose or in any manner that causes nuisance to neighboring occupants.',
'Transfer of Property Act 1882, Section 105; Registration Act 1908', TRUE),

('IN', 'lease', 'rent', 'Rent & Payment Terms',
'The Tenant shall pay a monthly rent of ₹[Amount] (Rupees [Amount in Words] only) payable on or before the [Day]th day of each calendar month. Rent shall be paid by [mode of payment] to the Landlord''s designated bank account. A rent escalation of [Percentage]% shall apply at the end of each [11/12/24] month period. In case of delay in payment beyond [Grace Period] days, a late fee of ₹[Late Fee] per day shall be applicable.',
'Transfer of Property Act 1882; State Rent Control Act', TRUE),

('IN', 'lease', 'security_deposit', 'Security Deposit',
'The Tenant shall pay a security deposit of ₹[Amount] (Rupees [Amount in Words] only) equivalent to [Number] months'' rent upon execution of this Agreement. The security deposit shall be refundable upon termination of the lease, subject to deductions for: (a) unpaid rent or utilities; (b) damages to the Premises beyond normal wear and tear; and (c) any other amounts owed under this Agreement. The security deposit shall be refunded within [30/60] days of the Tenant vacating the Premises.',
'Transfer of Property Act 1882; State Rent Control Act', TRUE),

('IN', 'lease', 'maintenance', 'Maintenance & Repairs',
'The Landlord shall be responsible for structural repairs and major maintenance of the Premises including the roof, external walls, plumbing, and electrical infrastructure. The Tenant shall be responsible for day-to-day maintenance, minor repairs, and upkeep of the interior of the Premises. The Tenant shall not make any structural alterations or additions to the Premises without the prior written consent of the Landlord.',
'Transfer of Property Act 1882, Sections 108(c) and 108(d)', TRUE);

-- ============================================================
-- 8. Support Tickets Table
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can create support tickets') THEN
        CREATE POLICY "Anyone can create support tickets" ON support_tickets FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own support tickets') THEN
        CREATE POLICY "Users can view own support tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

