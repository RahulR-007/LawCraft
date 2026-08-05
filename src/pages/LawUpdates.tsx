import React, { useState, useEffect } from 'react'
import {
    Box,
    Container,
    Heading,
    Text,
    VStack,
    HStack,
    Badge,
    Card,
    CardBody,
    Select,
    Input,
    InputGroup,
    InputLeftElement,
    Spinner,
    Alert,
    AlertIcon,
    useColorMode,
    Flex,
    Tag,
    TagLabel,
    Tooltip,
    Button,
    Divider,
    Link,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import {
    FiSearch,
    FiGlobe,
    FiCalendar,
    FiAlertTriangle,
    FiExternalLink,
    FiRefreshCw,
    FiBookOpen,
    FiShield,
    FiFileText,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import FloatingNavigation from '../components/FloatingNavigation'
import Chatbot from '../components/Chatbot'
import { fetchLawUpdates } from '../lib/secureClient'
import { FiCpu, FiArrowRight } from 'react-icons/fi'

const MotionBox = motion(Box)

interface LawUpdate {
    id: string
    law_title: string
    law_category: string
    summary: string
    effective_date: string | null
    published_date: string
    impact_areas: string[]
    status: string
    source_url: string
}

const CATEGORY_COLORS: Record<string, string> = {
    data_protection: '#00d4ff',
    criminal_law: '#ff4757',
    evidence_law: '#ffa502',
    dispute_resolution: '#7c4dff',
    employment_law: '#2ed573',
    corporate_law: '#1e90ff',
    financial_regulation: '#ff6b81',
    real_estate: '#26de81',
    legislation: '#a55eea',
    gazette: '#fd9644',
    ministry: '#3867d6',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    data_protection: FiShield,
    criminal_law: FiAlertTriangle,
    evidence_law: FiFileText,
    dispute_resolution: FiBookOpen,
    employment_law: FiFileText,
    corporate_law: FiGlobe,
    financial_regulation: FiShield,
    real_estate: FiGlobe,
}

const IMPACT_LABELS: Record<string, string> = {
    contract: 'Contracts',
    nda: 'NDAs',
    employment: 'Employment',
    loan: 'Loans',
    lease: 'Leases',
}

const LawUpdates: React.FC = () => {
    const navigate = useNavigate()
    const { colorMode } = useColorMode()
    const [updates, setUpdates] = useState<LawUpdate[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterImpact, setFilterImpact] = useState('all')
    const [jurisdiction, setJurisdiction] = useState('IN')

    useEffect(() => {
        loadUpdates()
    }, [jurisdiction])

    const loadUpdates = async () => {
        setLoading(true)
        try {
            const data = await fetchLawUpdates(jurisdiction, 50)
            setUpdates(data as LawUpdate[])
        } catch (err) {
            console.error('Failed to load law updates:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredUpdates = updates.filter((update) => {
        const matchesSearch =
            update.law_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            update.summary.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = filterCategory === 'all' || update.law_category === filterCategory
        const matchesImpact =
            filterImpact === 'all' || update.impact_areas?.includes(filterImpact)
        return matchesSearch && matchesCategory && matchesImpact
    })

    const categories = [...new Set(updates.map((u) => u.law_category))]

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'TBD'
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    return (
        <Box
            minH="100vh"
            bg={colorMode === 'dark' ? '#08090d' : '#f8f9fd'}
            position="relative"
            pb={20}
        >
            <FloatingNavigation />

            {/* Ambient glow */}
            <Box
                position="absolute"
                top="5%"
                right="10%"
                w="400px"
                h="400px"
                borderRadius="50%"
                bg="rgba(0, 212, 255, 0.08)"
                filter="blur(100px)"
                pointerEvents="none"
            />
            <Box
                position="absolute"
                bottom="10%"
                left="5%"
                w="350px"
                h="350px"
                borderRadius="50%"
                bg="rgba(151, 15, 255, 0.08)"
                filter="blur(100px)"
                pointerEvents="none"
            />

            <Container maxW="6xl" pt={{ base: '80px', md: '100px' }} px={{ base: 4, md: 8 }}>
                <VStack spacing={8} align="stretch">
                    {/* Header */}
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <VStack spacing={4} align="start">
                            <HStack spacing={3}>
                                <Box
                                    p={3}
                                    borderRadius="xl"
                                    bg="linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(151, 15, 255, 0.2))"
                                    border="1px solid rgba(0, 212, 255, 0.3)"
                                >
                                    <FiGlobe size={28} color="#00d4ff" />
                                </Box>
                                <VStack align="start" spacing={0}>
                                    <Heading
                                        fontSize={{ base: '2xl', md: '3xl' }}
                                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                        fontWeight="800"
                                    >
                                        Law Updates{' '}
                                        <Text as="span" color="#00d4ff">
                                            Feed
                                        </Text>
                                    </Heading>
                                    <Text
                                        color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                                        fontSize="sm"
                                    >
                                        Auto-synced from government gazette sources • Updated daily
                                    </Text>
                                </VStack>
                            </HStack>
                        </VStack>
                    </MotionBox>

                    {/* Filters Bar */}
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        gap={4}
                        p={4}
                        borderRadius="2xl"
                        bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                        backdropFilter="blur(20px)"
                        border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                    >
                        <InputGroup flex={2}>
                            <InputLeftElement pointerEvents="none">
                                <FiSearch color="gray" />
                            </InputLeftElement>
                            <Input
                                placeholder="Search laws, acts, amendments..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                borderRadius="xl"
                                size="sm"
                            />
                        </InputGroup>
                        <Select
                            value={jurisdiction}
                            onChange={(e) => setJurisdiction(e.target.value)}
                            borderRadius="xl"
                            size="sm"
                            flex={1}
                        >
                            <option value="IN">India</option>
                            <option value="US">United States</option>
                            <option value="UK">United Kingdom</option>
                            <option value="EU">European Union</option>
                        </Select>
                        <Select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            borderRadius="xl"
                            size="sm"
                            flex={1}
                        >
                            <option value="all">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                </option>
                            ))}
                        </Select>
                        <Select
                            value={filterImpact}
                            onChange={(e) => setFilterImpact(e.target.value)}
                            borderRadius="xl"
                            size="sm"
                            flex={1}
                        >
                            <option value="all">All Document Types</option>
                            <option value="contract">Contracts</option>
                            <option value="nda">NDAs</option>
                            <option value="employment">Employment</option>
                            <option value="loan">Loans</option>
                            <option value="lease">Leases</option>
                        </Select>
                        <Tooltip label="Refresh from government sources">
                            <Button
                                leftIcon={<FiRefreshCw />}
                                size="sm"
                                borderRadius="xl"
                                variant="outline"
                                borderColor="rgba(0, 212, 255, 0.3)"
                                color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                                onClick={loadUpdates}
                                isLoading={loading}
                                _hover={{ bg: 'rgba(0, 212, 255, 0.1)' }}
                            >
                                Sync
                            </Button>
                        </Tooltip>
                    </Flex>

                    {/* Stats */}
                    <HStack spacing={4} flexWrap="wrap">
                        <Badge
                            bg="rgba(0, 212, 255, 0.15)"
                            color="#00d4ff"
                            px={3}
                            py={1}
                            borderRadius="full"
                            border="1px solid rgba(0, 212, 255, 0.3)"
                        >
                            {filteredUpdates.length} Updates
                        </Badge>
                        <Badge
                            bg="rgba(46, 213, 115, 0.15)"
                            color="#2ed573"
                            px={3}
                            py={1}
                            borderRadius="full"
                            border="1px solid rgba(46, 213, 115, 0.3)"
                        >
                            {filteredUpdates.filter((u) => u.status === 'active').length} Active
                        </Badge>
                    </HStack>

                    {/* Loading State */}
                    {loading && (
                        <VStack spacing={4} py={12}>
                            <Spinner size="xl" color="brand.500" thickness="4px" />
                            <Text color="gray.400">Loading law updates...</Text>
                        </VStack>
                    )}

                    {/* Empty State */}
                    {!loading && filteredUpdates.length === 0 && (
                        <Alert
                            status="info"
                            borderRadius="xl"
                            bg={colorMode === 'dark' ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 212, 255, 0.05)'}
                            border="1px solid rgba(0, 212, 255, 0.2)"
                        >
                            <AlertIcon color="#00d4ff" />
                            <Text>
                                No law updates found for the selected filters. Try adjusting your search or
                                switching jurisdictions.
                            </Text>
                        </Alert>
                    )}

                    {/* Law Updates List */}
                    {!loading && (
                        <VStack spacing={4} align="stretch">
                            {filteredUpdates.map((update, index) => {
                                const categoryColor = CATEGORY_COLORS[update.law_category] || '#970fff'
                                const CategoryIcon = CATEGORY_ICONS[update.law_category] || FiFileText

                                return (
                                    <MotionBox
                                        key={update.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: index * 0.05 }}
                                    >
                                        <Card
                                            bg={colorMode === 'dark' ? 'rgba(13, 15, 23, 0.75)' : 'white'}
                                            backdropFilter="blur(20px)"
                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`}
                                            borderRadius="2xl"
                                            _hover={{
                                                borderColor: `${categoryColor}40`,
                                                boxShadow: `0 8px 30px ${categoryColor}15`,
                                                transform: 'translateY(-2px)',
                                            }}
                                            transition="all 0.3s ease"
                                            overflow="hidden"
                                            position="relative"
                                        >
                                            {/* Accent line */}
                                            <Box
                                                position="absolute"
                                                top={0}
                                                left={0}
                                                w="4px"
                                                h="full"
                                                bg={categoryColor}
                                                borderTopLeftRadius="2xl"
                                                borderBottomLeftRadius="2xl"
                                            />

                                            <CardBody pl={6}>
                                                <VStack align="start" spacing={3}>
                                                    {/* Header row */}
                                                    <Flex
                                                        w="full"
                                                        justify="space-between"
                                                        align="start"
                                                        flexWrap="wrap"
                                                        gap={2}
                                                    >
                                                        <HStack spacing={3} flex={1}>
                                                            <Box
                                                                p={2}
                                                                borderRadius="lg"
                                                                bg={`${categoryColor}20`}
                                                                border={`1px solid ${categoryColor}40`}
                                                            >
                                                                <CategoryIcon
                                                                    size={18}
                                                                    color={categoryColor}
                                                                />
                                                            </Box>
                                                            <VStack align="start" spacing={0}>
                                                                <Heading
                                                                    fontSize={{ base: 'sm', md: 'md' }}
                                                                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                                    fontWeight="700"
                                                                >
                                                                    {update.law_title}
                                                                </Heading>
                                                                <Text
                                                                    fontSize="xs"
                                                                    color="gray.500"
                                                                    textTransform="capitalize"
                                                                >
                                                                    {update.law_category.replace(/_/g, ' ')}
                                                                </Text>
                                                            </VStack>
                                                        </HStack>

                                                        <HStack spacing={2}>
                                                            <Badge
                                                                colorScheme={
                                                                    update.status === 'active' ? 'green' : 'gray'
                                                                }
                                                                borderRadius="full"
                                                                px={2}
                                                                py={0.5}
                                                                fontSize="xs"
                                                            >
                                                                {update.status}
                                                            </Badge>
                                                            {update.source_url && (
                                                                <Link
                                                                    href={update.source_url}
                                                                    isExternal
                                                                    _hover={{ textDecoration: 'none' }}
                                                                >
                                                                    <Button
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        leftIcon={<FiExternalLink />}
                                                                        color="gray.400"
                                                                        _hover={{
                                                                            color: '#00d4ff',
                                                                            bg: 'rgba(0, 212, 255, 0.1)',
                                                                        }}
                                                                    >
                                                                        Source
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                        </HStack>
                                                    </Flex>

                                                    {/* Summary */}
                                                    <Text
                                                        fontSize="sm"
                                                        color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                                                        lineHeight="tall"
                                                    >
                                                        {update.summary}
                                                    </Text>

                                                    <Divider borderColor={colorMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />

                                                    {/* Footer */}
                                                    <Flex
                                                        w="full"
                                                        justify="space-between"
                                                        align="center"
                                                        flexWrap="wrap"
                                                        gap={2}
                                                    >
                                                        {/* Dates */}
                                                        <HStack spacing={4} fontSize="xs" color="gray.500">
                                                            <HStack spacing={1}>
                                                                <FiCalendar size={12} />
                                                                <Text>
                                                                    Published: {formatDate(update.published_date)}
                                                                </Text>
                                                            </HStack>
                                                            {update.effective_date && (
                                                                <HStack spacing={1}>
                                                                    <FiCalendar size={12} />
                                                                    <Text>
                                                                        Effective:{' '}
                                                                        {formatDate(update.effective_date)}
                                                                    </Text>
                                                                </HStack>
                                                            )}
                                                        </HStack>

                                                        {/* Impact Tags & Actions */}
                                                        <HStack spacing={2} flexWrap="wrap">
                                                            {update.impact_areas?.map((area) => (
                                                                <Tag
                                                                    key={area}
                                                                    size="sm"
                                                                    borderRadius="full"
                                                                    bg={`${categoryColor}15`}
                                                                    color={categoryColor}
                                                                    border={`1px solid ${categoryColor}30`}
                                                                >
                                                                    <TagLabel fontSize="xs">
                                                                        {IMPACT_LABELS[area] || area}
                                                                    </TagLabel>
                                                                </Tag>
                                                            ))}
                                                        </HStack>
                                                    </Flex>

                                                    {/* Action Buttons */}
                                                    <HStack spacing={3} pt={2} w="full" justify="flex-end">
                                                        <Button
                                                            size="xs"
                                                            colorScheme="purple"
                                                            leftIcon={<FiCpu />}
                                                            onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
                                                        >
                                                            Analyze Impact
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="outline"
                                                            colorScheme="purple"
                                                            leftIcon={<FiArrowRight />}
                                                            onClick={() => {
                                                                navigate('/generate', {
                                                                    state: {
                                                                        lawCategory: update.law_category,
                                                                        lawTitle: update.law_title,
                                                                        summary: update.summary,
                                                                    }
                                                                })
                                                            }}
                                                        >
                                                            Generate Compliant Contract
                                                        </Button>
                                                    </HStack>
                                                </VStack>
                                            </CardBody>
                                        </Card>
                                    </MotionBox>
                                )
                            })}
                        </VStack>
                    )}
                </VStack>
            </Container>
            <Chatbot />
        </Box>
    )
}

export default LawUpdates
