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
    Card,
    CardBody,
    CardHeader,
    Badge,
    List,
    ListItem,
    ListIcon,
    useToast,
    Spinner,
    Alert,
    AlertIcon,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FiCheck, FiStar, FiZap, FiAward, FiArrowRight } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import FloatingNavigation from '../components/FloatingNavigation'

// Declare Razorpay for TypeScript
declare global {
    // (Type-only augmentation removed; not used and triggered ESLint no-unused-vars)
}

const MotionBox = motion(Box)

interface PricingPlan {
    id: string
    name: string
    price: number
    currency: string
    interval: string
    description: string
    features: string[]
    tokens: number
    isPopular?: boolean
    buttonText: string
    buttonVariant: 'solid' | 'outline'
    icon: React.ElementType
}

const Pricing: React.FC = () => {
    const navigate = useNavigate()
    const toast = useToast()
    const { user, updateUser } = useAuth()
    const [plans, setPlans] = useState<PricingPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [processingPayment, setProcessingPayment] = useState<string | null>(null)

    const [isAnnual, setIsAnnual] = useState(false)

    useEffect(() => {
        fetchPricingPlans()
    }, [])

    const fetchPricingPlans = async () => {
        try {
            // Use static plans instead of API call
            const staticPlans = [
                {
                    id: 'free',
                    name: 'Free',
                    price: 0,
                    currency: 'INR',
                    interval: 'month',
                    description: 'Basic document templates',
                    features: ['2 Documents per month', 'Basic templates', 'Email support'],
                    tokens: 2,
                    icon: FiZap,
                    buttonText: 'Get Started',
                    buttonVariant: 'outline' as const,
                    isPopular: false
                },
                {
                    id: 'basic',
                    name: 'Basic',
                    price: 29,
                    currency: 'INR',
                    interval: 'month',
                    description: 'Enhanced features for individuals',
                    features: ['20 Documents per month', 'All templates', 'Priority support', 'Document history'],
                    tokens: 20,
                    icon: FiStar,
                    buttonText: 'Choose Basic',
                    buttonVariant: 'solid' as const,
                    isPopular: true
                },
                {
                    id: 'premium',
                    name: 'Premium',
                    price: 49,
                    currency: 'INR',
                    interval: 'month',
                    description: 'Full access for professionals',
                    features: ['Unlimited Documents', 'All templates', 'Premium support', 'Document history', 'AI assistance', 'Custom templates'],
                    tokens: 999,
                    icon: FiAward,
                    buttonText: 'Choose Premium',
                    buttonVariant: 'solid' as const,
                    isPopular: false
                }
            ]
            setPlans(staticPlans)
        } catch (error) {
            toast({
                title: 'Error loading pricing plans',
                description: 'Please refresh the page to try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            })
        } finally {
            setLoading(false)
        }
    }

    const handlePlanSelection = async (plan: PricingPlan) => {
        if (!user) {
            toast({
                title: 'Please log in',
                description: 'You need to be logged in to purchase a plan.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            })
            navigate('/auth')
            return
        }

        if (plan.id === 'free') {
            toast({
                title: 'You are already on the Free plan',
                description: 'Upgrade to Advanced or Premium for more features.',
                status: 'info',
                duration: 5000,
                isClosable: true,
            })
            return
        }

        if (user?.user_metadata?.plan_name === plan.name) {
            toast({
                title: 'Current Plan',
                description: `You are already on the ${plan.name} plan.`,
                status: 'info',
                duration: 5000,
                isClosable: true,
            })
            return
        }

        if (plan.price === 0) {
            return
        }

        setProcessingPayment(plan.id)

        try {
            // For demo purposes, simulate payment success
            toast({
                title: 'Payment Simulation',
                description: `This is a demo. In production, this would process payment for ${plan.name} plan (₹${plan.price}).`,
                status: 'info',
                duration: 5000,
                isClosable: true,
            })

            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Update user metadata with new plan
            if (user && updateUser) {
                await updateUser({
                    plan_name: plan.name,
                    tokens: plan.tokens
                })

                toast({
                    title: 'Plan Updated!',
                    description: `You have been upgraded to the ${plan.name} plan with ${plan.tokens} tokens.`,
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                })
            }

        } catch (error) {
            console.error('Payment error:', error)
            toast({
                title: 'Payment Error',
                description: 'There was an error processing your payment. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            })
        } finally {
            setProcessingPayment(null)
        }
    }

    const getPlanButtonText = (plan: PricingPlan) => {
        if (!user) return plan.buttonText
        if (user?.user_metadata?.plan_name === plan.name) return 'Current Plan'
        if (plan.id === 'free') return 'Free Plan'
        return plan.buttonText
    }

    const isPlanCurrent = (plan: PricingPlan) => {
        return user?.user_metadata?.plan_name === plan.name
    }

    if (loading) {
        return (
            <Box minH="100vh" bg="glass.dark" display="flex" alignItems="center" justifyContent="center">
                <VStack spacing={4}>
                    <Spinner size="xl" color="purple.400" />
                    <Text color="glass.100">Loading pricing plans...</Text>
                </VStack>
            </Box>
        )
    }

    return (
        <Box minH="100vh" position="relative">
            <FloatingNavigation />

            <Container maxW="7xl" pt="80px" pb="20px">
                <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Header Section */}
                    <VStack spacing={8} textAlign="center" mb={16}>
                        <Heading
                            fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
                            color="white"
                            fontWeight="900"
                        >
                            Choose Your <Text as="span" color="brand.500">Plan</Text>
                        </Heading>
                        <Text fontSize="xl" color="gray.400" maxW="2xl">
                            Unlock the full power of AI-driven legal document generation.
                            Choose the plan that fits your needs and start creating professional documents today.
                        </Text>

                        {/* User Status */}
                        {user && (
                            <Alert
                                status="info"
                                bg="rgba(151, 15, 255, 0.1)"
                                border="1px solid rgba(151, 15, 255, 0.3)"
                                borderRadius="xl"
                                maxW="lg"
                            >
                                <AlertIcon color="purple.400" />
                                <VStack align="start" spacing={1}>
                                    <Text color="white" fontWeight="600">
                                        Welcome back, {user?.user_metadata?.fullname || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email}!
                                    </Text>
                                    <Text color="gray.300" fontSize="sm">
                                        Current Plan: {user?.user_metadata?.plan_name || 'Free'} • Tokens: {user?.user_metadata?.tokens || 2}
                                    </Text>
                                </VStack>
                            </Alert>
                        )}

                        {/* Special Offer Banner */}
                        <Box
                            bg="linear-gradient(135deg, rgba(151, 15, 255, 0.2), rgba(151, 15, 255, 0.1))"
                            backdropFilter="blur(20px)"
                            border="1px solid rgba(151, 15, 255, 0.3)"
                            borderRadius="xl"
                            px={6}
                            py={3}
                            position="relative"
                            _before={{
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent)',
                                borderRadius: 'xl',
                                pointerEvents: 'none',
                            }}
                        >
                            <HStack spacing={2}>
                                <FiStar color="#970fff" />
                                <Text color="white" fontWeight="600">
                                    Limited Time Offer: 25% off Professional plan for the first 3 months!
                                </Text>
                            </HStack>
                        </Box>

                        {/* Billing Toggle Switch */}
                        <HStack spacing={4} bg="rgba(13, 15, 23, 0.8)" p={2} borderRadius="full" border="1px solid rgba(255, 255, 255, 0.12)">
                            <Button
                                size="sm"
                                borderRadius="full"
                                variant={!isAnnual ? 'solid' : 'ghost'}
                                bg={!isAnnual ? 'linear-gradient(135deg, #970fff, #7817ff)' : 'transparent'}
                                onClick={() => setIsAnnual(false)}
                                color="white"
                            >
                                Monthly Billing
                            </Button>
                            <HStack spacing={2}>
                                <Button
                                    size="sm"
                                    borderRadius="full"
                                    variant={isAnnual ? 'solid' : 'ghost'}
                                    bg={isAnnual ? 'linear-gradient(135deg, #970fff, #7817ff)' : 'transparent'}
                                    onClick={() => setIsAnnual(true)}
                                    color="white"
                                >
                                    Annual Billing
                                </Button>
                                <Badge colorScheme="green" borderRadius="full" px={2.5} py={0.5}>
                                    SAVE 20%
                                </Badge>
                            </HStack>
                        </HStack>
                    </VStack>

                    {/* Pricing Cards */}
                    <Flex
                        direction={{ base: 'column', lg: 'row' }}
                        gap={8}
                        justify="center"
                        align="stretch"
                    >
                        {plans.map((plan, index) => {
                            const IconComponent = plan.icon
                            return (
                                <MotionBox
                                    key={plan.id}
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: index * 0.2 }}
                                    flex="1"
                                    maxW="400px"
                                    position="relative"
                                >
                                    {plan.isPopular && (
                                        <Box
                                            position="absolute"
                                            top="-10px"
                                            left="50%"
                                            transform="translateX(-50%)"
                                            zIndex="2"
                                        >
                                            <Badge
                                                bg="linear-gradient(135deg, #970fff, #7817ff)"
                                                color="white"
                                                px={4}
                                                py={2}
                                                borderRadius="full"
                                                fontSize="sm"
                                                fontWeight="bold"
                                                boxShadow="0 4px 12px rgba(151, 15, 255, 0.4)"
                                            >
                                                Most Popular
                                            </Badge>
                                        </Box>
                                    )}

                                    <Card
                                        h="full"
                                        bg="rgba(255, 255, 255, 0.08)"
                                        backdropFilter="blur(20px)"
                                        border={plan.isPopular ? "2px solid rgba(151, 15, 255, 0.6)" : "1px solid rgba(255, 255, 255, 0.2)"}
                                        borderRadius="xl"
                                        boxShadow={plan.isPopular
                                            ? "0 25px 50px rgba(151, 15, 255, 0.3), 0 0 0 1px rgba(151, 15, 255, 0.1)"
                                            : "0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                                        }
                                        _hover={{
                                            transform: 'translateY(-5px)',
                                            boxShadow: plan.isPopular
                                                ? "0 35px 70px rgba(151, 15, 255, 0.4)"
                                                : "0 30px 60px rgba(0, 0, 0, 0.4), 0 0 30px rgba(151, 15, 255, 0.2)"
                                        }}
                                        transition="all 0.3s ease"
                                        position="relative"
                                        _before={{
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent)',
                                            borderRadius: 'xl',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <CardHeader pb={4}>
                                            <VStack spacing={4} align="start">
                                                <HStack spacing={3}>
                                                    <Box
                                                        bg="rgba(151, 15, 255, 0.2)"
                                                        p={2}
                                                        borderRadius="lg"
                                                        border="1px solid rgba(151, 15, 255, 0.3)"
                                                    >
                                                        <IconComponent size={20} color="#970fff" />
                                                    </Box>
                                                    <VStack align="start" spacing={0}>
                                                        <Heading size="lg" color="white">
                                                            {plan.name}
                                                        </Heading>
                                                        <Text fontSize="sm" color="gray.400">
                                                            {plan.description}
                                                        </Text>
                                                    </VStack>
                                                </HStack>

                                                <HStack align="baseline" spacing={1}>
                                                    <Text fontSize="4xl" fontWeight="bold" color="white">
                                                        ₹{plan.price}
                                                    </Text>
                                                    {plan.price > 0 && (
                                                        <Text fontSize="md" color="gray.400">
                                                            {plan.interval}
                                                        </Text>
                                                    )}
                                                </HStack>
                                            </VStack>
                                        </CardHeader>

                                        <CardBody pt={0}>
                                            <VStack spacing={6} h="full">
                                                <List spacing={3} w="full">
                                                    {plan.features.map((feature, featureIndex) => (
                                                        <ListItem key={featureIndex} color="gray.300">
                                                            <HStack align="start" spacing={3}>
                                                                <ListIcon as={FiCheck} color="brand.500" mt={1} />
                                                                <Text fontSize="sm" lineHeight="tall">
                                                                    {feature}
                                                                </Text>
                                                            </HStack>
                                                        </ListItem>
                                                    ))}
                                                </List>

                                                <Button
                                                    w="full"
                                                    size="lg"
                                                    variant={plan.buttonVariant}
                                                    rightIcon={<FiArrowRight />}
                                                    onClick={() => handlePlanSelection(plan)}
                                                    mt="auto"
                                                    bg={plan.buttonVariant === 'solid' ? 'linear-gradient(135deg, #970fff, #7817ff)' : 'transparent'}
                                                    _hover={{
                                                        bg: plan.buttonVariant === 'solid' ? 'linear-gradient(135deg, #7817ff, #5a0bd9)' : 'rgba(151, 15, 255, 0.1)',
                                                        transform: 'translateY(-2px)'
                                                    }}
                                                    isLoading={processingPayment === plan.id}
                                                    loadingText="Processing..."
                                                    isDisabled={isPlanCurrent(plan)}
                                                >
                                                    {getPlanButtonText(plan)}
                                                </Button>
                                            </VStack>
                                        </CardBody>
                                    </Card>
                                </MotionBox>
                            )
                        })}
                    </Flex>

                    {/* FAQ Section */}
                    <VStack spacing={8} mt={20} textAlign="center">
                        <Heading size="lg" color="white">
                            Frequently Asked Questions
                        </Heading>

                        <Flex direction={{ base: 'column', md: 'row' }} gap={8} w="full">
                            {[
                                {
                                    question: "Can I change my plan anytime?",
                                    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately."
                                },
                                {
                                    question: "Is there a free trial?",
                                    answer: "Yes, we offer a 14-day free trial for all plans so you can explore our features risk-free."
                                },
                                {
                                    question: "What's included in support?",
                                    answer: "All plans include email support. Professional and Enterprise plans get priority support and dedicated assistance."
                                }
                            ].map((faq, index) => (
                                <Card
                                    key={index}
                                    flex="1"
                                    bg="rgba(255, 255, 255, 0.05)"
                                    backdropFilter="blur(10px)"
                                    border="1px solid rgba(255, 255, 255, 0.1)"
                                    borderRadius="lg"
                                >
                                    <CardBody>
                                        <VStack spacing={3} textAlign="start">
                                            <Heading size="sm" color="white">
                                                {faq.question}
                                            </Heading>
                                            <Text fontSize="sm" color="gray.400" lineHeight="tall">
                                                {faq.answer}
                                            </Text>
                                        </VStack>
                                    </CardBody>
                                </Card>
                            ))}
                        </Flex>
                    </VStack>

                    {/* CTA Section */}
                    <Box
                        mt={20}
                        p={12}
                        bg="linear-gradient(135deg, rgba(151, 15, 255, 0.15), rgba(151, 15, 255, 0.05))"
                        backdropFilter="blur(20px)"
                        border="1px solid rgba(151, 15, 255, 0.3)"
                        borderRadius="2xl"
                        textAlign="center"
                        position="relative"
                        _before={{
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent)',
                            borderRadius: '2xl',
                            pointerEvents: 'none',
                        }}
                    >
                        <VStack spacing={6}>
                            <Heading size="lg" color="white">
                                Ready to revolutionize your legal workflow?
                            </Heading>
                            <Text color="gray.400" maxW="2xl">
                                Join thousands of legal professionals who trust LawCraft AI to create
                                professional documents quickly and accurately.
                            </Text>
                            <HStack spacing={4}>
                                <Button
                                    size="lg"
                                    bg="linear-gradient(135deg, #970fff, #7817ff)"
                                    color="white"
                                    rightIcon={<FiArrowRight />}
                                    onClick={() => {
                                        const advancedPlan = plans.find(p => p.name === 'Advanced')
                                        if (advancedPlan) handlePlanSelection(advancedPlan)
                                    }}
                                    _hover={{
                                        bg: 'linear-gradient(135deg, #7817ff, #5a0bd9)',
                                        transform: 'translateY(-2px)'
                                    }}
                                >
                                    Get Started Today
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    color="white"
                                    borderColor="rgba(255, 255, 255, 0.3)"
                                    onClick={() => navigate('/dashboard')}
                                    _hover={{
                                        bg: 'rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    Learn More
                                </Button>
                            </HStack>
                        </VStack>
                    </Box>
                </MotionBox>
            </Container>
        </Box>
    )
}

export default Pricing
