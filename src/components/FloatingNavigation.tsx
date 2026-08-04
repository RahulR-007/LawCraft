import React, { useState, useEffect } from 'react'
import {
    Box,
    HStack,
    IconButton,
    Text,
    useColorMode,
    Tooltip,
    useBreakpointValue
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    FiHome,
    FiFileText,
    FiUser,
    FiHelpCircle,
    FiLogOut,
    FiServer,
    FiDollarSign,
    FiBookOpen
} from 'react-icons/fi'

const MotionBox = motion(Box)
const MotionHStack = motion(HStack)

interface FloatingNavProps {
    // No props needed currently
}

const FloatingNavigation: React.FC<FloatingNavProps> = () => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [lastActivity, setLastActivity] = useState(Date.now())
    const { colorMode } = useColorMode()
    const navigate = useNavigate()
    const location = useLocation()
    const { signOut } = useAuth()

    // Responsive values
    const isMobile = useBreakpointValue({ base: true, md: false })
    const navSize = useBreakpointValue({ base: 'md', md: 'md' })
    const collapsedWidth = useBreakpointValue({ base: 110, md: 140 })
    const collapsedHeight = useBreakpointValue({ base: 44, md: 48 })
    const topPosition = useBreakpointValue({ base: '12px', md: '24px' })
    const spacing = useBreakpointValue({ base: 2, md: 3 })

    // Auto-collapse after inactivity
    useEffect(() => {
        const timer = setInterval(() => {
            if (Date.now() - lastActivity > 1200 && !isHovered) { // 1.2 seconds - slightly longer for smoother feel
                setIsExpanded(false)
            }
        }, 100) // Check every 100ms for very responsive behavior

        return () => clearInterval(timer)
    }, [lastActivity, isHovered])

    // Update activity timestamp
    const updateActivity = () => {
        setLastActivity(Date.now())
        if (!isExpanded) {
            setIsExpanded(true)
        }
    }

    // Navigation items grouped by position
    const leftNavItems = [
        {
            icon: FiHome,
            label: 'Dashboard',
            path: '/dashboard',
            isActive: location.pathname === '/dashboard'
        },
        {
            icon: FiFileText,
            label: 'Generate',
            path: '/generate',
            isActive: location.pathname === '/generate'
        }
    ]

    const rightNavItems = [
        {
            icon: FiBookOpen,
            label: 'Law Updates',
            path: '/law-updates',
            isActive: location.pathname === '/law-updates'
        },
        {
            icon: FiUser,
            label: 'Profile',
            path: '/profile',
            isActive: location.pathname === '/profile'
        },
        {
            icon: FiHelpCircle,
            label: 'Help',
            path: '/help',
            isActive: location.pathname === '/help'
        },
        {
            icon: FiDollarSign,
            label: 'Pricing',
            path: '/pricing',
            isActive: location.pathname === '/pricing'
        },
        {
            icon: FiServer,
            label: 'AI Settings',
            path: '/ai-settings',
            isActive: location.pathname === '/ai-settings'
        }
    ]

    // Get current active item
    const getCurrentActiveItem = () => {
        const allItems = [...leftNavItems, ...rightNavItems]
        return allItems.find(item => item.isActive) || leftNavItems[0]
    }

    const activeItem = getCurrentActiveItem()

    const handleLogout = async () => {
        await signOut()
        navigate('/')
    }

    const handleNavigation = (path: string) => {
        navigate(path)
        updateActivity()
    }

    return (
        <MotionBox
            position="fixed"
            top={topPosition}
            left="50%"
            transform="translateX(-50%)"
            zIndex="9999"
            onMouseEnter={() => {
                setIsHovered(true)
                updateActivity()
            }}
            onMouseLeave={() => setIsHovered(false)}
            onClick={updateActivity}
        >
            <AnimatePresence mode="wait">
                {isExpanded ? (
                    // Expanded Dynamic Island
                    <MotionBox
                        key="expanded"
                        initial={{ width: collapsedWidth, height: collapsedHeight, borderRadius: "20px" }}
                        animate={{ width: 'auto', height: 'auto', borderRadius: "30px" }}
                        exit={{
                            width: collapsedWidth,
                            height: collapsedHeight,
                            borderRadius: "20px",
                            transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
                        }}
                        transition={{
                            duration: 0.4,
                            ease: [0.25, 0.1, 0.25, 1]
                        }}
                        bg="rgba(0, 0, 0, 0.95)"
                        backdropFilter="blur(30px)"
                        borderRadius="25px"
                        border="1px solid rgba(151, 15, 255, 0.6)"
                        boxShadow="0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(151, 15, 255, 0.3)"
                        overflow="hidden"
                    >
                        <HStack spacing={spacing} p={isMobile ? 2 : 4}>
                            {/* Left Navigation Items */}
                            <MotionHStack
                                spacing={isMobile ? 1 : 2}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{
                                    opacity: 0,
                                    x: -20,
                                    transition: { duration: 0.15, ease: "easeOut" }
                                }}
                                transition={{ delay: 0.1, duration: 0.2 }}
                            >
                                {leftNavItems.map((item) => (
                                    <Tooltip
                                        key={item.path}
                                        label={item.label}
                                        placement="bottom"
                                        hasArrow
                                    >
                                        <IconButton
                                            aria-label={item.label}
                                            icon={<item.icon />}
                                            size={navSize}
                                            variant="ghost"
                                            borderRadius="full"
                                            color={item.isActive ?
                                                'white' :
                                                (colorMode === 'dark' ? 'gray.400' : 'gray.600')
                                            }
                                            bg={item.isActive ?
                                                'linear-gradient(135deg, #970fff, #7817ff)' :
                                                'transparent'
                                            }
                                            onClick={() => handleNavigation(item.path)}
                                            _hover={{
                                                bg: item.isActive ?
                                                    'linear-gradient(135deg, #7817ff, #5a0bd9)' :
                                                    (colorMode === 'dark' ?
                                                        'rgba(255, 255, 255, 0.1)' :
                                                        'rgba(0, 0, 0, 0.05)'
                                                    ),
                                                transform: 'scale(1.1)',
                                                boxShadow: item.isActive ?
                                                    '0 0 20px rgba(151, 15, 255, 0.5)' :
                                                    'none'
                                            }}
                                            transition="all 0.2s ease"
                                        />
                                    </Tooltip>
                                ))}
                            </MotionHStack>

                            {/* Center Logo */}
                            <MotionBox
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.8,
                                    transition: { duration: 0.15, ease: "easeOut" }
                                }}
                                transition={{ delay: 0.15, duration: 0.2 }}
                                mx={2}
                            >
                                <Text
                                    fontSize={isMobile ? "xs" : "sm"}
                                    fontWeight="bold"
                                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                    cursor="pointer"
                                    onClick={() => handleNavigation('/dashboard')}
                                    letterSpacing="0.5px"
                                    whiteSpace="nowrap"
                                    display={isMobile ? 'none' : 'block'}
                                >
                                    Law<Text as="span" color="brand.500">Craft</Text>
                                </Text>
                            </MotionBox>

                            {/* Right Navigation Items */}
                            <MotionHStack
                                spacing={isMobile ? 1 : 2}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{
                                    opacity: 0,
                                    x: 20,
                                    transition: { duration: 0.15, ease: "easeOut" }
                                }}
                                transition={{ delay: 0.2, duration: 0.2 }}
                            >
                                {rightNavItems.map((item) => (
                                    <Tooltip
                                        key={item.path}
                                        label={item.label}
                                        placement="bottom"
                                        hasArrow
                                    >
                                        <IconButton
                                            aria-label={item.label}
                                            icon={<item.icon />}
                                            size={navSize}
                                            variant="ghost"
                                            borderRadius="full"
                                            color={item.isActive ?
                                                'white' :
                                                (colorMode === 'dark' ? 'gray.400' : 'gray.600')
                                            }
                                            bg={item.isActive ?
                                                'linear-gradient(135deg, #970fff, #7817ff)' :
                                                'transparent'
                                            }
                                            onClick={() => handleNavigation(item.path)}
                                            _hover={{
                                                bg: item.isActive ?
                                                    'linear-gradient(135deg, #7817ff, #5a0bd9)' :
                                                    (colorMode === 'dark' ?
                                                        'rgba(255, 255, 255, 0.1)' :
                                                        'rgba(0, 0, 0, 0.05)'
                                                    ),
                                                transform: 'scale(1.1)',
                                                boxShadow: item.isActive ?
                                                    '0 0 20px rgba(151, 15, 255, 0.5)' :
                                                    'none'
                                            }}
                                            transition="all 0.2s ease"
                                        />
                                    </Tooltip>
                                ))}

                                {/* Logout Button */}
                                <Box w="1px" h="20px" bg={colorMode === 'dark' ? 'gray.600' : 'gray.300'} mx={1} />

                                <Tooltip label="Logout" placement="bottom" hasArrow>
                                    <IconButton
                                        aria-label="Logout"
                                        icon={<FiLogOut />}
                                        size={navSize}
                                        variant="ghost"
                                        borderRadius="full"
                                        color="red.400"
                                        onClick={handleLogout}
                                        _hover={{
                                            bg: 'rgba(255, 0, 0, 0.1)',
                                            transform: 'scale(1.1)',
                                            color: 'red.500'
                                        }}
                                        transition="all 0.2s ease"
                                    />
                                </Tooltip>
                            </MotionHStack>
                        </HStack>
                    </MotionBox>
                ) : (
                    // Collapsed Dynamic Island (Pill Shape)
                    <MotionBox
                        key="collapsed"
                        initial={{ width: 'auto', height: 'auto', borderRadius: "30px", opacity: 0 }}
                        animate={{
                            width: collapsedWidth,
                            height: collapsedHeight,
                            borderRadius: "20px",
                            opacity: 1
                        }}
                        exit={{
                            width: 'auto',
                            height: 'auto',
                            borderRadius: "30px",
                            opacity: 0,
                            transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
                        }}
                        transition={{
                            duration: 0.3,
                            ease: [0.25, 0.1, 0.25, 1],
                            delay: 0.1
                        }}
                        bg="rgba(0, 0, 0, 0.95)"
                        backdropFilter="blur(30px)"
                        border="1px solid rgba(151, 15, 255, 0.6)"
                        boxShadow="0 10px 25px rgba(0, 0, 0, 0.5)"
                        cursor="pointer"
                        onClick={() => setIsExpanded(true)}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        overflow="hidden"
                        _hover={{
                            transform: 'scale(1.05)',
                            boxShadow: "0 15px 35px rgba(0, 0, 0, 0.7)",
                            border: "1px solid rgba(151, 15, 255, 0.8)"
                        }}
                    >
                        {/* Current page icon in collapsed state */}
                        <IconButton
                            aria-label={activeItem.label}
                            icon={<activeItem.icon />}
                            size={navSize}
                            variant="ghost"
                            borderRadius="full"
                            color="white"
                            bg="transparent"
                            _hover={{
                                bg: "transparent",
                                transform: 'scale(1.1)'
                            }}
                            transition="all 0.2s ease"
                            pointerEvents="none"
                        />
                    </MotionBox>
                )}
            </AnimatePresence>

            {/* Subtle glow effect */}
            <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                w={isExpanded ? "120%" : "100%"}
                h={isExpanded ? "120%" : "100%"}
                bg="linear-gradient(135deg, rgba(151, 15, 255, 0.1), rgba(151, 15, 255, 0.05))"
                borderRadius="50px"
                filter="blur(20px)"
                opacity={0.6}
                zIndex="-1"
                transition="all 0.4s ease"
                pointerEvents="none"
            />
        </MotionBox>
    )
}

export default FloatingNavigation
