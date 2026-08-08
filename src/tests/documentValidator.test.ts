import { describe, it, expect } from 'vitest'
import {
    validateDocumentForm,
    getPartyLabels,
    JURISDICTION_STATES,
    type DocumentFormInput,
} from '../lib/documentValidator'

describe('Document Input Validator Unit Tests', () => {

    describe('1. validateDocumentForm Validation Rules', () => {
        it('should return errors for empty form input', () => {
            const emptyInput: DocumentFormInput = {
                documentType: '',
                jurisdiction: '',
                parties: [],
                customDetails: '',
            }
            const errors = validateDocumentForm(emptyInput)
            expect(errors.length).toBeGreaterThan(0)
            expect(errors.some(e => e.field === 'documentType')).toBe(true)
            expect(errors.some(e => e.field === 'jurisdiction')).toBe(true)
            expect(errors.some(e => e.field === 'parties')).toBe(true)
        })

        it('should pass validation for complete valid contract input', () => {
            const validContract: DocumentFormInput = {
                documentType: 'contract',
                jurisdiction: 'IN',
                jurisdictionState: 'Maharashtra',
                parties: [
                    { role: 'party1', name: 'Acme Corp', address: 'Mumbai' },
                    { role: 'party2', name: 'Beta Ltd', address: 'Delhi' },
                ],
                customDetails: 'Comprehensive software development and maintenance agreement for 12 months.',
                amount: '₹500,000',
                date: '2026-08-07',
                duration: '12 months',
            }
            const errors = validateDocumentForm(validContract)
            expect(errors.length).toBe(0)
        })

        it('should require minimum custom details length', () => {
            const shortDetailsInput: DocumentFormInput = {
                documentType: 'nda',
                jurisdiction: 'IN',
                parties: [
                    { role: 'disclosing_party', name: 'Alice' },
                    { role: 'receiving_party', name: 'Bob' },
                ],
                customDetails: 'Short',
            }
            const errors = validateDocumentForm(shortDetailsInput)
            expect(errors.some(e => e.field === 'customDetails')).toBe(true)
        })
    })

    describe('2. Party Labels Generator', () => {
        it('should return correct party labels for NDA', () => {
            const labels = getPartyLabels('nda')
            expect(labels.disclosing_party).toBe('Disclosing Party')
            expect(labels.receiving_party).toBe('Receiving Party')
        })

        it('should return correct party labels for Employment', () => {
            const labels = getPartyLabels('employment')
            expect(labels.employer).toBe('Employer')
            expect(labels.employee).toBe('Employee')
        })
    })

    describe('3. Jurisdiction States Data Integrity', () => {
        it('should include major Indian states', () => {
            const inStates = JURISDICTION_STATES['IN']
            expect(inStates).toContain('Maharashtra')
            expect(inStates).toContain('Delhi')
            expect(inStates).toContain('Karnataka')
        })

        it('should include major US states', () => {
            const usStates = JURISDICTION_STATES['US']
            expect(usStates).toContain('California')
            expect(usStates).toContain('New York')
            expect(usStates).toContain('Delaware')
        })
    })
})
