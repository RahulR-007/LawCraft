import React from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Grid,
  Badge,
  SimpleGrid,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import {
  FiArrowRight,
  FiShield,
  FiFileText,
  FiUsers,
  FiZap,
  FiBookOpen,
  FiCheckCircle,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import CyberMatrixHero from '../components/ui/cyber-matrix-hero'
import HoverFooter from '../components/ui/hover-footer'
import FloatingNavigation from '../components/FloatingNavigation'
import Chatbot from '../components/Chatbot'

const MotionBox = motion(Box)

const Landing: React.FC = () => {
  const navigate = useNavigate()

  const documents = [
    {
      id: 'nda',
      title: 'Non-Disclosure Agreement',
      category: 'IP & Confidentiality',
      description: 'Comprehensive NDA templates tailored to protect proprietary trade secrets and technical IP.',
      icon: FiShield,
      color: '#970fff',
    },
    {
      id: 'contract',
      title: 'Master Services Agreement',
      category: 'Commercial Contracts',
      description: 'B2B service agreements with customizable scope, payment milestones, and SLA guarantees.',
      icon: FiFileText,
      color: '#00f2fe',
    },
    {
      id: 'employment',
      title: 'Employment Contract',
      category: 'HR & Labor Compliance',
      description: 'Fully compliant employment contracts covering CTC structures, leave policy, and non-compete clauses.',
      icon: FiUsers,
      color: '#2ed573',
    },
    {
      id: 'loan',
      title: 'Loan & Promissory Note',
      category: 'Financial Agreements',
      description: 'Enforceable loan instruments detailing interest rates, repayment tenure, and default remedies.',
      icon: FiZap,
      color: '#f59e0b',
    },
    {
      id: 'lease',
      title: 'Lease & Rental Agreement',
      category: 'Real Estate & Property',
      description: 'Residential and commercial rental agreements covering security deposits, terms, and obligations.',
      icon: FiBookOpen,
      color: '#ec4899',
    },
  ]

  return (
    <Box minH="100vh" bg="#050508" color="white" position="relative" overflowX="hidden">
      <FloatingNavigation />

      {/* Hero Section with Interactive Cyber Matrix */}
      <Box position="relative" w="full">
        <CyberMatrixHero
          title="LawCraft Protocol"
          badgeText="Autonomous Legal Intelligence Engine"
          description="A new layer for modern legal architecture. Draft, analyze, and enforce legally sound contracts powered by real-time RAG intelligence and verified government statutes."
          ctaText="Start Drafting Contracts"
          onCtaClick={() => navigate('/generate')}
        />
      </Box>

      {/* Feature / Work Section */}
      <Box py={24} position="relative" zIndex={10} bg="linear-gradient(180deg, #050508 0%, #0d0f17 100%)">
        <Container maxW="7xl" px={{ base: 4, md: 8 }}>
          <VStack spacing={16} align="center" textAlign="center">
            
            <VStack spacing={4} maxW="3xl">
              <Badge
                bg="rgba(151, 15, 255, 0.2)"
                color="#b84dff"
                px={4}
                py={1}
                borderRadius="full"
                border="1px solid rgba(151, 15, 255, 0.4)"
                fontSize="xs"
                fontWeight="700"
                letterSpacing="0.05em"
              >
                AUTOMATED LEGAL ARCHITECTURE
              </Badge>
              <Heading fontSize={{ base: '3xl', md: '5xl' }} fontWeight="900" color="white">
                Engineered for <Text as="span" color="#970fff">Precision</Text> & Compliance
              </Heading>
              <Text fontSize="lg" color="gray.400">
                Ground every document in official statutory references with real-time compliance scoring and automated risk analysis.
              </Text>
            </VStack>

            {/* Document Cards Grid */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} w="full">
              {documents.map((doc, idx) => (
                <MotionBox
                  key={idx}
                  p={8}
                  borderRadius="3xl"
                  bg="rgba(13, 15, 23, 0.85)"
                  backdropFilter="blur(20px)"
                  border="1px solid rgba(255, 255, 255, 0.1)"
                  whileHover={{ y: -8, borderColor: doc.color, boxShadow: `0 20px 40px ${doc.color}20` }}
                  transition={{ duration: 0.3 }}
                  textAlign="left"
                  display="flex"
                  flexDirection="column"
                  justifyContent="space-between"
                >
                  <VStack align="start" spacing={4}>
                    <Box
                      p={3.5}
                      borderRadius="2xl"
                      bg={`${doc.color}20`}
                      border={`1px solid ${doc.color}50`}
                    >
                      <doc.icon size={24} color={doc.color} />
                    </Box>
                    <Badge colorScheme="purple" borderRadius="full" px={2.5} fontSize="10px">
                      {doc.category}
                    </Badge>
                    <Heading fontSize="xl" fontWeight="800" color="white">
                      {doc.title}
                    </Heading>
                    <Text fontSize="sm" color="gray.400" lineHeight="relaxed">
                      {doc.description}
                    </Text>
                  </VStack>

                  <Button
                    mt={6}
                    size="sm"
                    variant="ghost"
                    color={doc.color}
                    rightIcon={<FiArrowRight />}
                    onClick={() => navigate(`/generate?template=${doc.id}`, { state: { template: doc.id } })}
                    _hover={{ bg: `${doc.color}15` }}
                    p={0}
                    justifyContent="start"
                  >
                    Use Template
                  </Button>
                </MotionBox>
              ))}
            </SimpleGrid>

          </VStack>
        </Container>
      </Box>

      {/* Platform Capabilities / About Section */}
      <Box py={24} position="relative" zIndex={10} bg="#050508">
        <Container maxW="7xl" px={{ base: 4, md: 8 }}>
          <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={12} alignItems="center">
            
            <VStack align="start" spacing={6}>
              <Badge
                bg="rgba(16, 185, 129, 0.15)"
                color="#10b981"
                px={3}
                py={1}
                borderRadius="full"
                border="1px solid rgba(16, 185, 129, 0.3)"
                fontSize="xs"
                fontWeight="700"
              >
                STATUTORY CLAUSE KNOWLEDGE BASE
              </Badge>
              <Heading fontSize={{ base: '3xl', md: '4xl' }} fontWeight="800" color="white">
                Beyond Standard Boilerplate — Legal Engineering Grounded in Law
              </Heading>
              <Text fontSize="md" color="gray.400" lineHeight="relaxed">
                LawCraft references 25+ vetted legal clause definitions across Indian, US, UK, and EU jurisdictions. Every generated contract is validated server-side for mandatory elements.
              </Text>

              <VStack align="start" spacing={3} w="full" pt={2}>
                {[
                  'Server-Side API Key Isolation & JWT Auth',
                  'Per-User Token Quotas & Rate-Limit Protections',
                  'Automated Government Law Feed (DPDP, BNS, BSA, Labor Codes)',
                  'Client-Side High Resolution DOCX Exporter',
                ].map((item, i) => (
                  <HStack key={i} spacing={3}>
                    <FiCheckCircle color="#10b981" size={18} />
                    <Text fontSize="sm" color="gray.200" fontWeight="600">
                      {item}
                    </Text>
                  </HStack>
                ))}
              </VStack>

              <HStack spacing={4} pt={4}>
                <Button
                  size="lg"
                  bg="linear-gradient(135deg, #970fff, #7817ff)"
                  color="white"
                  rightIcon={<FiArrowRight />}
                  onClick={() => navigate('/generate')}
                  boxShadow="0 8px 25px rgba(151, 15, 255, 0.4)"
                  _hover={{ transform: 'translateY(-2px)' }}
                >
                  Get Started Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  borderColor="rgba(255,255,255,0.2)"
                  color="gray.300"
                  onClick={() => navigate('/law-updates')}
                  _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                >
                  Explore Law Feed
                </Button>
              </HStack>
            </VStack>

            {/* Stat Showcase Box */}
            <Box
              p={{ base: 5, md: 8 }}
              borderRadius="3xl"
              bg="linear-gradient(135deg, rgba(13, 15, 23, 0.95), rgba(26, 10, 46, 0.8))"
              border="1px solid rgba(151, 15, 255, 0.3)"
              boxShadow="0 25px 60px rgba(0, 0, 0, 0.6)"
            >
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={{ base: 6, md: 8 }}>
                <VStack align="start" spacing={1}>
                  <Text fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }} fontWeight="900" color="#970fff">Verified</Text>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="700">Statutory Risk Analysis</Text>
                </VStack>
                <VStack align="start" spacing={1}>
                  <Text fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }} fontWeight="900" color="#00f2fe">25+</Text>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="700">Vetted Statutory Clauses</Text>
                </VStack>
                <VStack align="start" spacing={1}>
                  <Text fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }} fontWeight="900" color="#10b981">100%</Text>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="700">Server Key Isolation</Text>
                </VStack>
                <VStack align="start" spacing={1}>
                  <Text fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }} fontWeight="900" color="#f59e0b">Statutory</Text>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" fontWeight="700">Legal Knowledge Base</Text>
                </VStack>
              </SimpleGrid>
            </Box>

          </Grid>
        </Container>
      </Box>

      {/* Integrated Hover Footer */}
      <Box px={{ base: 4, md: 8 }} pb={8} position="relative" zIndex={10}>
        <Container maxW="7xl">
          <HoverFooter />
        </Container>
      </Box>

      {/* Live AI Chatbot Widget */}
      <Chatbot />
    </Box>
  )
}

export default Landing
