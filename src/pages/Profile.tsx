import React, { useState, useEffect } from 'react'
import {
    Box,
    Heading,
    Text,
    Button,
    VStack,
    HStack,
    Flex,
    Card,
    Input,
    FormControl,
    FormLabel,
    Select,
    Switch,
    useToast,
    useColorMode,
    useBreakpointValue,
    Avatar,
    Badge,
    Divider,
    Grid,
    GridItem,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import FloatingNavigation from '../components/FloatingNavigation'
import { ResponsiveContainer } from '../components/ResponsiveContainer'
import {
    FiUser,
    FiSettings,
    FiSave,
    FiEdit,
    FiMail,
    FiPhone,
    FiMapPin,
    FiBriefcase,
    FiShield,
    FiBell,
    FiFileText,
    FiTrendingUp,
    FiActivity,
    FiServer,
    FiCheckCircle,
    FiXCircle
} from 'react-icons/fi'

import { healthCheck, AI_CONFIG } from '../lib/aiClient'

const MotionBox = motion(Box)

const Profile: React.FC = () => {
    const toast = useToast()
    const { user, updateUser } = useAuth()
    const { colorMode, setColorMode } = useColorMode()

    // Responsive values
    const headingSize = useBreakpointValue({ base: '2xl', sm: '3xl', md: '4xl', lg: '5xl' })
    const textSize = useBreakpointValue({ base: 'md', md: 'xl' })
    const buttonSize = useBreakpointValue({ base: 'md', md: 'lg' })
    const cardPadding = useBreakpointValue({ base: 4, md: 6, lg: 8 })
    const tabSize = useBreakpointValue({ base: 'sm', md: 'md' })
    const avatarSize = useBreakpointValue({ base: 'xl', md: '2xl' })
    const gridColumns = useBreakpointValue({ base: '1fr', lg: '1fr 2fr' })
    const flexDirection = useBreakpointValue({ base: 'column', md: 'row' }) as 'column' | 'row'

    // Initialize profile with Supabase user data
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: user?.email || '',
        phone: '',
        company: '',
        position: '',
        location: '',
        bio: '',
        avatar: ''
    })

    const [settings, setSettings] = useState({
        emailNotifications: true,
        smsNotifications: false,
        documentUpdates: true,
        securityAlerts: true,
        marketingEmails: false,
        theme: colorMode as 'light' | 'dark' | 'auto',
        language: 'en',
        timezone: 'America/New_York'
    })

    const [isEditing, setIsEditing] = useState(false)
    const [isAiServerActive, setIsAiServerActive] = useState<boolean | null>(null)
    const [isCheckingServer, setIsCheckingServer] = useState(false)

    // Check AI server health on mount
    useEffect(() => {
        const checkServer = async () => {
            setIsCheckingServer(true)
            try {
                const isHealthy = await healthCheck()
                setIsAiServerActive(isHealthy)
            } catch (error) {
                setIsAiServerActive(false)
            } finally {
                setIsCheckingServer(false)
            }
        }
        checkServer()
    }, [])

    // Load user data when component mounts or user changes (supports Google OAuth & custom auth)
    useEffect(() => {
        if (user) {
            const rawFullname = user.user_metadata?.fullname || user.user_metadata?.full_name || user.user_metadata?.name || ''
            const rawAvatar = user.user_metadata?.avatar || user.user_metadata?.avatar_url || user.user_metadata?.picture || ''

            const nameParts = rawFullname.trim().split(/\s+/)
            const firstName = nameParts[0] || ''
            const lastName = nameParts.slice(1).join(' ') || ''

            setProfile(prev => ({
                ...prev,
                firstName: prev.firstName || firstName,
                lastName: prev.lastName || lastName,
                email: user.email || prev.email || '',
                avatar: prev.avatar || rawAvatar,
                phone: user.user_metadata?.phone || prev.phone || '',
                company: user.user_metadata?.company || prev.company || '',
                position: user.user_metadata?.position || prev.position || '',
                location: user.user_metadata?.location || prev.location || '',
                bio: user.user_metadata?.bio || prev.bio || ''
            }))

            // Load user settings from metadata
            const userSettings = user.user_metadata?.settings as any
            if (userSettings) {
                setSettings(prev => ({
                    ...prev,
                    ...userSettings
                }))
            }
        }
    }, [user])

    // Update color mode when theme setting changes
    useEffect(() => {
        if (settings.theme === 'light' || settings.theme === 'dark') {
            if (settings.theme !== colorMode) {
                setColorMode(settings.theme)
            }
        } else if (settings.theme === 'auto') {
            // Detect system preference
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            const autoTheme = systemPrefersDark ? 'dark' : 'light'
            if (autoTheme !== colorMode) {
                setColorMode(autoTheme)
            }
        }
    }, [settings.theme, colorMode, setColorMode])

    const handleSaveProfile = async () => {
        try {
            // Update user metadata in Supabase with all profile fields
            const fullname = `${profile.firstName} ${profile.lastName}`.trim()
            const updateData = {
                // Keep existing metadata
                ...user?.user_metadata,
                // Update with new values
                fullname,
                phone: profile.phone,
                company: profile.company,
                position: profile.position,
                location: profile.location,
                bio: profile.bio
            }

            await updateUser(updateData)

            toast({
                title: 'Profile Updated',
                description: 'Your profile has been successfully updated.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            })
            setIsEditing(false)
        } catch (error) {
            toast({
                title: 'Update Failed',
                description: 'There was an error updating your profile.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            })
        }
    }

    const handleSaveSettings = async () => {
        try {
            // Save settings to Supabase user metadata
            await updateUser({
                settings: settings
            })

            toast({
                title: 'Settings Saved',
                description: 'Your preferences have been saved successfully.',
                status: 'success',
                duration: 3000,
                isClosable: true,
            })
        } catch (error) {
            toast({
                title: 'Save Failed',
                description: 'There was an error saving your settings.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            })
        }
    }

    const stats = [
        {
            label: 'Documents Generated',
            value: '0', // Will come from user usage data
            change: '+0%',
            isIncrease: true,
            icon: FiFileText
        },
        {
            label: 'Available Tokens',
            value: user?.user_metadata?.tokens?.toString() || '0',
            change: 'Current balance',
            isIncrease: true,
            icon: FiBriefcase
        },
        {
            label: 'Account Status',
            value: user?.user_metadata?.plan_name ? 'Premium' : 'Free',
            change: user?.user_metadata?.plan_name || 'Basic Plan',
            isIncrease: true,
            icon: FiTrendingUp
        },
        {
            label: 'Member Since',
            value: user && (user as any).created_at ? new Date((user as any).created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recent',
            change: 'Join date',
            isIncrease: true,
            icon: FiActivity
        }
    ]

    const recentActivity = [
        {
            id: '1',
            type: 'account',
            title: 'Account created',
            timestamp: user ? new Date((user as any).created_at).toLocaleDateString() : 'Recently',
            status: 'completed'
        },
        {
            id: '2',
            type: 'profile',
            title: user?.user_metadata?.fullname ? 'Profile completed' : 'Profile setup pending',
            timestamp: user?.user_metadata?.fullname ? 'Completed' : 'Pending',
            status: user?.user_metadata?.fullname ? 'completed' : 'pending'
        },
        {
            id: '3',
            type: 'settings',
            title: `Current plan: ${user?.user_metadata?.plan_name || 'Free Plan'}`,
            timestamp: user?.user_metadata?.plan_name ? 'Active' : 'Default',
            status: 'completed'
        },
        {
            id: '4',
            type: 'usage',
            title: `Available tokens: ${user?.user_metadata?.tokens || 0}`,
            timestamp: user?.user_metadata?.tokens ? `${user.user_metadata.tokens} remaining` : 'No tokens',
            status: user?.user_metadata?.tokens ? 'completed' : 'warning'
        }
    ]

    return (
        <Box
            minH="100vh"
            position="relative"
            bg={colorMode === 'dark' ? 'gray.900' : 'white'}
            color={colorMode === 'dark' ? 'white' : 'gray.800'}
            transition="all 0.3s ease"
        >
            <FloatingNavigation />

            <ResponsiveContainer variant="page">
                <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Header Section */}
                    <VStack spacing={8} textAlign="center" mb={12}>
                        <Heading
                            fontSize={headingSize}
                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                            fontWeight="900"
                            lineHeight="shorter"
                        >
                            Your <Text as="span" color="brand.500">Profile</Text>
                        </Heading>
                        <Text
                            fontSize={textSize}
                            color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                            maxW="2xl"
                            px={{ base: 4, md: 0 }}
                        >
                            Manage your account settings, preferences, and view your activity statistics.
                        </Text>
                    </VStack>

                    <Tabs variant="soft-rounded" colorScheme="purple" size={tabSize}>
                        <TabList
                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}
                            backdropFilter="blur(10px)"
                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                            borderRadius="xl"
                            p={2}
                            mb={8}
                            flexWrap={{ base: 'wrap', md: 'nowrap' }}
                            gap={{ base: 2, md: 0 }}
                            justifyContent={{ base: 'center', md: 'flex-start' }}
                        >
                            <Tab
                                color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                                _selected={{
                                    color: 'white',
                                    bg: 'linear-gradient(135deg, #970fff, #7817ff)'
                                }}
                                minW={{ base: '120px', md: 'auto' }}
                                fontSize={{ base: 'sm', md: 'md' }}
                            >
                                <HStack spacing={2}>
                                    <FiUser />
                                    <Text>Profile</Text>
                                </HStack>
                            </Tab>
                            <Tab
                                color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                                _selected={{
                                    color: 'white',
                                    bg: 'linear-gradient(135deg, #970fff, #7817ff)'
                                }}
                                minW={{ base: '120px', md: 'auto' }}
                                fontSize={{ base: 'sm', md: 'md' }}
                            >
                                <HStack spacing={2}>
                                    <FiSettings />
                                    <Text>Settings</Text>
                                </HStack>
                            </Tab>
                            <Tab
                                color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                                _selected={{
                                    color: 'white',
                                    bg: 'linear-gradient(135deg, #970fff, #7817ff)'
                                }}
                                minW={{ base: '120px', md: 'auto' }}
                                fontSize={{ base: 'sm', md: 'md' }}
                            >
                                <HStack spacing={2}>
                                    <FiActivity />
                                    <Text>Activity</Text>
                                </HStack>
                            </Tab>
                        </TabList>

                        <TabPanels>
                            {/* Profile Tab */}
                            <TabPanel p={0}>
                                <Grid templateColumns={gridColumns} gap={8}>
                                    {/* Profile Card */}
                                    <GridItem>
                                        <Card
                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                                            backdropFilter="blur(20px)"
                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`}
                                            borderRadius="2xl"
                                            p={cardPadding}
                                            h="fit-content"
                                            boxShadow={colorMode === 'dark' ? 'none' : 'lg'}
                                        >
                                            <VStack spacing={6}>
                                                <Avatar
                                                    size={avatarSize}
                                                    name={`${profile.firstName} ${profile.lastName}`}
                                                    src={profile.avatar}
                                                    bg="linear-gradient(135deg, #970fff, #7817ff)"
                                                    color="white"
                                                />

                                                <VStack spacing={2} textAlign="center">
                                                    <Heading
                                                        size={{ base: 'md', md: 'lg' }}
                                                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                    >
                                                        {profile.firstName} {profile.lastName}
                                                    </Heading>
                                                    <Text color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}>
                                                        {profile.position}
                                                    </Text>
                                                    <Text
                                                        color={colorMode === 'dark' ? 'gray.500' : 'gray.500'}
                                                        fontSize="sm"
                                                    >
                                                        {profile.company}
                                                    </Text>

                                                    <Badge
                                                        bg="linear-gradient(135deg, rgba(151, 15, 255, 0.2), rgba(151, 15, 255, 0.1))"
                                                        color="brand.300"
                                                        px={3}
                                                        py={1}
                                                        borderRadius="full"
                                                    >
                                                        {user?.user_metadata?.plan_name || 'Free Plan'}
                                                    </Badge>
                                                </VStack>

                                                <Divider borderColor="rgba(255, 255, 255, 0.1)" />

                                                <VStack spacing={3} w="full" align="start"
                                                    overflowX="hidden" // Prevent horizontal scroll on mobile
                                                >
                                                    <HStack spacing={3} w="full" justify="flex-start">
                                                        <FiMail color="#970fff" />
                                                        <Text
                                                            color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                                                            fontSize="sm"
                                                            wordBreak="break-all"
                                                            noOfLines={2}
                                                        >
                                                            {profile.email}
                                                        </Text>
                                                    </HStack>
                                                    <HStack spacing={3}>
                                                        <FiPhone color="#970fff" />
                                                        <Text
                                                            color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                                                            fontSize="sm"
                                                        >
                                                            {profile.phone || 'Not provided'}
                                                        </Text>
                                                    </HStack>
                                                    <HStack spacing={3}>
                                                        <FiMapPin color="#970fff" />
                                                        <Text
                                                            color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                                                            fontSize="sm"
                                                        >
                                                            {profile.location || 'Not provided'}
                                                        </Text>
                                                    </HStack>
                                                </VStack>

                                                <Button
                                                    w="full"
                                                    variant="outline"
                                                    borderColor="rgba(151, 15, 255, 0.4)"
                                                    color="brand.300"
                                                    leftIcon={<FiEdit />}
                                                    onClick={() => setIsEditing(!isEditing)}
                                                    _hover={{
                                                        bg: 'rgba(151, 15, 255, 0.1)',
                                                        borderColor: 'brand.400'
                                                    }}
                                                >
                                                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                                                </Button>
                                            </VStack>
                                        </Card>
                                    </GridItem>

                                    {/* Profile Form */}
                                    <GridItem>
                                        <Card
                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                                            backdropFilter="blur(20px)"
                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`}
                                            borderRadius="2xl"
                                            p={{ base: 4, md: 8 }}
                                            boxShadow={colorMode === 'dark' ? 'none' : 'lg'}
                                        >
                                            <VStack spacing={6} align="start">
                                                <HStack
                                                    justify="space-between"
                                                    w="full"
                                                    flexDirection={flexDirection}
                                                    gap={4}
                                                    align={{ base: 'stretch', md: 'center' }}
                                                >
                                                    <Heading
                                                        size={{ base: 'md', md: 'lg' }}
                                                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                    >
                                                        Profile Information
                                                    </Heading>
                                                    {isEditing && (
                                                        <Button
                                                            bg="linear-gradient(135deg, #970fff, #7817ff)"
                                                            color="white"
                                                            leftIcon={<FiSave />}
                                                            onClick={handleSaveProfile}
                                                            size={buttonSize}
                                                            w={{ base: 'full', md: 'auto' }}
                                                            _hover={{
                                                                bg: 'linear-gradient(135deg, #7817ff, #5a0bd9)'
                                                            }}
                                                        >
                                                            Save Changes
                                                        </Button>
                                                    )}
                                                </HStack>

                                                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} w="full">
                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            First Name
                                                        </FormLabel>
                                                        <Input
                                                            value={profile.firstName}
                                                            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                                            isReadOnly={!isEditing}
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            _readOnly={{ opacity: 0.7 }}
                                                            _focus={{
                                                                borderColor: 'brand.500',
                                                                boxShadow: '0 0 0 1px #970fff'
                                                            }}
                                                            size={{ base: 'md', md: 'lg' }}
                                                        />
                                                    </FormControl>

                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            Last Name
                                                        </FormLabel>
                                                        <Input
                                                            value={profile.lastName}
                                                            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                                            isReadOnly={!isEditing}
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            _readOnly={{ opacity: 0.7 }}
                                                            _focus={{
                                                                borderColor: 'brand.500',
                                                                boxShadow: '0 0 0 1px #970fff'
                                                            }}
                                                            size={{ base: 'md', md: 'lg' }}
                                                        />
                                                    </FormControl>
                                                </Grid>

                                                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} w="full">
                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            Email
                                                        </FormLabel>
                                                        <Input
                                                            value={profile.email}
                                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                            isReadOnly={true} // Email should typically not be editable
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "gray.50"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`}
                                                            color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                                                            opacity={0.7}
                                                            size={{ base: 'md', md: 'lg' }}
                                                        />
                                                    </FormControl>

                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            Phone
                                                        </FormLabel>
                                                        <Input
                                                            value={profile.phone}
                                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                            isReadOnly={!isEditing}
                                                            placeholder="Enter phone number"
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            _readOnly={{ opacity: 0.7 }}
                                                            _focus={{
                                                                borderColor: 'brand.500',
                                                                boxShadow: '0 0 0 1px #970fff'
                                                            }}
                                                            size={{ base: 'md', md: 'lg' }}
                                                        />
                                                    </FormControl>
                                                </Grid>

                                                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} w="full">
                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            Company
                                                        </FormLabel>
                                                        <Input
                                                            value={profile.company}
                                                            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                                            isReadOnly={!isEditing}
                                                            placeholder="Enter company name"
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            _readOnly={{ opacity: 0.7 }}
                                                            _focus={{
                                                                borderColor: 'brand.500',
                                                                boxShadow: '0 0 0 1px #970fff'
                                                            }}
                                                            size={{ base: 'md', md: 'lg' }}
                                                        />
                                                    </FormControl>

                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            Position
                                                        </FormLabel>
                                                        <Input
                                                            value={profile.position}
                                                            onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                                                            isReadOnly={!isEditing}
                                                            placeholder="Enter position"
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            _readOnly={{ opacity: 0.7 }}
                                                            _focus={{
                                                                borderColor: 'brand.500',
                                                                boxShadow: '0 0 0 1px #970fff'
                                                            }}
                                                        />
                                                    </FormControl>
                                                </Grid>

                                                <FormControl>
                                                    <FormLabel color={colorMode === 'dark' ? 'white' : 'gray.700'}>Location</FormLabel>
                                                    <Input
                                                        value={profile.location}
                                                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                                        isReadOnly={!isEditing}
                                                        placeholder="Enter location"
                                                        bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                        border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                        _readOnly={{ opacity: 0.7 }}
                                                        _focus={{
                                                            borderColor: 'brand.500',
                                                            boxShadow: '0 0 0 1px #970fff'
                                                        }}
                                                    />
                                                </FormControl>
                                            </VStack>
                                        </Card>
                                    </GridItem>
                                </Grid>
                            </TabPanel>

                            {/* Settings Tab */}
                            <TabPanel p={0}>
                                <Grid templateColumns={gridColumns} gap={8}>
                                    <GridItem>
                                        <VStack spacing={8} w="full">
                                            <Card
                                                bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                                                backdropFilter="blur(20px)"
                                                border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`}
                                                borderRadius="2xl"
                                                p={cardPadding}
                                                w="full"
                                                boxShadow={colorMode === 'dark' ? 'none' : 'lg'}
                                            >
                                                <VStack spacing={6} align="start" w="full">
                                                    <Heading
                                                        size={{ base: 'md', md: 'lg' }}
                                                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                    >
                                                        AI Server Status
                                                    </Heading>

                                                    <Flex
                                                        justify="space-between"
                                                        align="center"
                                                        w="full"
                                                        p={4}
                                                        borderRadius="xl"
                                                        bg={colorMode === 'dark' ? "rgba(0,0,0,0.3)" : "white"}
                                                        border={`1px solid ${colorMode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`}
                                                        flexDirection={{ base: 'column', sm: 'row' }}
                                                        gap={4}
                                                    >
                                                        <HStack spacing={4}>
                                                            <Box
                                                                p={3}
                                                                borderRadius="lg"
                                                                bg={isCheckingServer ? "blue.500" : isAiServerActive ? "green.500" : "red.500"}
                                                                color="white"
                                                            >
                                                                <FiServer size={24} />
                                                            </Box>
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontWeight="bold" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                                                    Cloud AI API
                                                                </Text>
                                                                <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}>
                                                                    {AI_CONFIG.baseUrl} ({AI_CONFIG.model})
                                                                </Text>
                                                            </VStack>
                                                        </HStack>

                                                        <HStack>
                                                            <Button
                                                                size="sm"
                                                                leftIcon={<FiActivity />}
                                                                isLoading={isCheckingServer}
                                                                onClick={async () => {
                                                                    setIsCheckingServer(true)
                                                                    try {
                                                                    const isHealthy = await healthCheck()
                                                                        setIsAiServerActive(isHealthy)
                                                                    } catch (error) {
                                                                        setIsAiServerActive(false)
                                                                    } finally {
                                                                        setIsCheckingServer(false)
                                                                    }
                                                                }}
                                                                variant="outline"
                                                            >
                                                                Check
                                                            </Button>
                                                            <Badge
                                                                colorScheme={isCheckingServer ? "blue" : isAiServerActive ? "green" : "red"}
                                                                p={2}
                                                                px={4}
                                                                borderRadius="md"
                                                                display="flex"
                                                                alignItems="center"
                                                                gap={2}
                                                                fontSize="sm"
                                                            >
                                                                {isCheckingServer ? (
                                                                    "Checking..."
                                                                ) : isAiServerActive ? (
                                                                    <><FiCheckCircle /> Active</>
                                                                ) : (
                                                                    <><FiXCircle /> Offline</>
                                                                )}
                                                            </Badge>
                                                        </HStack>
                                                    </Flex>

                                                    <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}>
                                                        {isAiServerActive
                                                            ? "The cloud AI API is active and ready to process legal documents."
                                                            : "The AI API is not responding. Check your API key in Settings."}
                                                    </Text>
                                                </VStack>
                                            </Card>

                                            <Card
                                                bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                                                backdropFilter="blur(20px)"
                                                border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`}
                                                borderRadius="2xl"
                                                p={cardPadding}
                                                boxShadow={colorMode === 'dark' ? 'none' : 'lg'}
                                            >
                                                <VStack spacing={6} align="start">
                                                    <Heading
                                                        size={{ base: 'md', md: 'lg' }}
                                                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                    >
                                                        Notifications
                                                    </Heading>

                                                    <VStack spacing={4} w="full">
                                                        {[
                                                            { key: 'emailNotifications', label: 'Email Notifications', icon: FiMail },
                                                            { key: 'smsNotifications', label: 'SMS Notifications', icon: FiPhone },
                                                            { key: 'documentUpdates', label: 'Document Updates', icon: FiFileText },
                                                            { key: 'securityAlerts', label: 'Security Alerts', icon: FiShield },
                                                            { key: 'marketingEmails', label: 'Marketing Emails', icon: FiBell }
                                                        ].map((setting) => {
                                                            const IconComponent = setting.icon
                                                            return (
                                                                <Flex
                                                                    key={setting.key}
                                                                    justify="space-between"
                                                                    align="center"
                                                                    w="full"
                                                                    flexDirection={{ base: 'row', sm: 'row' }}
                                                                    gap={2}
                                                                >
                                                                    <HStack spacing={3} flex="1" minW="0">
                                                                        <IconComponent
                                                                            color="#970fff"
                                                                            size={18}
                                                                        />
                                                                        <Text
                                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                                            noOfLines={1}
                                                                        >
                                                                            {setting.label}
                                                                        </Text>
                                                                    </HStack>
                                                                    <Switch
                                                                        isChecked={settings[setting.key as keyof typeof settings] as boolean}
                                                                        onChange={(e) => setSettings({
                                                                            ...settings,
                                                                            [setting.key]: e.target.checked
                                                                        })}
                                                                        colorScheme="purple"
                                                                        size={{ base: 'md', md: 'lg' }}
                                                                    />
                                                                </Flex>
                                                            )
                                                        })}
                                                    </VStack>
                                                </VStack>
                                            </Card>
                                        </VStack>
                                    </GridItem>

                                    <GridItem>
                                        <Card
                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                                            backdropFilter="blur(20px)"
                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`}
                                            borderRadius="2xl"
                                            p={cardPadding}
                                            boxShadow={colorMode === 'dark' ? 'none' : 'lg'}
                                        >
                                            <VStack spacing={6} align="start">
                                                <Heading
                                                    size={{ base: 'md', md: 'lg' }}
                                                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                >
                                                    Preferences
                                                </Heading>

                                                <VStack spacing={4} w="full">
                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            Theme
                                                        </FormLabel>
                                                        <Select
                                                            value={settings.theme}
                                                            onChange={(e) => {
                                                                const newTheme = e.target.value as 'light' | 'dark' | 'auto'
                                                                setSettings({ ...settings, theme: newTheme })
                                                                // Immediately apply theme change
                                                                if (newTheme === 'light' || newTheme === 'dark') {
                                                                    setColorMode(newTheme)
                                                                } else if (newTheme === 'auto') {
                                                                    // Detect system preference and apply
                                                                    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                                                                    const autoTheme = systemPrefersDark ? 'dark' : 'light'
                                                                    setColorMode(autoTheme)
                                                                }
                                                            }}
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            _focus={{
                                                                borderColor: 'brand.500',
                                                                boxShadow: '0 0 0 1px #970fff'
                                                            }}
                                                            size={{ base: 'md', md: 'lg' }}
                                                        >
                                                            <option value="dark" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>Dark</option>
                                                            <option value="light" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>Light</option>
                                                            <option value="auto" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>Auto</option>
                                                        </Select>
                                                    </FormControl>

                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            Language
                                                        </FormLabel>
                                                        <Select
                                                            value={settings.language}
                                                            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            _focus={{
                                                                borderColor: 'brand.500',
                                                                boxShadow: '0 0 0 1px #970fff'
                                                            }}
                                                            size={{ base: 'md', md: 'lg' }}
                                                        >
                                                            <option value="en" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>English</option>
                                                            <option value="es" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>Spanish</option>
                                                            <option value="fr" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>French</option>
                                                            <option value="de" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>German</option>
                                                        </Select>
                                                    </FormControl>

                                                    <FormControl>
                                                        <FormLabel
                                                            color={colorMode === 'dark' ? 'white' : 'gray.700'}
                                                            fontSize={{ base: 'sm', md: 'md' }}
                                                        >
                                                            Timezone
                                                        </FormLabel>
                                                        <Select
                                                            value={settings.timezone}
                                                            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                                            bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "white"}
                                                            border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`}
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            _focus={{
                                                                borderColor: 'brand.500',
                                                                boxShadow: '0 0 0 1px #970fff'
                                                            }}
                                                            size={{ base: 'md', md: 'lg' }}
                                                        >
                                                            <option value="America/New_York" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>Eastern Time</option>
                                                            <option value="America/Chicago" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>Central Time</option>
                                                            <option value="America/Denver" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>Mountain Time</option>
                                                            <option value="America/Los_Angeles" style={{ background: colorMode === 'dark' ? '#1a1a1a' : 'white', color: colorMode === 'dark' ? 'white' : 'black' }}>Pacific Time</option>
                                                        </Select>
                                                    </FormControl>
                                                </VStack>

                                                <Button
                                                    w={{ base: 'full', md: 'auto' }}
                                                    bg="linear-gradient(135deg, #970fff, #7817ff)"
                                                    color="white"
                                                    leftIcon={<FiSave />}
                                                    onClick={handleSaveSettings}
                                                    size={buttonSize}
                                                    _hover={{
                                                        bg: 'linear-gradient(135deg, #7817ff, #5a0bd9)'
                                                    }}
                                                >
                                                    Save Settings
                                                </Button>
                                            </VStack>
                                        </Card>
                                    </GridItem>
                                </Grid>
                            </TabPanel>

                            {/* Activity Tab */}
                            <TabPanel p={0}>
                                <VStack spacing={8}>
                                    {/* Stats Cards */}
                                    <Grid
                                        templateColumns={{ base: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' }}
                                        gap={{ base: 4, md: 6 }}
                                        w="full"
                                    >
                                        {stats.map((stat, index) => {
                                            const IconComponent = stat.icon
                                            return (
                                                <Card
                                                    key={index}
                                                    bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                                                    backdropFilter="blur(20px)"
                                                    border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`}
                                                    borderRadius="xl"
                                                    p={{ base: 4, md: 6 }}
                                                    boxShadow={colorMode === 'dark' ? 'none' : 'lg'}
                                                >
                                                    <Stat>
                                                        <Flex justify="space-between" align="start" mb={2}>
                                                            <StatLabel
                                                                color="gray.400"
                                                                fontSize={{ base: 'xs', md: 'sm' }}
                                                                noOfLines={2}
                                                            >
                                                                {stat.label}
                                                            </StatLabel>
                                                            <Box
                                                                bg="rgba(151, 15, 255, 0.2)"
                                                                p={{ base: 1.5, md: 2 }}
                                                                borderRadius="lg"
                                                                border="1px solid rgba(151, 15, 255, 0.3)"
                                                                flexShrink={0}
                                                            >
                                                                <IconComponent size={16} color="#970fff" />
                                                            </Box>
                                                        </Flex>
                                                        <StatNumber
                                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                            fontSize={{ base: 'lg', md: '2xl' }}
                                                            fontWeight="bold"
                                                            noOfLines={1}
                                                        >
                                                            {stat.value}
                                                        </StatNumber>
                                                        <StatHelpText
                                                            color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                                                            mb={0}
                                                            fontSize={{ base: 'xs', md: 'sm' }}
                                                            noOfLines={1}
                                                        >
                                                            <StatArrow type={stat.isIncrease ? 'increase' : 'decrease'} />
                                                            {stat.change}
                                                        </StatHelpText>
                                                    </Stat>
                                                </Card>
                                            )
                                        })}
                                    </Grid>

                                    {/* Recent Activity */}
                                    <Card
                                        bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                                        backdropFilter="blur(20px)"
                                        border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`}
                                        borderRadius="2xl"
                                        p={cardPadding}
                                        w="full"
                                        boxShadow={colorMode === 'dark' ? 'none' : 'lg'}
                                    >
                                        <VStack spacing={6} align="start">
                                            <Heading
                                                size={{ base: 'md', md: 'lg' }}
                                                color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                            >
                                                Recent Activity
                                            </Heading>

                                            <VStack spacing={4} w="full">
                                                {recentActivity.map((activity) => (
                                                    <Flex
                                                        key={activity.id}
                                                        justify="space-between"
                                                        align={{ base: 'flex-start', md: 'center' }}
                                                        w="full"
                                                        p={{ base: 3, md: 4 }}
                                                        bg={colorMode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"}
                                                        borderRadius="lg"
                                                        border={`1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`}
                                                        flexDirection={{ base: 'column', md: 'row' }}
                                                        gap={{ base: 2, md: 0 }}
                                                    >
                                                        <VStack spacing={1} align="start" flex="1">
                                                            <Text
                                                                color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                                                fontWeight="medium"
                                                                fontSize={{ base: 'sm', md: 'md' }}
                                                            >
                                                                {activity.title}
                                                            </Text>
                                                            <Text
                                                                color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                                                                fontSize={{ base: 'xs', md: 'sm' }}
                                                            >
                                                                {activity.timestamp}
                                                            </Text>
                                                        </VStack>
                                                        <Badge
                                                            colorScheme={
                                                                activity.status === 'completed' ? 'green' :
                                                                    activity.status === 'pending' ? 'yellow' :
                                                                        'gray'
                                                            }
                                                            variant="subtle"
                                                            px={3}
                                                            py={1}
                                                            borderRadius="full"
                                                            fontSize={{ base: 'xs', md: 'sm' }}
                                                            alignSelf={{ base: 'flex-start', md: 'center' }}
                                                        >
                                                            {activity.status}
                                                        </Badge>
                                                    </Flex>
                                                ))}
                                            </VStack>
                                        </VStack>
                                    </Card>

                                    {/* Save Settings Button */}
                                    <Button
                                        bg="linear-gradient(135deg, #970fff, #7817ff)"
                                        color="white"
                                        leftIcon={<FiSave />}
                                        onClick={handleSaveSettings}
                                        size={buttonSize}
                                        w={{ base: 'full', md: 'auto' }}
                                        alignSelf={{ base: 'stretch', md: 'flex-start' }}
                                        _hover={{
                                            bg: 'linear-gradient(135deg, #7817ff, #5a0bd9)'
                                        }}
                                    >
                                        Save Settings
                                    </Button>
                                </VStack>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </MotionBox>
            </ResponsiveContainer>
        </Box>
    )
}

export default Profile
