/**
 * Document Input Validator
 *
 * Client-side pre-validation before sending to the server.
 * Catches user errors early for better UX.
 */

export interface ValidationError {
    field: string
    message: string
}

export interface PartyInput {
    role: string
    name: string
    address?: string
    designation?: string
}

export interface DocumentFormInput {
    documentType: string
    jurisdiction: string
    jurisdictionState?: string
    parties: PartyInput[]
    customDetails: string
    amount?: string
    date?: string
    duration?: string
}

// ── Required fields per document type ──────────────────────────────
const REQUIRED_PARTY_ROLES: Record<string, string[]> = {
    contract: ['party1', 'party2'],
    nda: ['disclosing_party', 'receiving_party'],
    employment: ['employer', 'employee'],
    loan: ['lender', 'borrower'],
    lease: ['landlord', 'tenant'],
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    contract: 'Contract Agreement',
    nda: 'Non-Disclosure Agreement',
    employment: 'Employment Contract',
    loan: 'Loan Agreement',
    lease: 'Lease Agreement',
}

// ── Jurisdiction-specific requirements ─────────────────────────────
const JURISDICTION_STATES: Record<string, string[]> = {
    IN: [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
        'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
        'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
        'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
        'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
        'Delhi', 'Chandigarh', 'Puducherry',
    ],
    US: [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
        'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
        'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
        'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
        'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
        'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
        'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
        'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
    ],
    UK: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
    EU: [],
}

// ── Validation functions ───────────────────────────────────────────

export function validateDocumentForm(input: DocumentFormInput): ValidationError[] {
    const errors: ValidationError[] = []

    // Document type
    if (!input.documentType) {
        errors.push({ field: 'documentType', message: 'Please select a document type' })
    } else if (!DOCUMENT_TYPE_LABELS[input.documentType]) {
        errors.push({ field: 'documentType', message: 'Invalid document type selected' })
    }

    // Jurisdiction
    if (!input.jurisdiction) {
        errors.push({ field: 'jurisdiction', message: 'Please select a jurisdiction' })
    }

    // Parties
    if (!input.parties || input.parties.length === 0) {
        errors.push({ field: 'parties', message: 'At least one party is required' })
    } else {
        const requiredRoles = REQUIRED_PARTY_ROLES[input.documentType] || ['party1', 'party2']
        for (const role of requiredRoles) {
            const party = input.parties.find(p => p.role === role)
            if (!party || !party.name?.trim()) {
                const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                errors.push({
                    field: `parties.${role}`,
                    message: `${roleLabel} name is required`
                })
            }
        }

        // Validate party name format
        for (const party of input.parties) {
            if (party.name && party.name.trim().length < 2) {
                errors.push({
                    field: `parties.${party.role}`,
                    message: `${party.role.replace(/_/g, ' ')} name must be at least 2 characters`
                })
            }
            if (party.name && party.name.trim().length > 200) {
                errors.push({
                    field: `parties.${party.role}`,
                    message: `${party.role.replace(/_/g, ' ')} name is too long (max 200 characters)`
                })
            }
        }
    }

    // Description
    if (!input.customDetails?.trim()) {
        errors.push({ field: 'customDetails', message: 'Please provide a document description' })
    } else if (input.customDetails.trim().length < 20) {
        errors.push({
            field: 'customDetails',
            message: 'Description is too short. Please provide at least 20 characters of detail.'
        })
    } else if (input.customDetails.trim().length > 5000) {
        errors.push({
            field: 'customDetails',
            message: 'Description is too long (max 5000 characters)'
        })
    }

    // Amount validation (if provided)
    if (input.amount) {
        const cleanAmount = input.amount.replace(/[₹$€£,\s]/g, '')
        if (isNaN(Number(cleanAmount)) || Number(cleanAmount) <= 0) {
            errors.push({ field: 'amount', message: 'Please enter a valid positive amount' })
        }
    }

    // Date validation (if provided)
    if (input.date) {
        const dateObj = new Date(input.date)
        if (isNaN(dateObj.getTime())) {
            errors.push({ field: 'date', message: 'Please enter a valid date' })
        }
    }

    // Duration validation (if provided)
    if (input.duration) {
        const durationLower = input.duration.toLowerCase()
        const hasNumber = /\d/.test(input.duration)
        const hasUnit = /(?:day|week|month|year|yr|mo|wk)/i.test(durationLower)
        if (!hasNumber && !hasUnit) {
            errors.push({
                field: 'duration',
                message: 'Please specify duration (e.g., "12 months", "2 years", "30 days")'
            })
        }
    }

    return errors
}

// ── Exported constants ─────────────────────────────────────────────
export {
    REQUIRED_PARTY_ROLES,
    DOCUMENT_TYPE_LABELS,
    JURISDICTION_STATES,
}

/**
 * Get party role labels for a document type
 */
export function getPartyLabels(documentType: string): Record<string, string> {
    switch (documentType) {
        case 'contract':
            return { party1: 'First Party', party2: 'Second Party' }
        case 'nda':
            return { disclosing_party: 'Disclosing Party', receiving_party: 'Receiving Party' }
        case 'employment':
            return { employer: 'Employer', employee: 'Employee' }
        case 'loan':
            return { lender: 'Lender', borrower: 'Borrower' }
        case 'lease':
            return { landlord: 'Landlord', tenant: 'Tenant' }
        default:
            return { party1: 'Party 1', party2: 'Party 2' }
    }
}

/**
 * Get additional fields required for a document type
 */
export function getAdditionalFields(documentType: string): Array<{
    name: string
    label: string
    type: 'text' | 'number' | 'date'
    required: boolean
    placeholder: string
}> {
    switch (documentType) {
        case 'loan':
            return [
                { name: 'amount', label: 'Loan Amount (₹)', type: 'number', required: true, placeholder: 'e.g., 500000' },
                { name: 'date', label: 'Disbursement Date', type: 'date', required: true, placeholder: '' },
                { name: 'duration', label: 'Loan Tenure', type: 'text', required: true, placeholder: 'e.g., 24 months' },
            ]
        case 'lease':
            return [
                { name: 'amount', label: 'Monthly Rent (₹)', type: 'number', required: true, placeholder: 'e.g., 25000' },
                { name: 'date', label: 'Lease Start Date', type: 'date', required: true, placeholder: '' },
                { name: 'duration', label: 'Lease Duration', type: 'text', required: true, placeholder: 'e.g., 11 months' },
            ]
        case 'employment':
            return [
                { name: 'amount', label: 'Annual CTC (₹)', type: 'number', required: false, placeholder: 'e.g., 1200000' },
                { name: 'date', label: 'Joining Date', type: 'date', required: true, placeholder: '' },
            ]
        case 'contract':
            return [
                { name: 'amount', label: 'Contract Value (₹)', type: 'number', required: false, placeholder: 'e.g., 100000' },
                { name: 'date', label: 'Effective Date', type: 'date', required: false, placeholder: '' },
                { name: 'duration', label: 'Contract Duration', type: 'text', required: false, placeholder: 'e.g., 12 months' },
            ]
        case 'nda':
            return [
                { name: 'date', label: 'Effective Date', type: 'date', required: false, placeholder: '' },
                { name: 'duration', label: 'Confidentiality Period', type: 'text', required: false, placeholder: 'e.g., 3 years' },
            ]
        default:
            return []
    }
}
