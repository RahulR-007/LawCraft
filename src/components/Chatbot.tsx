import React, { useState, useRef, useEffect } from 'react'
import {
    Box,
    VStack,
    HStack,
    Text,
    Input,
    IconButton,
    Spinner,
    Avatar,
    Flex,
    Button,
} from '@chakra-ui/react'
import { FiSend, FiMessageCircle, FiX, FiMinimize2, FiFileText } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { secureChatbot, secureHealthCheck } from '../lib/secureClient'

const MotionBox = motion(Box)

interface Message {
    id: string
    text: string
    sender: 'user' | 'bot'
    timestamp: Date
}

// Chatbot Rules
const CHATBOT_RULES = {
    MAX_TOKENS: 512, // Max tokens for generation
    RESPONSE_TIMEOUT: 30000, // 30 seconds timeout
    ALLOWED_TOPICS: [
        'contract',
        'nda',
        'employment',
        'loan',
        'lease',
        'agreement',
        'legal',
        'document'
    ],
    RESTRICTED_TOPICS: [
        'illegal',
        'hack',
        'bypass',
        'fraud',
        'crime',
        'terrorism',
        'forge',
        'forgery',
        'counterfeit',
        'fake document',
        'fake contract'
    ]
}

// Intelligent Legal Answer Enhancer (prevents truncated responses and enriches statutory section Q&A)
function enhanceLegalAnswer(userQuery: string, rawAnswer: string): string {
    const queryLower = userQuery.toLowerCase()

    if (queryLower.includes('section 13') || queryLower.includes('sec 13')) {
        return `**Indian Contract Act, 1872 — Section 13 (Consent Defined)**

• **Statutory Definition:** Two or more persons are said to consent when they agree upon the same thing in the same sense (*Consensus ad idem*).
• **Core Principle:** Meeting of minds is mandatory to create any valid contractual obligation.
• **Free Consent (Section 14):** Consent must be free from Coercion (Sec 15), Undue Influence (Sec 16), Fraud (Sec 17), Misrepresentation (Sec 18), or Mutual Mistake (Sec 20).
• **Legal Consequence:** If consent under Section 13 is absent, the contract is **void ab initio** (void from the beginning).`
    }

    if (queryLower.includes('section 10') || queryLower.includes('sec 10')) {
        return `**Indian Contract Act, 1872 — Section 10 (What Agreements are Contracts)**

• **Statutory Rule:** All agreements are contracts if made by free consent of parties competent to contract, for lawful consideration and object.
• **Essential Pillars:**
  1. Free consent of parties
  2. Legal capacity to contract (major age, sound mind)
  3. Lawful consideration and lawful object
  4. Agreement not expressly declared void under law.`
    }

    if (queryLower.includes('section 27') || queryLower.includes('sec 27')) {
        return `**Indian Contract Act, 1872 — Section 27 (Restraint of Trade)**

• **Statutory Rule:** Every agreement by which any person is restrained from exercising a lawful profession, trade, or business of any kind, is to that extent void.
• **Goodwill Exception:** Sells goodwill of a business can agree to reasonable local non-compete limits.
• **Application:** General post-employment non-compete bans are legally unenforceable in India.`
    }

    if (queryLower.includes('section 56') || queryLower.includes('sec 56')) {
        return `**Indian Contract Act, 1872 — Section 56 (Frustration of Contract)**

• **Statutory Rule:** An agreement to perform an impossible act is void. If an act becomes impossible or unlawful after contract execution, the contract becomes void when the impossibility occurs.
• **Force Majeure Link:** Governs unforeseen events beyond party control that defeat the core contract purpose.`
    }

    if (queryLower.includes('section 73') || queryLower.includes('sec 73')) {
        return `**Indian Contract Act, 1872 — Section 73 (Damages for Breach)**

• **Statutory Rule:** The party suffering from breach of contract is entitled to compensation for loss or damage that naturally arose in the usual course of events.
• **Remote Damages:** Indirect or non-contemplated losses cannot be claimed under Section 73.`
    }

    if (rawAnswer && rawAnswer.trim().length > 0) {
        let clean = rawAnswer.trim()
        if (clean.length < 90 && !clean.includes('**')) {
            clean = `**Legal Advisory:**\n\n• ${clean}`
        }
        return clean
    }

    return rawAnswer
}

// Rich Markdown Chat Message Formatter
const FormattedChatMessage: React.FC<{ text: string; onNavigateToGenerate?: () => void }> = ({ text, onNavigateToGenerate }) => {
    // Separate disclaimer if present at bottom
    const disclaimerMatch = text.match(/(?:⚠️\s*)?\*?Disclaimer[\s\S]*/i)
    const disclaimerText = disclaimerMatch ? disclaimerMatch[0].replace(/^⚠️\s*/, '') : null
    const mainBody = text.replace(/(?:⚠️\s*)?\*?Disclaimer[\s\S]*/gi, '').trim()

    const lines = mainBody.split('\n').filter(line => line.trim().length > 0)
    // Only show CTA button if message explicitly suggests drafting/creating a document
    const isDraftingSuggestion = /draft|create|generate|wizard|architect|template|fill out|build an agreement/i.test(mainBody)

    const parseFormattedInlineText = (lineText: string) => {
        // Parse bold **text** and italic *text*
        const parts = lineText.split(/(\*\*.*?\*\*|\*.*?\*)/g)
        return parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <Text key={idx} as="span" fontWeight="bold" color="white">
                        {part.slice(2, -2)}
                    </Text>
                )
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return (
                    <Text key={idx} as="span" fontStyle="italic" color="gray.300">
                        {part.slice(1, -1)}
                    </Text>
                )
            }
            return <React.Fragment key={idx}>{part}</React.Fragment>
        })
    }

    return (
        <VStack align="start" spacing={2} w="full">
            {lines.map((line, lineIdx) => {
                const trimmed = line.trim()
                const isBullet = /^[-*•]\s+/.test(trimmed)
                const isHeader = /^\*\*[^*]+\*\*:?$/.test(trimmed) || /^###?\s+/.test(trimmed)
                const contentText = isBullet
                    ? trimmed.replace(/^[-*•]\s+/, '')
                    : trimmed.replace(/^###?\s+/, '')

                if (isHeader) {
                    return (
                        <Text key={lineIdx} fontSize="sm" fontWeight="bold" color="#b84dff" pt={1}>
                            {parseFormattedInlineText(contentText)}
                        </Text>
                    )
                }

                if (isBullet) {
                    return (
                        <HStack key={lineIdx} align="start" spacing={2} w="full">
                            <Text color="#b84dff" fontWeight="bold" fontSize="xs" mt={0.5}>•</Text>
                            <Text fontSize="sm" color="gray.100" flex={1} lineHeight="relaxed">
                                {parseFormattedInlineText(contentText)}
                            </Text>
                        </HStack>
                    )
                }

                return (
                    <Text key={lineIdx} fontSize="sm" color="gray.100" lineHeight="relaxed">
                        {parseFormattedInlineText(contentText)}
                    </Text>
                )
            })}

            {disclaimerText && (
                <Text fontSize="xs" color="gray.400" fontStyle="italic" pt={1} borderTop="1px solid rgba(255,255,255,0.1)" w="full">
                    {disclaimerText}
                </Text>
            )}

            {isDraftingSuggestion && onNavigateToGenerate && (
                <Button
                    size="xs"
                    mt={2}
                    bg="rgba(151, 15, 255, 0.3)"
                    color="white"
                    border="1px solid rgba(151, 15, 255, 0.5)"
                    leftIcon={<FiFileText size={12} />}
                    _hover={{ bg: 'rgba(151, 15, 255, 0.5)' }}
                    onClick={onNavigateToGenerate}
                >
                    Launch Document Architect
                </Button>
            )}
        </VStack>
    )
}

const Chatbot: React.FC = () => {
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hi! I\'m Alice. Ask me about contracts, NDAs, loans, or employment agreements.',
            sender: 'bot',
            timestamp: new Date()
        }
    ])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const onClose = () => setIsOpen(false)
    const onToggle = () => setIsMinimized(!isMinimized)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Auto-focus input when chat opens and is not minimized
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            const timer = setTimeout(() => {
                inputRef.current?.focus()
            }, 300) // Small delay to ensure the animation completes
            return () => clearTimeout(timer)
        }
    }, [isOpen, isMinimized])

    // AI-powered response with legal focus
    const sendMessage = async (message: string) => {
        setIsLoading(true)

        try {
            // Check message for restricted topics
            const lowerMessage = message.toLowerCase()
            const hasRestricted = CHATBOT_RULES.RESTRICTED_TOPICS.some(topic =>
                lowerMessage.includes(topic)
            )

            if (hasRestricted) {
                const userMessage: Message = {
                    id: Date.now().toString(),
                    text: message,
                    sender: 'user',
                    timestamp: new Date()
                }
                setMessages(prev => [...prev, userMessage])

                const botMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: "I can't assist with that topic. I'm here to help with legal documents and contracts only.",
                    sender: 'bot',
                    timestamp: new Date()
                }
                setMessages(prev => [...prev, botMessage])
                setIsLoading(false)
                return
            }

            // Add user message
            const userMessage: Message = {
                id: Date.now().toString(),
                text: message,
                sender: 'user',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, userMessage])

            // Check if AI API is available
            const serverHealthy = await secureHealthCheck()

            if (!serverHealthy) {
                const warningMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: "AI API unavailable. Using offline response.",
                    sender: 'bot',
                    timestamp: new Date()
                }
                setMessages(prev => [...prev, warningMessage])

                setTimeout(() => {
                    fallbackResponse(message)
                }, 500)
                return
            }

            try {
                // Collect recent messages for conversation history context
                const history = messages.map(m => ({
                    role: m.sender === 'bot' ? 'assistant' : 'user',
                    content: m.text
                }))

                const chatResult = await secureChatbot(message, history)
                const rawAnswer = chatResult.content

                if (rawAnswer && rawAnswer.trim()) {
                    const enhancedText = enhanceLegalAnswer(message, rawAnswer.trim())
                    const botResponse: Message = {
                        id: (Date.now() + 1).toString(),
                        text: enhancedText,
                        sender: 'bot',
                        timestamp: new Date()
                    }
                    setMessages(prev => [...prev, botResponse])
                } else {
                    fallbackResponse(message)
                }
            } catch (aiError) {
                console.error('AI chat completion error:', aiError)
                fallbackResponse(message)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Rich Fallback Knowledge Engine (used when offline or API is unavailable)
    const fallbackResponse = (message: string) => {
        const lowerMsg = message.toLowerCase()
        let response = ''

        if (lowerMsg.includes('nda') || lowerMsg.includes('non-disclosure') || lowerMsg.includes('confidential')) {
            response = `**Non-Disclosure Agreement (NDA) Guide**

**Core Objectives:**
Protect proprietary business data, trade secrets, customer lists, and IP shared during transactions or employment.

**Essential Clauses Required:**
• **Definition of Confidential Information:** Explicit scope covering technical data, financials, and source code.
• **Exclusions from Confidentiality:** Information already public, independently developed, or legally subpoenaed.
• **Obligations & Standard of Care:** Receiving party must hold data in strict confidence using no less than reasonable care.
• **Term & Survival:** Confidentiality obligations typically survive for **3 to 5 years** post-termination.

**Statutory Grounding:**
• *India:* Information Technology Act, 2000 (Section 72A); Indian Contract Act, 1872 (Section 27).
• *US:* Defend Trade Secrets Act (DTSA); Uniform Trade Secrets Act (UTSA).`
        } else if (lowerMsg.includes('contract') || lowerMsg.includes('agreement') || lowerMsg.includes('service')) {
            response = `**Master Commercial Contract Guidance**

**Essential Elements for Enforcement:**
• **Offer & Unconditional Acceptance:** Mutual assent on unambiguous terms.
• **Lawful Consideration:** Exchange of value (payment, services, performance).
• **Capacity & Competency:** Legal capacity of signatories to execute binding agreements.

**Key Protective Clauses:**
• **Indemnification & Limitation of Liability:** Cap damages to contract value to mitigate financial exposure.
• **Governing Law & Dispute Resolution:** Mandatory arbitration provisions with explicit seat and jurisdiction.
• **Severability & Entire Agreement:** Protects overall contract validity if specific sub-clauses are invalidated.`
        } else if (lowerMsg.includes('loan') || lowerMsg.includes('borrow') || lowerMsg.includes('interest')) {
            response = `**Loan & Debt Agreement Structure**

**Key Terms & Considerations:**
• **Principal Amount & Interest:** Specify simple vs. compound interest rate and disbursement milestones.
• **Repayment Schedule & Amortization:** Due dates, EMI breakdowns, and pre-payment penalties.
• **Event of Default & Remedies:** Grace periods, default interest rate additions, and collateral liquidation rights.

**Regulatory Compliance:**
• *India:* RBI Fair Practices Code for Lenders; SARFAESI Act, 2002.
• *US:* Truth in Lending Act (TILA); Usury laws governing maximum permissible interest rates.`
        } else if (lowerMsg.includes('employment') || lowerMsg.includes('employee') || lowerMsg.includes('job') || lowerMsg.includes('salary')) {
            response = `**Employment Agreement Essentials**

**Required Legal Terms:**
• **Compensation & CTC Breakdown:** Monthly salary, allowances, tax deductions (EPF, ESI, TDS), and performance bonus.
• **Notice Period & Termination:** Mutual notice period requirements (typically 30–90 days) and cause for immediate termination.
• **IP Ownership & Restrictive Covenants:** Work-for-hire assignment ensuring all created IP vests in the employer.

**Statutory Framework:**
• *India:* Industrial Disputes Act, 1947; Code on Wages, 2019; Maternity Benefit Act, 1961.
• *US:* Fair Labor Standards Act (FLSA); At-will employment provisions where applicable.`
        } else if (lowerMsg.includes('lease') || lowerMsg.includes('rent') || lowerMsg.includes('tenant') || lowerMsg.includes('property')) {
            response = `**Lease & Rental Agreement Requirements**

**Core Provisions:**
• **Rent & Security Deposit:** Monthly due date, escalation frequency (e.g. 5-10% annually), and refund timelines.
• **Maintenance Responsibilities:** Landlord covers structural repairs; Tenant covers daily upkeep and utility bills.
• **Term & Termination Notice:** Lease duration, lock-in period restrictions, and eviction terms.

**Legal Requirements:**
• *Stamp Duty & Registration:* Commercial leases >11 months must be duly stamped and registered under the Registration Act, 1908.`
        } else {
            response = `**Alice Legal AI Advisory Services**

I am Alice, your specialized Legal AI Assistant. I can assist you with:

• **Contract & Agreement Drafting:** Structuring enforceable service, vendor, and partner contracts.
• **NDAs & IP Protection:** Drafting unilateral or mutual confidentiality agreements.
• **Employment & HR Compliance:** Reviewing CTC structures, notice periods, and IP assignment clauses.
• **Loan & Lease Terms:** Analyzing repayment schedules, collateral terms, and rent lock-in provisions.

How may I assist you with your legal documents today?`
        }

        const finalAnswer = enhanceLegalAnswer(message, response)

        const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: finalAnswer,
            sender: 'bot',
            timestamp: new Date()
        }

        setMessages(prev => [...prev, botResponse])
    }

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue.trim())
            setInputValue('')
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    return (
        <>
            {/* Floating Chat Button - shows when chat is closed */}
            {!isOpen && (
                <MotionBox
                    position="fixed"
                    bottom="20px"
                    right="20px"
                    zIndex="999"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <IconButton
                        aria-label="Open chat"
                        icon={<FiMessageCircle />}
                        size="lg"
                        borderRadius="full"
                        width="60px"
                        height="60px"
                        fontSize="24px"
                        onClick={() => setIsOpen(true)}
                        bg="rgba(151, 15, 255, 0.15)"
                        backdropFilter="blur(20px)"
                        border="1px solid rgba(151, 15, 255, 0.3)"
                        color="rgba(151, 15, 255, 0.9)"
                        boxShadow="0 8px 32px rgba(151, 15, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                        _hover={{
                            transform: "translateY(-2px)",
                            bg: "rgba(151, 15, 255, 0.25)",
                            boxShadow: "0 12px 40px rgba(151, 15, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                            border: "1px solid rgba(151, 15, 255, 0.5)"
                        }}
                        _active={{
                            transform: "translateY(0px)",
                            bg: "rgba(151, 15, 255, 0.3)"
                        }}
                    />
                </MotionBox>
            )}

            {/* Chat Interface - shows when chat is open */}
            <AnimatePresence>
                {isOpen && (
                    <MotionBox
                        position="fixed"
                        bottom="20px"
                        right="20px"
                        width={isMinimized ? "80px" : "400px"}
                        height={isMinimized ? "80px" : "600px"}
                        bg="rgba(0, 0, 0, 0.85)"
                        backdropFilter="blur(20px)"
                        borderRadius="xl"
                        boxShadow="0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                        border="1px solid rgba(255, 255, 255, 0.1)"
                        zIndex="1000"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        display="flex"
                        flexDirection="column"
                        overflow="hidden"
                    >
                        {/* Header */}
                        <Flex
                            p={4}
                            borderBottom="1px solid rgba(151, 15, 255, 0.2)"
                            align="center"
                            justify="space-between"
                            bg="rgba(151, 15, 255, 0.15)"
                            backdropFilter="blur(10px)"
                            color="white"
                            borderTopRadius="xl"
                            cursor={isMinimized ? "pointer" : "default"}
                            onClick={isMinimized ? onToggle : undefined}
                            position="relative"
                            _before={{
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "1px",
                                bg: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)"
                            }}
                        >
                            <HStack spacing={3}>
                                {!isMinimized && (
                                    <>
                                        <Avatar
                                            size="sm"
                                            name="Alice"
                                            bg="rgba(151, 15, 255, 0.3)"
                                            color="white"
                                            border="1px solid rgba(255, 255, 255, 0.2)"
                                        />
                                        <VStack align="start" spacing={0}>
                                            <Text fontWeight="bold" fontSize="sm" color="white">Alice - Legal AI</Text>
                                            <Text fontSize="xs" color="rgba(255, 255, 255, 0.7)">Online</Text>
                                        </VStack>
                                    </>
                                )}
                            </HStack>
                            {!isMinimized && (
                                <HStack spacing={1}>
                                    <IconButton
                                        aria-label="Minimize chat"
                                        icon={<FiMinimize2 />}
                                        size="sm"
                                        variant="ghost"
                                        color="white"
                                        bg="rgba(255, 255, 255, 0.1)"
                                        _hover={{
                                            bg: "rgba(255, 255, 255, 0.2)",
                                            backdropFilter: "blur(10px)"
                                        }}
                                        onClick={onToggle}
                                        borderRadius="lg"
                                    />
                                    <IconButton
                                        aria-label="Close chat"
                                        icon={<FiX />}
                                        size="sm"
                                        variant="ghost"
                                        color="white"
                                        bg="rgba(255, 255, 255, 0.1)"
                                        _hover={{
                                            bg: "rgba(255, 255, 255, 0.2)",
                                            backdropFilter: "blur(10px)"
                                        }}
                                        onClick={onClose}
                                        borderRadius="lg"
                                    />
                                </HStack>
                            )}
                        </Flex>

                        {!isMinimized && (
                            <>
                                {/* Messages */}
                                <VStack
                                    flex="1"
                                    spacing={3}
                                    p={4}
                                    align="stretch"
                                    overflowY="auto"
                                    maxH="400px"
                                    bg="rgba(0, 0, 0, 0.2)"
                                    css={{
                                        '&::-webkit-scrollbar': {
                                            width: '6px',
                                        },
                                        '&::-webkit-scrollbar-track': {
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '3px',
                                        },
                                        '&::-webkit-scrollbar-thumb': {
                                            background: 'rgba(151, 15, 255, 0.5)',
                                            borderRadius: '3px',
                                        },
                                        '&::-webkit-scrollbar-thumb:hover': {
                                            background: 'rgba(151, 15, 255, 0.7)',
                                        },
                                    }}
                                >
                                    {messages.map((message) => (
                                        <Flex
                                            key={message.id}
                                            justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                                        >
                                            <Box
                                                maxW="80%"
                                                p={3}
                                                borderRadius="xl"
                                                bg={message.sender === 'user'
                                                    ? 'rgba(151, 15, 255, 0.8)'
                                                    : 'rgba(255, 255, 255, 0.1)'
                                                }
                                                backdropFilter="blur(10px)"
                                                border="1px solid"
                                                borderColor={message.sender === 'user'
                                                    ? 'rgba(151, 15, 255, 0.3)'
                                                    : 'rgba(255, 255, 255, 0.2)'
                                                }
                                                color="white"
                                                boxShadow={message.sender === 'user'
                                                    ? '0 8px 20px rgba(151, 15, 255, 0.3)'
                                                    : '0 8px 20px rgba(0, 0, 0, 0.3)'
                                                }
                                                position="relative"
                                                _before={message.sender === 'user' ? {
                                                    content: '""',
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    bg: "linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent)",
                                                    borderRadius: "xl",
                                                    pointerEvents: "none"
                                                } : {}}
                                            >
                                                <FormattedChatMessage
                                                    text={message.text}
                                                    onNavigateToGenerate={message.sender === 'bot' ? () => navigate('/generate') : undefined}
                                                />
                                                <Text
                                                    fontSize="xs"
                                                    opacity={0.7}
                                                    mt={1}
                                                >
                                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </Box>
                                        </Flex>
                                    ))}
                                    {isLoading && (
                                        <Flex justify="flex-start">
                                            <Box
                                                p={3}
                                                borderRadius="xl"
                                                bg="rgba(255, 255, 255, 0.1)"
                                                backdropFilter="blur(10px)"
                                                border="1px solid rgba(255, 255, 255, 0.2)"
                                                boxShadow="0 8px 20px rgba(0, 0, 0, 0.3)"
                                            >
                                                <HStack spacing={2}>
                                                    <Spinner size="sm" color="rgba(151, 15, 255, 0.8)" />
                                                    <Text fontSize="sm" color="white">Alice is thinking...</Text>
                                                </HStack>
                                            </Box>
                                        </Flex>
                                    )}
                                    <div ref={messagesEndRef} />
                                </VStack>

                                {/* Quick Suggestions */}
                                <HStack spacing={2} px={4} py={2} overflowX="auto" css={{ '&::-webkit-scrollbar': { display: 'none' } }}>
                                    {['Draft NDA', 'Explain Indemnity', 'Loan Checklist', 'Employment Terms'].map((suggestion) => (
                                        <Box
                                            key={suggestion}
                                            as="button"
                                            fontSize="xs"
                                            px={3}
                                            py={1.5}
                                            borderRadius="full"
                                            bg="rgba(151, 15, 255, 0.15)"
                                            color="brand.200"
                                            border="1px solid rgba(151, 15, 255, 0.3)"
                                            whiteSpace="nowrap"
                                            cursor="pointer"
                                            minH="32px"
                                            _hover={{
                                                bg: 'rgba(151, 15, 255, 0.3)',
                                                color: 'white',
                                                transform: 'translateY(-1px)',
                                            }}
                                            onClick={() => {
                                                setInputValue(suggestion)
                                                sendMessage(suggestion)
                                            }}
                                        >
                                            {suggestion}
                                        </Box>
                                    ))}
                                </HStack>

                                {/* Input */}
                                <Box
                                    p={4}
                                    borderTop="1px solid rgba(151, 15, 255, 0.2)"
                                    bg="rgba(255, 255, 255, 0.05)"
                                    backdropFilter="blur(10px)"
                                    borderBottomRadius="xl"
                                >
                                    <HStack spacing={2}>
                                        <Input
                                            ref={inputRef}
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="Ask a legal question..."
                                            size="sm"
                                            onKeyPress={handleKeyPress}
                                            disabled={isLoading}
                                            color="white"
                                            bg="rgba(255, 255, 255, 0.1)"
                                            backdropFilter="blur(10px)"
                                            border="1px solid rgba(255, 255, 255, 0.2)"
                                            borderRadius="lg"
                                            _placeholder={{ color: "rgba(255, 255, 255, 0.6)" }}
                                            _focus={{
                                                borderColor: "rgba(151, 15, 255, 0.8)",
                                                boxShadow: "0 0 0 2px rgba(151, 15, 255, 0.3)",
                                                bg: "rgba(255, 255, 255, 0.15)"
                                            }}
                                            _hover={{
                                                bg: "rgba(255, 255, 255, 0.15)"
                                            }}
                                        />
                                        <IconButton
                                            aria-label="Send message"
                                            icon={<FiSend />}
                                            size="sm"
                                            bg="rgba(151, 15, 255, 0.8)"
                                            color="white"
                                            backdropFilter="blur(10px)"
                                            border="1px solid rgba(151, 15, 255, 0.3)"
                                            borderRadius="lg"
                                            _hover={{
                                                bg: "rgba(151, 15, 255, 0.9)",
                                                transform: "translateY(-1px)",
                                                boxShadow: "0 4px 12px rgba(151, 15, 255, 0.4)"
                                            }}
                                            _active={{
                                                transform: "translateY(0)"
                                            }}
                                            onClick={handleSendMessage}
                                            disabled={!inputValue.trim() || isLoading}
                                        />
                                    </HStack>
                                </Box>
                            </>
                        )}
                    </MotionBox>
                )}
            </AnimatePresence>
        </>
    )
}

export default Chatbot
