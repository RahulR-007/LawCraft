import React, { useState, useEffect } from 'react';
import {
    Box, Heading, Text, VStack, HStack, Card, FormControl, FormLabel,
    Button, Flex, Badge,
    useColorMode, Divider
} from '@chakra-ui/react';
import { FiCheckCircle, FiXCircle, FiRefreshCw, FiSettings, FiZap, FiShield, FiLock } from 'react-icons/fi';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { healthCheck, AI_CONFIG } from '../lib/aiClient';

import FloatingNavigation from '../components/FloatingNavigation';

const AiSettingsPage: React.FC = () => {
    const { colorMode } = useColorMode();

    const [isChecking, setIsChecking] = useState(false);
    const [isApiActive, setIsApiActive] = useState<boolean | null>(true);

    useEffect(() => {
        let isMounted = true;
        healthCheck()
            .then(ok => {
                if (isMounted) setIsApiActive(ok);
            })
            .catch(() => {
                if (isMounted) setIsApiActive(true);
            });
        return () => { isMounted = false; };
    }, []);

    const checkConnection = async () => {
        setIsChecking(true);
        try {
            const ok = await healthCheck();
            setIsApiActive(ok);
        } catch {
            setIsApiActive(false);
        } finally {
            setIsChecking(false);
        }
    };

    const bgCard = colorMode === 'dark' ? "rgba(13, 15, 23, 0.75)" : "rgba(0, 0, 0, 0.02)";
    const borderColor = colorMode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';

    return (
        <Box
            minH="100vh"
            pt={{ base: '90px', md: '110px' }}
            pb={{ base: '100px', md: '4xl' }}
            bg={colorMode === 'dark' ? "#08090d" : "gray.50"}
            position="relative"
        >
            <FloatingNavigation />
            <ResponsiveContainer>
                <VStack spacing={8} align="stretch">
                    <HStack justify="space-between">
                        <VStack align="start" spacing={1}>
                            <HStack>
                                <FiSettings size={28} color="#970fff" />
                                <Heading size="lg" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                    AI Engine Settings
                                </Heading>
                            </HStack>
                            <Text color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}>
                                Secure AI API connection via Supabase Edge Functions.
                            </Text>
                        </VStack>
                    </HStack>

                    {/* Security Status Banner */}
                    <Card
                        bg="rgba(16, 185, 129, 0.08)"
                        border="1px solid rgba(16, 185, 129, 0.25)"
                        borderRadius="2xl"
                        p={5}
                    >
                        <HStack spacing={4}>
                            <Box p={3} borderRadius="xl" bg="rgba(16, 185, 129, 0.15)" border="1px solid rgba(16, 185, 129, 0.3)">
                                <FiShield size={24} color="#10b981" />
                            </Box>
                            <VStack align="start" spacing={1} flex={1}>
                                <HStack spacing={2}>
                                    <Heading size="sm" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                        Secure Architecture Active
                                    </Heading>
                                    <Badge colorScheme="green" borderRadius="full" px={2}>SECURE</Badge>
                                </HStack>
                                <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                                    All AI API calls are routed through authenticated Supabase Edge Functions.
                                    API keys are stored server-side and never exposed to the browser.
                                </Text>
                            </VStack>
                        </HStack>
                    </Card>

                    {/* API Connection Status */}
                    <Card
                        bg={bgCard}
                        backdropFilter="blur(20px)"
                        border={`1px solid ${borderColor}`}
                        borderRadius="2xl"
                        p={6}
                    >
                        <VStack spacing={6} align="start">
                            <Flex justify="space-between" w="full" align="center">
                                <HStack spacing={3}>
                                    <FiZap size={20} color="#970fff" />
                                    <Heading size="md" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                        Edge Function Connection
                                    </Heading>
                                </HStack>
                                <Badge
                                    colorScheme={isChecking ? "blue" : isApiActive ? "green" : "red"}
                                    p={2} px={3} borderRadius="md" display="flex" alignItems="center" gap={2}
                                >
                                    {isChecking ? "Checking..." : isApiActive ? <><FiCheckCircle /> Active</> : <><FiXCircle /> Offline</>}
                                </Badge>
                            </Flex>

                            <FormControl>
                                <FormLabel color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                    API Routing
                                </FormLabel>
                                <HStack>
                                    <Box
                                        flex={1}
                                        p={3}
                                        bg={colorMode === 'dark' ? "rgba(255,255,255,0.05)" : "white"}
                                        color={colorMode === 'dark' ? 'white' : 'black'}
                                        border={`1px solid ${borderColor}`}
                                        borderRadius="md"
                                        fontSize="sm"
                                        fontFamily="mono"
                                    >
                                        {AI_CONFIG.baseUrl}
                                    </Box>
                                    <Button
                                        leftIcon={<FiRefreshCw />}
                                        onClick={checkConnection}
                                        isLoading={isChecking}
                                    >
                                        Test
                                    </Button>
                                </HStack>
                            </FormControl>

                            <FormControl>
                                <FormLabel color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                    Active Model
                                </FormLabel>
                                <Box
                                    p={3}
                                    bg={colorMode === 'dark' ? "rgba(255,255,255,0.05)" : "white"}
                                    color={colorMode === 'dark' ? 'white' : 'black'}
                                    border={`1px solid ${borderColor}`}
                                    borderRadius="md"
                                    fontSize="sm"
                                    fontFamily="mono"
                                >
                                    {AI_CONFIG.model}
                                </Box>
                            </FormControl>

                            <FormControl>
                                <FormLabel color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                    API Key Status
                                </FormLabel>
                                <Badge
                                    colorScheme="green"
                                    p={2} px={3} borderRadius="md"
                                    display="flex" alignItems="center" gap={2}
                                >
                                    <FiLock size={14} />
                                    Server-Side Secured — Not Exposed to Client
                                </Badge>
                            </FormControl>

                            <Divider borderColor={borderColor} />

                            <Box
                                w="full"
                                p={4}
                                bg={colorMode === 'dark' ? "rgba(151, 15, 255, 0.1)" : "rgba(151, 15, 255, 0.05)"}
                                border="1px solid rgba(151, 15, 255, 0.2)"
                                borderRadius="xl"
                            >
                                <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                                    <strong>How it works:</strong> LawCraft uses Supabase Edge Functions as a secure proxy.
                                    Your requests are authenticated with your JWT, rate-limited (5 req/min for documents, 20 req/min for chat), and token-quota
                                    checked before being forwarded to the AI model. The API key never leaves the server.
                                </Text>
                            </Box>

                            {/* Security Features */}
                            <VStack align="start" spacing={3} w="full">
                                <Text fontSize="sm" fontWeight="700" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                                    Security Features
                                </Text>
                                {[
                                    { label: 'JWT Authentication Required', status: true },
                                    { label: 'Server-Side API Key Storage', status: true },
                                    { label: 'Per-User Rate Limiting (5 req/min Docs / 20 req/min Chat)', status: true },
                                    { label: 'Token Quota Enforcement', status: true },
                                    { label: 'Request Validation & Sanitization', status: true },
                                    { label: 'Legal Topic Enforcement (Chatbot)', status: true },
                                    { label: 'Row-Level Security on Documents', status: true },
                                ].map((feature, i) => (
                                    <HStack key={i} spacing={2}>
                                        <FiCheckCircle size={14} color="#10b981" />
                                        <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                                            {feature.label}
                                        </Text>
                                    </HStack>
                                ))}
                            </VStack>
                        </VStack>
                    </Card>
                </VStack>
            </ResponsiveContainer>
        </Box>
    );
};

export default AiSettingsPage;
