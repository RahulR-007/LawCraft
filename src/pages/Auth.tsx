import React, { useState } from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton,
  Link as ChakraLink,
  useToast,
  Divider,
} from '@chakra-ui/react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate, useLocation } from 'react-router-dom'

const MotionBox = motion(Box)

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const from = (location.state as any)?.from?.pathname || sessionStorage.getItem('lawcraft_redirect') || '/dashboard'

  React.useEffect(() => {
    if ((location.state as any)?.from?.pathname) {
      sessionStorage.setItem('lawcraft_redirect', (location.state as any).from.pathname)
    }
  }, [location])

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      sessionStorage.setItem('lawcraft_redirect', from)
      const { error } = await signInWithGoogle()
      if (error) {
        const rawMsg = error.message || ''
        if (rawMsg.includes('provider is not enabled') || rawMsg.includes('Unsupported provider')) {
          setError('Google Sign-In is not enabled yet in your Supabase Dashboard. Go to Supabase Dashboard > Authentication > Providers > Google and toggle it ON.')
        } else {
          setError(rawMsg || 'Failed to initialize Google Sign-In')
        }
        setGoogleLoading(false)
      }
    } catch (err: any) {
      const rawMsg = err?.message || ''
      if (rawMsg.includes('provider is not enabled') || rawMsg.includes('Unsupported provider')) {
        setError('Google Sign-In is not enabled yet in your Supabase Dashboard. Go to Supabase Dashboard > Authentication > Providers > Google and toggle it ON.')
      } else {
        setError(rawMsg || 'Google Sign-In failed')
      }
      setGoogleLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long')
        setLoading(false)
        return
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      const { error } = await signUp(formData.email, formData.password, formData.fullname)
      if (error) {
        setError(error.message || 'Registration failed')
      } else {
        toast({
          title: 'Account created successfully!',
          description: 'Please check your email to verify your account.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        })
        setIsSignUp(false)
        setFormData({
          fullname: '',
          email: '',
          password: '',
          confirmPassword: '',
        })
      }
    } else {
      const { error } = await signIn(formData.email, formData.password)
      if (error) {
        setError(error.message || 'Login failed')
      } else {
        sessionStorage.removeItem('lawcraft_redirect')
        navigate(from, { replace: true })
      }
    }

    setLoading(false)
  }

  return (
    <Box
      minH="100vh"
      bg="black"
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
    >
      {/* Background effects */}
      <Box
        position="absolute"
        top="20%"
        left="10%"
        w="100px"
        h="100px"
        borderRadius="full"
        bg="linear-gradient(135deg, rgba(151, 15, 255, 0.3), transparent)"
        filter="blur(40px)"
        animation="float 6s ease-in-out infinite"
      />
      <Box
        position="absolute"
        bottom="20%"
        right="10%"
        w="150px"
        h="150px"
        borderRadius="full"
        bg="linear-gradient(135deg, rgba(151, 15, 255, 0.2), transparent)"
        filter="blur(60px)"
        animation="float 8s ease-in-out infinite reverse"
      />

      <Container maxW="md" zIndex="1">
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <VStack spacing={6} textAlign="center" mb={8}>
            <Heading fontSize="4xl" color="white" fontWeight="900">
              Welcome to <Text as="span" color="brand.500">LawCraft</Text>
            </Heading>
            <Text fontSize="lg" color="gray.400">
              {isSignUp ? 'Create your account to get started' : 'Sign in to your account'}
            </Text>
            <Text fontSize="sm" color="gray.500">
              <Link to="/" style={{ color: 'var(--chakra-colors-brand-500)', textDecoration: 'none' }}>
                <span style={{ color: 'var(--chakra-colors-brand-500)' }}>← Back to Home</span>
              </Link>
            </Text>
          </VStack>

          {/* Auth Form */}
          <Box
            bg="rgba(255, 255, 255, 0.05)"
            backdropFilter="blur(10px)"
            borderRadius="lg"
            p={8}
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            boxShadow="0 0 20px rgba(151, 15, 255, 0.3)"
          >
            <form onSubmit={handleSubmit}>
              <VStack spacing={6}>
                {error && (
                  <Alert status="error" borderRadius="md" bg="red.900" color="white">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}

                {/* Google OAuth Sign-In Button */}
                <Button
                  w="full"
                  size="lg"
                  variant="outline"
                  leftIcon={<FcGoogle size={22} />}
                  onClick={handleGoogleSignIn}
                  isLoading={googleLoading}
                  loadingText="Connecting to Google..."
                  bg="rgba(255, 255, 255, 0.08)"
                  color="white"
                  borderColor="rgba(255, 255, 255, 0.2)"
                  _hover={{
                    bg: 'rgba(255, 255, 255, 0.15)',
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    transform: 'translateY(-1px)',
                  }}
                  _active={{
                    bg: 'rgba(255, 255, 255, 0.2)',
                  }}
                  fontWeight="600"
                >
                  Continue with Google
                </Button>

                <HStack w="full" my={1}>
                  <Divider borderColor="rgba(255, 255, 255, 0.15)" />
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" px={2} whiteSpace="nowrap">
                    or continue with email
                  </Text>
                  <Divider borderColor="rgba(255, 255, 255, 0.15)" />
                </HStack>

                {isSignUp && (
                  <>
                    <FormControl>
                      <FormLabel color="white">Full Name</FormLabel>
                      <Input
                        name="fullname"
                        type="text"
                        value={formData.fullname}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        bg="rgba(255, 255, 255, 0.1)"
                        border="1px solid"
                        borderColor="rgba(255, 255, 255, 0.2)"
                        color="white"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{
                          borderColor: 'brand.500',
                          boxShadow: '0 0 0 1px #970fff',
                        }}
                        required
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel color="white">Email</FormLabel>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        bg="rgba(255, 255, 255, 0.1)"
                        border="1px solid"
                        borderColor="rgba(255, 255, 255, 0.2)"
                        color="white"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{
                          borderColor: 'brand.500',
                          boxShadow: '0 0 0 1px #970fff',
                        }}
                        required
                      />
                    </FormControl>
                  </>
                )}

                {!isSignUp && (
                  <FormControl>
                    <FormLabel color="white">Email</FormLabel>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      bg="rgba(255, 255, 255, 0.1)"
                      border="1px solid"
                      borderColor="rgba(255, 255, 255, 0.2)"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{
                        borderColor: 'brand.500',
                        boxShadow: '0 0 0 1px #970fff',
                      }}
                      required
                    />
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel color="white">Password</FormLabel>
                  <InputGroup>
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      bg="rgba(255, 255, 255, 0.1)"
                      border="1px solid"
                      borderColor="rgba(255, 255, 255, 0.2)"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{
                        borderColor: 'brand.500',
                        boxShadow: '0 0 0 1px #970fff',
                      }}
                      required
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                        variant="ghost"
                        size="sm"
                        color="gray.400"
                        _hover={{ color: 'white' }}
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {isSignUp && (
                  <FormControl>
                    <FormLabel color="white">Confirm Password</FormLabel>
                    <Input
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      bg="rgba(255, 255, 255, 0.1)"
                      border="1px solid"
                      borderColor="rgba(255, 255, 255, 0.2)"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{
                        borderColor: 'brand.500',
                        boxShadow: '0 0 0 1px #970fff',
                      }}
                      required
                    />
                  </FormControl>
                )}

                <Button
                  type="submit"
                  w="full"
                  size="lg"
                  bg="linear-gradient(135deg, #970fff, #7817ff)"
                  color="white"
                  _hover={{
                    bg: 'linear-gradient(135deg, #7817ff, #5a0bd9)',
                    transform: 'translateY(-2px)',
                  }}
                  isLoading={loading}
                  loadingText={isSignUp ? 'Creating Account...' : 'Signing In...'}
                >
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>

                <HStack spacing={1} color="gray.400">
                  <Text>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</Text>
                  <ChakraLink
                    color="brand.500"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setError('')
                      setFormData({
                        fullname: '',
                        email: '',
                        password: '',
                        confirmPassword: '',
                      })
                    }}
                    cursor="pointer"
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </ChakraLink>
                </HStack>
              </VStack>
            </form>
          </Box>
        </MotionBox>
      </Container>
    </Box>
  )
}

export default AuthPage
