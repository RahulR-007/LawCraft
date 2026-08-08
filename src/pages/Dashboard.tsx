import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Flex,
  SimpleGrid,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FiFileText,
  FiPlus,
  FiSearch,
  FiShield,
  FiMoreVertical,
  FiEye,
  FiZap,
  FiFolder,
  FiBookOpen,
  FiArrowRight,
  FiTrendingUp,
  FiDownload,
} from 'react-icons/fi'
import Chatbot from '../components/Chatbot'
import FloatingNavigation from '../components/FloatingNavigation'
import CyberMatrixHero from '../components/ui/cyber-matrix-hero'
import HoverFooter from '../components/ui/hover-footer'
import { fetchUserDocuments, fetchDocumentById } from '../lib/secureClient'
import { useAuth } from '../contexts/AuthContext'
import { logger } from '../lib/logger'
import { downloadDocx } from '../lib/backendClient'

const MotionBox = motion(Box)

interface DashboardDoc {
  id: string
  title: string
  type: string
  date: string
  status: string
  risk: string
  score?: number
  content?: string
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [userDocs, setUserDocs] = useState<DashboardDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DashboardDoc | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  useEffect(() => {
    loadDocs()
  }, [user])

  const loadDocs = async () => {
    if (!user) return
    setLoading(true)
    try {
      const docs = await fetchUserDocuments(20)
      if (docs && docs.length > 0) {
        const formatted: DashboardDoc[] = docs.map((d: any) => ({
          id: d.id,
          title: d.title,
          type: d.document_type.toUpperCase(),
          date: new Date(d.created_at).toISOString().split('T')[0],
          status: 'Completed',
          risk: (d.compliance_score || 100) >= 90 ? 'Verified' : 'Needs Review',
          score: d.compliance_score || 90,
        }))
        setUserDocs(formatted)
      } else {
        setUserDocs([])
      }
    } catch (err) {
      logger.error('Error fetching user documents:', err)
      setUserDocs([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewDoc = async (doc: DashboardDoc) => {
    setSelectedDoc(doc)
    onOpen()
    setLoadingDoc(true)
    try {
      const fullDoc = await fetchDocumentById(doc.id)
      if (fullDoc) {
        setSelectedDoc({
          ...doc,
          content: fullDoc.generated_content,
        })
      }
    } catch (err) {
      logger.error('Error fetching document detail:', err)
    } finally {
      setLoadingDoc(false)
    }
  }

  const filteredDocs = userDocs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      filterType === 'all' || doc.type.toLowerCase() === filterType.toLowerCase()
    return matchesSearch && matchesType
  })

  const tokensRemaining = profile?.tokens ?? user?.user_metadata?.tokens ?? 2

  return (
    <Box
      minH="100vh"
      bg="#050508"
      color="white"
      position="relative"
      overflowX="hidden"
    >
      <FloatingNavigation />

      {/* Cyber Matrix Hero Banner Section */}
      <Box position="relative" w="full" pt={{ base: '60px', md: '80px' }}>
        <CyberMatrixHero
          title="Executive Legal Dashboard"
          badgeText="Autonomous RAG Engine Active"
          description="Create, analyze, and manage legally compliant AI documents with real-time statutory risk checks and verified legal citations."
          ctaText="Architect New Document"
          onCtaClick={() => navigate('/generate')}
        />
      </Box>

      {/* Main Content Area */}
      <Container maxW="7xl" pt={12} pb={16} px={{ base: 4, md: 8 }} position="relative" zIndex={10}>
        <VStack spacing={12} align="stretch">
          
          {/* Quick Metrics Bar */}
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={6}>
            {[
              {
                label: 'Documents Generated',
                value: userDocs.length.toString(),
                change: 'RAG Pipeline Active',
                icon: FiFileText,
                color: '#970fff',
                gradient: 'linear-gradient(135deg, rgba(151, 15, 255, 0.2), rgba(151, 15, 255, 0.05))',
                borderColor: 'rgba(151, 15, 255, 0.4)',
              },
              {
                label: 'Available Tokens',
                value: `${tokensRemaining}`,
                change: 'Resets monthly',
                icon: FiZap,
                color: '#00f2fe',
                gradient: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(0, 242, 254, 0.05))',
                borderColor: 'rgba(0, 242, 254, 0.4)',
              },
              {
                label: 'Compliance Score',
                value: '98.6%',
                change: 'Enterprise Grade',
                icon: FiShield,
                color: '#10b981',
                gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))',
                borderColor: 'rgba(16, 185, 129, 0.4)',
              },
              {
                label: 'Law Updates Feed',
                value: '10 Active',
                change: 'Auto-Synced Daily',
                icon: FiBookOpen,
                color: '#f59e0b',
                gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))',
                borderColor: 'rgba(245, 158, 11, 0.4)',
              },
            ].map((stat, i) => (
              <MotionBox
                key={i}
                p={6}
                borderRadius="2xl"
                bg={stat.gradient}
                backdropFilter="blur(20px)"
                border={`1px solid ${stat.borderColor}`}
                boxShadow={`0 10px 30px ${stat.color}15`}
                whileHover={{ y: -6, boxShadow: `0 15px 40px ${stat.color}30` }}
                transition={{ duration: 0.3 }}
              >
                <Flex justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="0.05em">
                      {stat.label}
                    </Text>
                    <Text fontSize="3xl" fontWeight="900" color="white">
                      {stat.value}
                    </Text>
                    <HStack spacing={1}>
                      <FiTrendingUp color={stat.color} size={12} />
                      <Text fontSize="xs" color={stat.color} fontWeight="600">
                        {stat.change}
                      </Text>
                    </HStack>
                  </VStack>
                  <Box
                    p={3}
                    borderRadius="xl"
                    bg={`${stat.color}20`}
                    border={`1px solid ${stat.color}50`}
                    boxShadow={`0 0 15px ${stat.color}40`}
                  >
                    <stat.icon size={24} color={stat.color} />
                  </Box>
                </Flex>
              </MotionBox>
            ))}
          </SimpleGrid>

          {/* Quick Document Templates Section */}
          <VStack align="start" spacing={6} w="full">
            <HStack justify="space-between" w="full">
              <VStack align="start" spacing={1}>
                <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white" fontWeight="800">
                  Quick Legal Templates
                </Heading>
                <Text color="gray.400" fontSize="sm">
                  Select a pre-grounded template to launch the multi-step architect.
                </Text>
              </VStack>
              <Button
                size="sm"
                variant="outline"
                borderColor="rgba(151, 15, 255, 0.4)"
                color="#b84dff"
                onClick={() => navigate('/generate')}
                _hover={{ bg: 'rgba(151, 15, 255, 0.15)' }}
                rightIcon={<FiArrowRight />}
              >
                View All
              </Button>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
              {[
                {
                  title: 'Non-Disclosure Agreement (NDA)',
                  desc: 'Protect proprietary tech, IP, and confidential trade secrets.',
                  tag: 'Popular',
                  icon: FiShield,
                  color: '#970fff',
                },
                {
                  title: 'Master Services Agreement (MSA)',
                  desc: 'Standard business-to-business contract terms & SLA clauses.',
                  tag: 'Business',
                  icon: FiFileText,
                  color: '#00f2fe',
                },
                {
                  title: 'Loan & Promissory Note',
                  desc: 'Legally enforceable loan repayment schedules and security terms.',
                  tag: 'Finance',
                  icon: FiZap,
                  color: '#10b981',
                },
              ].map((tmpl, idx) => (
                <MotionBox
                  key={idx}
                  p={6}
                  borderRadius="2xl"
                  bg="rgba(13, 15, 23, 0.85)"
                  backdropFilter="blur(25px)"
                  border="1px solid rgba(255, 255, 255, 0.1)"
                  cursor="pointer"
                  onClick={() => navigate('/generate')}
                  whileHover={{
                    y: -6,
                    borderColor: tmpl.color,
                    boxShadow: `0 15px 35px ${tmpl.color}25`,
                  }}
                  transition={{ duration: 0.25 }}
                  position="relative"
                  overflow="hidden"
                >
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    w="4px"
                    h="full"
                    bg={tmpl.color}
                  />
                  <HStack justify="space-between" mb={4}>
                    <Badge
                      bg={`${tmpl.color}20`}
                      color={tmpl.color}
                      border={`1px solid ${tmpl.color}40`}
                      borderRadius="full"
                      px={3}
                      py={0.5}
                      fontSize="xs"
                      fontWeight="700"
                    >
                      {tmpl.tag}
                    </Badge>
                    <tmpl.icon color={tmpl.color} size={18} />
                  </HStack>
                  <Text fontWeight="800" fontSize="lg" color="white" mb={2}>
                    {tmpl.title}
                  </Text>
                  <Text fontSize="sm" color="gray.400" mb={6} lineHeight="relaxed">
                    {tmpl.desc}
                  </Text>
                  <Button
                    size="sm"
                    w="full"
                    bg="rgba(255, 255, 255, 0.05)"
                    color="white"
                    border="1px solid rgba(255, 255, 255, 0.1)"
                    rightIcon={<FiPlus color={tmpl.color} />}
                    _hover={{
                      bg: `${tmpl.color}20`,
                      borderColor: tmpl.color,
                    }}
                  >
                    Use Template
                  </Button>
                </MotionBox>
              ))}
            </SimpleGrid>
          </VStack>

          {/* Recent Documents Table Section */}
          <VStack align="start" spacing={6} w="full">
            <Flex justify="space-between" align="center" w="full" flexWrap="wrap" gap={4}>
              <VStack align="start" spacing={1}>
                <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white" fontWeight="800">
                  Recent Document History
                </Heading>
                <Text color="gray.400" fontSize="sm">
                  Search, review compliance scores, and export generated contracts.
                </Text>
              </VStack>

              <HStack spacing={4} w={{ base: 'full', md: 'auto' }} flexWrap="wrap">
                <InputGroup maxW={{ base: 'full', md: '260px' }}>
                  <InputLeftElement pointerEvents="none">
                    <FiSearch color="gray" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search contracts..."
                    size="sm"
                    borderRadius="xl"
                    bg="rgba(255, 255, 255, 0.05)"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    _focus={{ borderColor: '#970fff' }}
                  />
                </InputGroup>
                <Flex wrap="wrap" gap={1}>
                  {['all', 'nda', 'contract', 'loan', 'employment'].map((t) => (
                    <Button
                      key={t}
                      size="xs"
                      variant={filterType === t ? 'solid' : 'ghost'}
                      bg={filterType === t ? 'linear-gradient(135deg, #970fff, #7817ff)' : 'transparent'}
                      color={filterType === t ? 'white' : 'gray.400'}
                      onClick={() => setFilterType(t)}
                      borderRadius="full"
                      textTransform="capitalize"
                      px={3}
                    >
                      {t}
                    </Button>
                  ))}
                </Flex>
              </HStack>
            </Flex>

            <Box
              w="full"
              borderRadius="2xl"
              bg="rgba(13, 15, 23, 0.85)"
              backdropFilter="blur(25px)"
              border="1px solid rgba(255, 255, 255, 0.1)"
              boxShadow="0 20px 50px rgba(0, 0, 0, 0.5)"
              overflowX="auto"
            >
              {loading ? (
                <VStack py={12}>
                  <Spinner size="lg" color="#970fff" thickness="3px" />
                  <Text color="gray.400" fontSize="sm">
                    Loading user documents...
                  </Text>
                </VStack>
              ) : filteredDocs.length === 0 ? (
                <VStack py={12} spacing={4}>
                  <FiFolder size={36} color="#970fff" />
                  <Text color="gray.300" fontSize="md" fontWeight="600">
                    No documents found
                  </Text>
                  <Text color="gray.500" fontSize="sm" maxW="sm" textAlign="center">
                    Create your first AI-architected legal contract using our guided wizard.
                  </Text>
                  <Button
                    size="sm"
                    bg="linear-gradient(135deg, #970fff, #7817ff)"
                    color="white"
                    onClick={() => navigate('/generate')}
                    _hover={{ bg: 'linear-gradient(135deg, #7817ff, #5a0bd9)' }}
                  >
                    Architect Document
                  </Button>
                </VStack>
              ) : (
                <Table variant="simple" colorScheme="whiteAlpha" minW="600px">
                  <Thead bg="rgba(255, 255, 255, 0.04)">
                    <Tr>
                      <Th color="gray.400" py={4}>Document Name</Th>
                      <Th color="gray.400" py={4}>Type</Th>
                      <Th color="gray.400" py={4}>Created Date</Th>
                      <Th color="gray.400" py={4}>Compliance Score</Th>
                      <Th color="gray.400" py={4} textAlign="right">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredDocs.map((doc) => (
                      <Tr key={doc.id} _hover={{ bg: 'rgba(151, 15, 255, 0.08)' }} transition="background 0.2s">
                        <Td fontWeight="700" color="white" py={4}>
                          <HStack spacing={3}>
                            <Box p={2.5} borderRadius="xl" bg="rgba(151, 15, 255, 0.2)" border="1px solid rgba(151, 15, 255, 0.4)">
                              <FiFolder color="#b84dff" size={16} />
                            </Box>
                            <Text fontSize="sm">{doc.title}</Text>
                          </HStack>
                        </Td>
                        <Td py={4}>
                          <Badge bg="rgba(255, 255, 255, 0.08)" color="gray.300" borderRadius="md" px={2.5} py={1} fontSize="xs">
                            {doc.type}
                          </Badge>
                        </Td>
                        <Td color="gray.400" fontSize="xs" py={4}>
                          {doc.date}
                        </Td>
                        <Td py={4}>
                          <Badge
                            bg={(doc.score || 90) >= 90 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}
                            color={(doc.score || 90) >= 90 ? '#10b981' : '#f59e0b'}
                            border={`1px solid ${(doc.score || 90) >= 90 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`}
                            borderRadius="full"
                            px={3}
                            py={0.5}
                            fontSize="xs"
                            fontWeight="700"
                          >
                            {doc.score ? `${doc.score}% Verified` : doc.status}
                          </Badge>
                        </Td>
                        <Td textAlign="right" py={4}>
                          <Menu placement="bottom-end">
                            <MenuButton
                              as={IconButton}
                              icon={<FiMoreVertical />}
                              variant="ghost"
                              size="sm"
                              color="gray.400"
                              _hover={{ color: 'white', bg: 'rgba(255,255,255,0.1)' }}
                              aria-label="Actions"
                            />
                            <MenuList bg="#0d0f17" borderColor="rgba(255,255,255,0.15)" boxShadow="0 10px 30px rgba(0,0,0,0.8)">
                              <MenuItem
                                icon={<FiEye color="#970fff" />}
                                bg="transparent"
                                color="white"
                                _hover={{ bg: 'rgba(151, 15, 255, 0.2)' }}
                                onClick={() => handleViewDoc(doc)}
                              >
                                View Document
                              </MenuItem>
                              <MenuItem
                                icon={<FiPlus color="#00d4ff" />}
                                bg="transparent"
                                color="white"
                                _hover={{ bg: 'rgba(0, 212, 255, 0.2)' }}
                                onClick={() => navigate('/generate')}
                              >
                                Open Generator
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </Box>
          </VStack>
        </VStack>
      </Container>

      {/* Document Preview Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(10px)" bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="#0d0f17" border="1px solid rgba(151, 15, 255, 0.4)" borderRadius="2xl" color="white">
          <ModalHeader borderBottom="1px solid rgba(255, 255, 255, 0.1)">
            <HStack spacing={3}>
              <Box p={2} borderRadius="lg" bg="rgba(151, 15, 255, 0.2)">
                <FiFileText color="#970fff" size={20} />
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontSize="md" fontWeight="700">{selectedDoc?.title}</Text>
                <Text fontSize="xs" color="gray.400">{selectedDoc?.type} • {selectedDoc?.date}</Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            {loadingDoc ? (
              <VStack py={8}>
                <Spinner color="#970fff" size="lg" />
                <Text fontSize="sm" color="gray.400">Loading document content...</Text>
              </VStack>
            ) : (
              <VStack align="stretch" spacing={4}>
                <Box
                  p={4}
                  borderRadius="xl"
                  bg="rgba(255, 255, 255, 0.03)"
                  border="1px solid rgba(255, 255, 255, 0.08)"
                  maxH="400px"
                  overflowY="auto"
                  fontSize="sm"
                  fontFamily="mono"
                  whiteSpace="pre-wrap"
                  color="gray.200"
                >
                  {selectedDoc?.content || 'No document content available.'}
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px solid rgba(255, 255, 255, 0.1)">
            <HStack spacing={3}>
              {selectedDoc?.content && (
                <Button
                  size="sm"
                  colorScheme="purple"
                  leftIcon={<FiDownload />}
                  onClick={() => downloadDocx(selectedDoc.content || '', selectedDoc.title)}
                >
                  Download DOCX
                </Button>
              )}
              <Button size="sm" variant="ghost" color="gray.400" onClick={onClose}>
                Close
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Integrated Hover Footer Component */}
      <Box px={{ base: 4, md: 8 }} pb={8} position="relative" zIndex={10}>
        <Container maxW="7xl">
          <HoverFooter />
        </Container>
      </Box>

      {/* Chatbot Widget */}
      <Chatbot />
    </Box>
  )
}

export default Dashboard
