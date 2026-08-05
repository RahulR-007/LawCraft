import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
    Box,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    SimpleGrid,
    FormControl,
    FormLabel,
    FormErrorMessage,
    Input,
    Textarea,
    Select,
    Checkbox,
    Badge,
    Card,
    Divider,
    useColorMode,
    useToast,
    Spinner,
    Flex,
    Progress,
    Alert,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FiFileText,
    FiShield,
    FiUsers,
    FiZap,
    FiArrowRight,
    FiArrowLeft,
    FiCheck,
    FiInfo,
    FiDownload,
    FiRefreshCw,
    FiBookOpen,
} from 'react-icons/fi'
import {
    validateDocumentForm,
    getPartyLabels,
    getAdditionalFields,
    JURISDICTION_STATES,
    DOCUMENT_TYPE_LABELS,
    type DocumentFormInput,
    type PartyInput,
} from '../lib/documentValidator'
import {
    backendGenerateStructuredDocument,
    backendExportDocx,
    fetchLegalClauses,
} from '../lib/backendClient'
import type { DocumentGenerationResult } from '../lib/secureClient'

const MotionBox = motion(Box)

interface DocumentWizardProps {
    onDocumentGenerated?: (result: DocumentGenerationResult) => void
}

const DOCUMENT_TYPES = [
    { id: 'contract', label: 'Contract Agreement', icon: FiFileText, desc: 'Master services, vendor, or general commercial agreements' },
    { id: 'nda', label: 'Non-Disclosure Agreement', icon: FiShield, desc: 'Protect proprietary technology, trade secrets, and confidential data' },
    { id: 'employment', label: 'Employment Contract', icon: FiUsers, desc: 'Standard employment agreements, CTC, benefits, and workplace policies' },
    { id: 'loan', label: 'Loan Agreement', icon: FiZap, desc: 'Promissory notes, repayment schedules, interest, and collateral terms' },
    { id: 'lease', label: 'Lease Agreement', icon: FiBookOpen, desc: 'Residential/commercial rental agreements, security deposits, and rules' },
]

const JURISDICTIONS = [
    { id: 'IN', label: '🇮🇳 India', desc: 'Indian Contract Act 1872, BNS, BSA, IT Act' },
    { id: 'US', label: '🇺🇸 United States', desc: 'State contract laws, UCC, federal provisions' },
    { id: 'UK', label: '🇬🇧 United Kingdom', desc: 'English common law, Consumer Rights Act' },
    { id: 'EU', label: '🇪🇺 European Union', desc: 'GDPR, Rome I Regulation, EU Directives' },
]

export const DocumentWizard: React.FC<DocumentWizardProps> = ({ onDocumentGenerated }) => {
    const { colorMode } = useColorMode()
    const toast = useToast()

    // Wizard state
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [clausesLoading, setClausesLoading] = useState(false)

    // Form inputs
    const [documentType, setDocumentType] = useState('contract')
    const [jurisdiction, setJurisdiction] = useState('IN')
    const [jurisdictionState, setJurisdictionState] = useState('Maharashtra')
    const [parties, setParties] = useState<PartyInput[]>([
        { role: 'party1', name: '', address: '', designation: '' },
        { role: 'party2', name: '', address: '', designation: '' },
    ])
    const [customDetails, setCustomDetails] = useState('')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [duration, setDuration] = useState('12 months')

    // Available clauses fetched from database (RAG preview)
    const [availableClauses, setAvailableClauses] = useState<Array<{
        id: string
        clause_category: string
        clause_title: string
        clause_text: string
        legal_source: string
        is_mandatory: boolean
    }>>([])
    const [selectedClauses, setSelectedClauses] = useState<string[]>([])

    // Generated result
    const [result, setResult] = useState<DocumentGenerationResult | null>(null)
    const [exportingDocx, setExportingDocx] = useState(false)

    const location = useLocation()

    // Pre-populate from location.state if navigated from Law Updates
    useEffect(() => {
        const state = location.state as any
        if (state?.lawCategory) {
            const cat = state.lawCategory.toLowerCase()
            const matched = DOCUMENT_TYPES.find(d => d.id === cat || d.id.includes(cat) || cat.includes(d.id))
            if (matched) {
                setDocumentType(matched.id)
            }
        }
        if (state?.lawTitle || state?.summary) {
            const contextMsg = `Compliance Focus: ${state.lawTitle || 'Statute Update'}\nNotes: ${state.summary || ''}`
            setCustomDetails(contextMsg)
        }
    }, [location])

    // Update parties whenever documentType changes
    useEffect(() => {
        const labels = getPartyLabels(documentType)
        const keys = Object.keys(labels)
        setParties(keys.map(role => ({ role, name: '', address: '', designation: '' })))
    }, [documentType])

    // Load legal clauses when entering Step 3
    useEffect(() => {
        if (step === 3) {
            loadClauses()
        }
    }, [step, documentType, jurisdiction])

    const loadClauses = async () => {
        setClausesLoading(true)
        try {
            const data = await fetchLegalClauses(documentType, jurisdiction)
            setAvailableClauses(data || [])
            // Auto-select mandatory clauses
            const mandatoryIds = (data || []).filter(c => c.is_mandatory).map(c => c.id)
            setSelectedClauses(mandatoryIds)
        } catch (err) {
            console.error('Failed to fetch legal clauses:', err)
        } finally {
            setClausesLoading(false)
        }
    }

    const handlePartyChange = (index: number, field: keyof PartyInput, value: string) => {
        const updated = [...parties]
        updated[index] = { ...updated[index], [field]: value }
        setParties(updated)
    }

    const toggleClause = (clauseId: string, isMandatory: boolean) => {
        if (isMandatory) return // Cannot uncheck mandatory clauses
        setSelectedClauses(prev =>
            prev.includes(clauseId) ? prev.filter(id => id !== clauseId) : [...prev, clauseId]
        )
    }

    const formInput: DocumentFormInput = {
        documentType,
        jurisdiction,
        jurisdictionState,
        parties,
        customDetails,
        amount,
        date,
        duration,
    }

    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const handleNext = () => {
        if (step === 1) {
            setStep(2)
            return
        }

        if (step === 2) {
            const errors = validateDocumentForm(formInput)
            if (errors.length > 0) {
                const errMap: Record<string, string> = {}
                errors.forEach(e => {
                    errMap[e.field] = e.message
                })
                setFormErrors(errMap)

                toast({
                    title: 'Validation Error',
                    description: errors[0].message,
                    status: 'warning',
                    duration: 4000,
                    isClosable: true,
                })
                return
            }
            setFormErrors({})
            setStep(3)
            return
        }

        if (step === 3) {
            setStep(4)
            return
        }
    }

    const handleBack = () => {
        if (step > 1) setStep(step - 1)
    }

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const genResult = await backendGenerateStructuredDocument({
                documentType,
                jurisdiction,
                jurisdictionState,
                parties,
                customDetails,
                selectedClauses,
                amount,
                date,
                duration,
            })

            setResult(genResult)
            if (onDocumentGenerated) onDocumentGenerated(genResult)

            toast({
                title: 'Document Generated Successfully!',
                description: `Compliance Score: ${genResult.compliance.percentage}% • ${genResult.clausesUsed} clauses used`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            })
        } catch (err: any) {
            toast({
                title: 'Generation Failed',
                description: err?.message || 'There was an error generating the document.',
                status: 'error',
                duration: 6000,
                isClosable: true,
            })
        } finally {
            setLoading(false)
        }
    }

    const handleExportDocx = async () => {
        if (!result) return
        setExportingDocx(true)
        try {
            const blob = await backendExportDocx(result.title, result.content)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${result.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast({
                title: 'DOCX Downloaded',
                description: 'Your document has been exported in professional DOCX format.',
                status: 'success',
                duration: 3000,
            })
        } catch (err: any) {
            toast({
                title: 'Export Error',
                description: err?.message || 'Failed to export DOCX',
                status: 'error',
            })
        } finally {
            setExportingDocx(false)
        }
    }

    const partyLabels = getPartyLabels(documentType)
    const additionalFields = getAdditionalFields(documentType)

    // Result View (Post-Generation)
    if (result) {
        return (
            <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <VStack spacing={8} align="stretch">
                    {/* Header Bar */}
                    <Card
                        bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.85)' : 'white'}
                        backdropFilter="blur(20px)"
                        border={`1px solid ${colorMode === 'dark' ? 'rgba(151, 15, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`}
                        borderRadius="2xl"
                        p={6}
                    >
                        <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'start', md: 'center' }} gap={4}>
                            <VStack align="start" spacing={1}>
                                <HStack spacing={2}>
                                    <Badge colorScheme="purple" borderRadius="full" px={3} py={0.5}>
                                        {DOCUMENT_TYPE_LABELS[documentType]}
                                    </Badge>
                                    <Badge colorScheme="blue" borderRadius="full" px={3} py={0.5}>
                                        {jurisdiction} Jurisdiction
                                    </Badge>
                                </HStack>
                                <Heading size="md" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                    {result.title}
                                </Heading>
                                <Text fontSize="xs" color="gray.400">
                                    Generated via RAG Legal Pipeline • {result.clausesUsed} Vetted Clauses Referenced
                                </Text>
                            </VStack>

                            <HStack spacing={3}>
                                <Badge
                                    bg={result.compliance.percentage >= 90 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}
                                    color={result.compliance.percentage >= 90 ? '#10b981' : '#f59e0b'}
                                    border={`1px solid ${result.compliance.percentage >= 90 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`}
                                    borderRadius="full"
                                    px={3}
                                    py={1}
                                    fontSize="xs"
                                    fontWeight="700"
                                >
                                    {result.compliance.percentage}% Verified Compliance
                                </Badge>
                                <Button
                                    leftIcon={<FiDownload />}
                                    bg="linear-gradient(135deg, #970fff, #7817ff)"
                                    color="white"
                                    onClick={handleExportDocx}
                                    isLoading={exportingDocx}
                                    loadingText="Exporting..."
                                    boxShadow="0 4px 15px rgba(151, 15, 255, 0.4)"
                                    _hover={{ transform: 'translateY(-2px)' }}
                                >
                                    Export DOCX
                                </Button>
                                <Button
                                    leftIcon={<FiRefreshCw />}
                                    variant="outline"
                                    borderColor="rgba(255,255,255,0.2)"
                                    color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                                    onClick={() => setResult(null)}
                                >
                                    New Document
                                </Button>
                            </HStack>
                        </Flex>
                    </Card>

                    {/* Risk Flags Banner */}
                    {result.compliance.riskFlags && result.compliance.riskFlags.length > 0 && (
                        <Alert
                            status="warning"
                            borderRadius="xl"
                            bg="rgba(245, 158, 11, 0.1)"
                            border="1px solid rgba(245, 158, 11, 0.3)"
                            color="white"
                        >
                            <VStack align="start" spacing={1} w="full">
                                <Text fontWeight="700" fontSize="sm" color="#f59e0b">
                                    ⚠️ {result.compliance.riskFlags.length} Compliance Considerations Identified
                                </Text>
                                {result.compliance.riskFlags.map((flag: { clause: string; reason: string; recommendation: string }, idx: number) => (
                                    <Text key={idx} fontSize="xs" color="gray.300">
                                        • <strong>{flag.clause}</strong>: {flag.reason} — <em>{flag.recommendation}</em>
                                    </Text>
                                ))}
                            </VStack>
                        </Alert>
                    )}

                    {/* Side by Side Preview */}
                    <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
                        {/* Main Document Content */}
                        <Box
                            gridColumn={{ base: 'span 1', lg: 'span 2' }}
                            bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                            backdropFilter="blur(20px)"
                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                            borderRadius="2xl"
                            p={8}
                            maxH="700px"
                            overflowY="auto"
                            className="document-preview"
                        >
                            <Box
                                color={colorMode === 'dark' ? 'gray.200' : 'gray.800'}
                                fontSize="sm"
                                lineHeight="tall"
                                fontFamily="Georgia, serif"
                                whiteSpace="pre-wrap"
                            >
                                {result.content}
                            </Box>
                        </Box>

                        {/* Audit Trail & Citations Sidebar */}
                        <VStack spacing={4} align="stretch">
                            <Card
                                bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                                backdropFilter="blur(20px)"
                                border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                                borderRadius="2xl"
                                p={5}
                            >
                                <VStack align="start" spacing={3}>
                                    <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="0.05em">
                                        Legal Compliance Audit
                                    </Heading>

                                    <Divider borderColor={colorMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />

                                    <Text fontSize="xs" fontWeight="700" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                        Mandatory Elements ({result.compliance.presentMandatory.length}/{result.compliance.maxScore})
                                    </Text>
                                    {result.compliance.presentMandatory.map((item: string, i: number) => (
                                        <HStack key={i} spacing={2} fontSize="xs">
                                            <FiCheck color="#10b981" />
                                            <Text color={colorMode === 'dark' ? 'gray.300' : 'gray.600'} textTransform="capitalize">
                                                {item}
                                            </Text>
                                        </HStack>
                                    ))}

                                    {result.compliance.missingMandatory.length > 0 && (
                                        <>
                                            <Text fontSize="xs" fontWeight="700" color="red.400" mt={2}>
                                                Missing Provisions
                                            </Text>
                                            {result.compliance.missingMandatory.map((item: string, i: number) => (
                                                <HStack key={i} spacing={2} fontSize="xs">
                                                    <FiInfo color="#ef4444" />
                                                    <Text color="red.300" textTransform="capitalize">
                                                        {item}
                                                    </Text>
                                                </HStack>
                                            ))}
                                        </>
                                    )}
                                </VStack>
                            </Card>

                            <Card
                                bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                                backdropFilter="blur(20px)"
                                border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                                borderRadius="2xl"
                                p={5}
                            >
                                <VStack align="start" spacing={3}>
                                    <Heading size="xs" textTransform="uppercase" color="gray.400" letterSpacing="0.05em">
                                        Grounding & Sources
                                    </Heading>
                                    <Text fontSize="xs" color="gray.400">
                                        This document was generated using vetted legal clauses grounded in official statutes.
                                    </Text>
                                    <Badge colorScheme="purple" borderRadius="md" px={2} py={1} fontSize="xs">
                                        {jurisdiction} Legal Database
                                    </Badge>
                                </VStack>
                            </Card>
                        </VStack>
                    </SimpleGrid>
                </VStack>
            </MotionBox>
        )
    }

    // Wizard Form View
    return (
        <VStack spacing={8} align="stretch" w="full">
            {/* Stepper Header */}
            <Card
                bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                backdropFilter="blur(20px)"
                border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                borderRadius="2xl"
                p={4}
            >
                <VStack spacing={3}>
                    <Flex w="full" justify="space-between" align="center" px={4}>
                        {[
                            { n: 1, title: 'Document & Jurisdiction' },
                            { n: 2, title: 'Party Details' },
                            { n: 3, title: 'Legal Clauses' },
                            { n: 4, title: 'Review & Generate' },
                        ].map((s) => (
                            <HStack key={s.n} spacing={2} opacity={step >= s.n ? 1 : 0.4}>
                                <Box
                                    w="28px"
                                    h="28px"
                                    borderRadius="full"
                                    bg={step === s.n ? '#970fff' : step > s.n ? '#10b981' : 'gray.600'}
                                    color="white"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    fontSize="xs"
                                    fontWeight="bold"
                                >
                                    {step > s.n ? <FiCheck /> : s.n}
                                </Box>
                                <Text
                                    fontSize="xs"
                                    fontWeight="600"
                                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                    display={{ base: 'none', md: 'block' }}
                                >
                                    {s.title}
                                </Text>
                            </HStack>
                        ))}
                    </Flex>
                    <Progress
                        value={(step / 4) * 100}
                        size="xs"
                        colorScheme="purple"
                        borderRadius="full"
                        w="full"
                    />
                </VStack>
            </Card>

            {/* Step Content with AnimatePresence */}
            <AnimatePresence mode="wait">
                <MotionBox
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* STEP 1: Document Type & Jurisdiction */}
                    {step === 1 && (
                        <Card
                            bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                            backdropFilter="blur(20px)"
                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                            borderRadius="2xl"
                            p={8}
                        >
                            <VStack spacing={6} align="start">
                                <VStack align="start" spacing={1}>
                                    <Heading size="md" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                        Select Document Type & Jurisdiction
                                    </Heading>
                                    <Text fontSize="sm" color="gray.400">
                                        Choose the type of legal document and the governing legal framework.
                                    </Text>
                                </VStack>

                                {/* Document Type Grid */}
                                <Text fontSize="xs" fontWeight="700" textTransform="uppercase" color="gray.400" letterSpacing="0.05em">
                                    Document Type
                                </Text>
                                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
                                    {DOCUMENT_TYPES.map((dt) => {
                                        const IconComp = dt.icon
                                        const isSelected = documentType === dt.id
                                        return (
                                            <Box
                                                key={dt.id}
                                                p={5}
                                                borderRadius="xl"
                                                bg={isSelected ? 'rgba(151, 15, 255, 0.15)' : colorMode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'gray.50'}
                                                border={`2px solid ${isSelected ? '#970fff' : colorMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`}
                                                cursor="pointer"
                                                onClick={() => setDocumentType(dt.id)}
                                                _hover={{ borderColor: '#970fff', transform: 'translateY(-2px)' }}
                                                transition="all 0.2s ease"
                                            >
                                                <HStack spacing={3} mb={2}>
                                                    <Box p={2} borderRadius="lg" bg={`${isSelected ? '#970fff' : 'gray.600'}20`}>
                                                        <IconComp color={isSelected ? '#970fff' : 'gray.400'} size={20} />
                                                    </Box>
                                                    <Text fontWeight="700" color={colorMode === 'dark' ? 'white' : 'gray.800'} fontSize="sm">
                                                        {dt.label}
                                                    </Text>
                                                </HStack>
                                                <Text fontSize="xs" color="gray.400">
                                                    {dt.desc}
                                                </Text>
                                            </Box>
                                        )
                                    })}
                                </SimpleGrid>

                                <Divider borderColor={colorMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />

                                {/* Jurisdiction Selection */}
                                <Text fontSize="xs" fontWeight="700" textTransform="uppercase" color="gray.400" letterSpacing="0.05em">
                                    Jurisdiction
                                </Text>
                                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} w="full">
                                    {JURISDICTIONS.map((j) => {
                                        const isSelected = jurisdiction === j.id
                                        return (
                                            <Box
                                                key={j.id}
                                                p={4}
                                                borderRadius="xl"
                                                bg={isSelected ? 'rgba(0, 212, 255, 0.15)' : colorMode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'gray.50'}
                                                border={`2px solid ${isSelected ? '#00d4ff' : colorMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`}
                                                cursor="pointer"
                                                onClick={() => setJurisdiction(j.id)}
                                                _hover={{ borderColor: '#00d4ff', transform: 'translateY(-2px)' }}
                                                transition="all 0.2s ease"
                                            >
                                                <Text fontWeight="700" color={colorMode === 'dark' ? 'white' : 'gray.800'} fontSize="sm" mb={1}>
                                                    {j.label}
                                                </Text>
                                                <Text fontSize="xs" color="gray.400">
                                                    {j.desc}
                                                </Text>
                                            </Box>
                                        )
                                    })}
                                </SimpleGrid>

                                {/* State Picker (if applicable) */}
                                {JURISDICTION_STATES[jurisdiction]?.length > 0 && (
                                    <FormControl maxW="300px">
                                        <FormLabel color={colorMode === 'dark' ? 'white' : 'gray.700'} fontSize="xs">
                                            State / Province
                                        </FormLabel>
                                        <Select
                                            value={jurisdictionState}
                                            onChange={(e) => setJurisdictionState(e.target.value)}
                                            borderRadius="xl"
                                            size="sm"
                                        >
                                            {JURISDICTION_STATES[jurisdiction].map((st) => (
                                                <option key={st} value={st}>
                                                    {st}
                                                </option>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            </VStack>
                        </Card>
                    )}

                    {/* STEP 2: Party Details */}
                    {step === 2 && (
                        <Card
                            bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                            backdropFilter="blur(20px)"
                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                            borderRadius="2xl"
                            p={8}
                        >
                            <VStack spacing={6} align="start">
                                <VStack align="start" spacing={1}>
                                    <Heading size="md" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                        Party Information & Terms
                                    </Heading>
                                    <Text fontSize="sm" color="gray.400">
                                        Enter details for all participating parties and core agreement terms.
                                    </Text>
                                </VStack>

                                {/* Dynamic Party Fields */}
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full">
                                    {parties.map((p, index) => {
                                        const roleLabel = partyLabels[p.role] || `Party ${index + 1}`
                                        return (
                                            <Card
                                                key={p.role}
                                                bg={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'gray.50'}
                                                border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`}
                                                borderRadius="xl"
                                                p={5}
                                            >
                                                <VStack spacing={4} align="start">
                                                    <HStack spacing={2}>
                                                        <Badge colorScheme="purple" borderRadius="full" px={2.5}>
                                                            {roleLabel}
                                                        </Badge>
                                                    </HStack>

                                                    <FormControl isRequired isInvalid={!!formErrors[`parties.${p.role}`]}>
                                                        <FormLabel fontSize="xs" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                                            Full Name / Legal Entity
                                                        </FormLabel>
                                                        <Input
                                                            placeholder={`e.g., ${index === 0 ? 'Acme Corp Pvt Ltd' : 'John Doe'}`}
                                                            value={p.name}
                                                            onChange={(e) => {
                                                                handlePartyChange(index, 'name', e.target.value)
                                                                if (formErrors[`parties.${p.role}`]) {
                                                                    setFormErrors(prev => ({ ...prev, [`parties.${p.role}`]: '' }))
                                                                }
                                                            }}
                                                            borderRadius="xl"
                                                            size="sm"
                                                        />
                                                        {formErrors[`parties.${p.role}`] && (
                                                            <FormErrorMessage fontSize="xs">
                                                                {formErrors[`parties.${p.role}`]}
                                                            </FormErrorMessage>
                                                        )}
                                                    </FormControl>

                                                    <FormControl>
                                                        <FormLabel fontSize="xs" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                                            Address (Optional)
                                                        </FormLabel>
                                                        <Input
                                                            placeholder="e.g., 123 Tech Park, BKC, Mumbai"
                                                            value={p.address || ''}
                                                            onChange={(e) => handlePartyChange(index, 'address', e.target.value)}
                                                            borderRadius="xl"
                                                            size="sm"
                                                        />
                                                    </FormControl>

                                                    <FormControl>
                                                        <FormLabel fontSize="xs" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                                            Designation / Authorized Signatory
                                                        </FormLabel>
                                                        <Input
                                                            placeholder="e.g., Managing Director"
                                                            value={p.designation || ''}
                                                            onChange={(e) => handlePartyChange(index, 'designation', e.target.value)}
                                                            borderRadius="xl"
                                                            size="sm"
                                                        />
                                                    </FormControl>
                                                </VStack>
                                            </Card>
                                        )
                                    })}
                                </SimpleGrid>

                                <Divider borderColor={colorMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />

                                {/* Additional Dynamic Fields based on doc type */}
                                {additionalFields.length > 0 && (
                                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="full">
                                        {additionalFields.map((field) => (
                                            <FormControl key={field.name} isRequired={field.required}>
                                                <FormLabel fontSize="xs" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                                    {field.label}
                                                </FormLabel>
                                                <Input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    value={
                                                        field.name === 'amount' ? amount : field.name === 'date' ? date : duration
                                                    }
                                                    onChange={(e) => {
                                                        if (field.name === 'amount') setAmount(e.target.value)
                                                        if (field.name === 'date') setDate(e.target.value)
                                                        if (field.name === 'duration') setDuration(e.target.value)
                                                    }}
                                                    borderRadius="xl"
                                                    size="sm"
                                                />
                                            </FormControl>
                                        ))}
                                    </SimpleGrid>
                                )}

                                {/* Custom Details Textarea */}
                                <FormControl isRequired isInvalid={!!formErrors['customDetails']}>
                                    <FormLabel fontSize="xs" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                        Document Purpose & Specific Terms
                                    </FormLabel>
                                    <Textarea
                                        placeholder="Describe the scope of work, payment milestones, specific obligations, confidentiality rules, or special conditions..."
                                        rows={4}
                                        value={customDetails}
                                        onChange={(e) => {
                                            setCustomDetails(e.target.value)
                                            if (formErrors['customDetails']) {
                                                setFormErrors(prev => ({ ...prev, customDetails: '' }))
                                            }
                                        }}
                                        borderRadius="xl"
                                        size="sm"
                                    />
                                    {formErrors['customDetails'] && (
                                        <FormErrorMessage fontSize="xs">
                                            {formErrors['customDetails']}
                                        </FormErrorMessage>
                                    )}
                                </FormControl>
                            </VStack>
                        </Card>
                    )}

                    {/* STEP 3: Clause Customization (RAG Preview) */}
                    {step === 3 && (
                        <Card
                            bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                            backdropFilter="blur(20px)"
                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                            borderRadius="2xl"
                            p={8}
                        >
                            <VStack spacing={6} align="start">
                                <VStack align="start" spacing={1}>
                                    <Heading size="md" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                        Vetted Legal Clause Library (RAG)
                                    </Heading>
                                    <Text fontSize="sm" color="gray.400">
                                        These clauses are fetched from the {jurisdiction} legal knowledge base. Mandatory provisions are locked; optional ones can be toggled.
                                    </Text>
                                </VStack>

                                {clausesLoading && (
                                    <VStack py={8} w="full" align="center">
                                        <Spinner size="lg" color="brand.500" />
                                        <Text color="gray.400" fontSize="sm">Fetching legal clauses for {jurisdiction}...</Text>
                                    </VStack>
                                )}

                                {!clausesLoading && availableClauses.length === 0 && (
                                    <Text color="gray.400" fontSize="sm">
                                        No specific clauses found for this combination. Default legal protections will apply.
                                    </Text>
                                )}

                                {!clausesLoading && availableClauses.length > 0 && (
                                    <VStack spacing={3} w="full" align="stretch" maxH="400px" overflowY="auto">
                                        {availableClauses.map((c) => {
                                            const isChecked = selectedClauses.includes(c.id)
                                            return (
                                                <Card
                                                    key={c.id}
                                                    bg={c.is_mandatory ? 'rgba(16, 185, 129, 0.06)' : colorMode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'gray.50'}
                                                    border={`1px solid ${c.is_mandatory ? 'rgba(16, 185, 129, 0.3)' : colorMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`}
                                                    borderRadius="xl"
                                                    p={4}
                                                >
                                                    <HStack align="start" spacing={3}>
                                                        <Checkbox
                                                            isChecked={isChecked}
                                                            isDisabled={c.is_mandatory}
                                                            onChange={() => toggleClause(c.id, c.is_mandatory)}
                                                            colorScheme={c.is_mandatory ? 'green' : 'purple'}
                                                            mt={1}
                                                        />
                                                        <VStack align="start" spacing={1} flex={1}>
                                                            <HStack justify="space-between" w="full">
                                                                <HStack spacing={2}>
                                                                    <Text fontWeight="700" fontSize="sm" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                                                        {c.clause_title}
                                                                    </Text>
                                                                    <Badge
                                                                        colorScheme={c.is_mandatory ? 'green' : 'purple'}
                                                                        borderRadius="full"
                                                                        px={2}
                                                                        fontSize="10px"
                                                                    >
                                                                        {c.is_mandatory ? 'Mandatory' : 'Optional'}
                                                                    </Badge>
                                                                </HStack>
                                                                {c.legal_source && (
                                                                    <Text fontSize="10px" color="gray.500" fontFamily="mono">
                                                                        {c.legal_source}
                                                                    </Text>
                                                                )}
                                                            </HStack>
                                                            <Text fontSize="xs" color="gray.400" noOfLines={2}>
                                                                {c.clause_text}
                                                            </Text>
                                                        </VStack>
                                                    </HStack>
                                                </Card>
                                            )
                                        })}
                                    </VStack>
                                )}
                            </VStack>
                        </Card>
                    )}

                    {/* STEP 4: Review & Generate */}
                    {step === 4 && (
                        <Card
                            bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                            backdropFilter="blur(20px)"
                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                            borderRadius="2xl"
                            p={8}
                        >
                            <VStack spacing={6} align="start">
                                <VStack align="start" spacing={1}>
                                    <Heading size="md" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                        Review Configuration
                                    </Heading>
                                    <Text fontSize="sm" color="gray.400">
                                        Verify your choices before triggering the RAG legal document pipeline.
                                    </Text>
                                </VStack>

                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                                    <Box p={4} borderRadius="xl" bg="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.08)">
                                        <Text fontSize="xs" color="gray.400">Document Type</Text>
                                        <Text fontWeight="bold" color="white">{DOCUMENT_TYPE_LABELS[documentType]}</Text>
                                    </Box>
                                    <Box p={4} borderRadius="xl" bg="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.08)">
                                        <Text fontSize="xs" color="gray.400">Jurisdiction</Text>
                                        <Text fontWeight="bold" color="white">{jurisdiction} ({jurisdictionState})</Text>
                                    </Box>
                                    {parties.map((p, i) => (
                                        <Box key={i} p={4} borderRadius="xl" bg="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.08)">
                                            <Text fontSize="xs" color="gray.400">{partyLabels[p.role] || `Party ${i + 1}`}</Text>
                                            <Text fontWeight="bold" color="white">{p.name || 'Not provided'}</Text>
                                        </Box>
                                    ))}
                                </SimpleGrid>

                                <Box p={4} borderRadius="xl" bg="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.08)" w="full">
                                    <Text fontSize="xs" color="gray.400" mb={1}>Custom Terms Summary</Text>
                                    <Text fontSize="sm" color="gray.300">{customDetails}</Text>
                                </Box>

                                <Alert status="info" borderRadius="xl" bg="rgba(151, 15, 255, 0.1)" border="1px solid rgba(151, 15, 255, 0.3)">
                                    <FiInfo color="#970fff" />
                                    <Text fontSize="xs" color="gray.300" ml={2}>
                                        Generation consumes 1 token. All generated content is validated server-side for compliance before delivery.
                                    </Text>
                                </Alert>
                            </VStack>
                        </Card>
                    )}
                </MotionBox>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <Flex justify="space-between" align="center" w="full">
                <Button
                    leftIcon={<FiArrowLeft />}
                    onClick={handleBack}
                    isDisabled={step === 1 || loading}
                    variant="ghost"
                    color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                >
                    Back
                </Button>

                {step < 4 ? (
                    <Button
                        rightIcon={<FiArrowRight />}
                        onClick={handleNext}
                        bg="linear-gradient(135deg, #970fff, #7817ff)"
                        color="white"
                        px={8}
                        _hover={{ transform: 'translateY(-2px)' }}
                    >
                        Next Step
                    </Button>
                ) : (
                    <Button
                        leftIcon={<FiZap />}
                        onClick={handleGenerate}
                        isLoading={loading}
                        loadingText="Generating Document via RAG..."
                        bg="linear-gradient(135deg, #970fff, #7817ff)"
                        color="white"
                        px={8}
                        py={6}
                        boxShadow="0 8px 25px rgba(151, 15, 255, 0.4)"
                        _hover={{ transform: 'translateY(-2px)' }}
                    >
                        Generate Legal Document
                    </Button>
                )}
            </Flex>
        </VStack>
    )
}

export default DocumentWizard
