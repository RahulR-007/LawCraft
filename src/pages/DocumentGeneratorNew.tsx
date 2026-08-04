import React from 'react'
import {
    Box,
    Container,
    Heading,
    Text,
    VStack,
    HStack,
    Badge,
    useColorMode,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiZap, FiShield } from 'react-icons/fi'
import FloatingNavigation from '../components/FloatingNavigation'
import DocumentWizard from '../components/DocumentWizard'

const MotionBox = motion(Box)

const DocumentGenerator: React.FC = () => {
    const { colorMode } = useColorMode()

    return (
        <Box
            minH="100vh"
            bg={colorMode === 'dark' ? '#08090d' : '#f8f9fd'}
            position="relative"
            pb={20}
        >
            <FloatingNavigation />

            {/* Ambient background glow */}
            <Box
                position="absolute"
                top="10%"
                left="15%"
                w="450px"
                h="450px"
                borderRadius="50%"
                bg="rgba(151, 15, 255, 0.1)"
                filter="blur(120px)"
                pointerEvents="none"
            />
            <Box
                position="absolute"
                bottom="15%"
                right="10%"
                w="400px"
                h="400px"
                borderRadius="50%"
                bg="rgba(0, 242, 254, 0.08)"
                filter="blur(120px)"
                pointerEvents="none"
            />

            <Container maxW="6xl" pt={{ base: '80px', md: '100px' }} px={{ base: 4, md: 8 }}>
                <VStack spacing={8} align="stretch">
                    {/* Header Banner */}
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <VStack spacing={3} align="start">
                            <HStack spacing={3}>
                                <Badge bg="rgba(151, 15, 255, 0.2)" color="#b84dff" px={3} py={1} borderRadius="full" border="1px solid rgba(151, 15, 255, 0.4)">
                                    <HStack spacing={1}>
                                        <FiZap size={12} />
                                        <Text fontSize="xs" fontWeight="700">ENTERPRISE RAG PIPELINE</Text>
                                    </HStack>
                                </Badge>
                                <Badge bg="rgba(16, 185, 129, 0.15)" color="#10b981" px={3} py={1} borderRadius="full" border="1px solid rgba(16, 185, 129, 0.3)">
                                    <HStack spacing={1}>
                                        <FiShield size={12} />
                                        <Text fontSize="xs" fontWeight="700">VERIFIED LEGAL STATUTES</Text>
                                    </HStack>
                                </Badge>
                            </HStack>

                            <Heading
                                fontSize={{ base: '2xl', md: '4xl' }}
                                color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                fontWeight="800"
                                letterSpacing="-0.02em"
                            >
                                AI Legal Document <Text as="span" color="#970fff">Architect</Text>
                            </Heading>
                            <Text color={colorMode === 'dark' ? 'gray.400' : 'gray.600'} fontSize="sm" maxW="2xl">
                                Generate legally sound, jurisdiction-aware contracts grounded in official statutes with real-time compliance scoring and risk analysis.
                            </Text>
                        </VStack>
                    </MotionBox>

                    {/* Interactive Wizard */}
                    <DocumentWizard />
                </VStack>
            </Container>
        </Box>
    )
}

export default DocumentGenerator
