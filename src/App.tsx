import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ChakraProvider, Box, Spinner, Text, VStack } from '@chakra-ui/react'
import React, { Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import theme from './theme.new'
import './App.css'

// Lazy load components for code splitting
const Landing = React.lazy(() => import('./pages/Landing'))
const AuthPage = React.lazy(() => import('./pages/Auth'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const DocumentGenerator = React.lazy(() => import('./pages/DocumentGeneratorNew'))
const Pricing = React.lazy(() => import('./pages/Pricing'))
const Help = React.lazy(() => import('./pages/Help'))
const Profile = React.lazy(() => import('./pages/Profile'))
const AiSettingsPage = React.lazy(() => import('./pages/AiSettings'))
const LawUpdates = React.lazy(() => import('./pages/LawUpdates'))

// Loading component
const LoadingSpinner = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    height="100vh"
    bg="black"
  >
    <VStack spacing={4}>
      <Spinner size="xl" color="purple.400" thickness="4px" />
      <Text color="white" fontSize="lg">Loading...</Text>
    </VStack>
  </Box>
)

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return user ? <>{children}</> : <Navigate to="/auth" replace />
}

function App() {
  return (
    <ErrorBoundary>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/generate"
                  element={
                    <ProtectedRoute>
                      <DocumentGenerator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pricing"
                  element={<Pricing />}
                />
                <Route
                  path="/help"
                  element={<Help />}
                />
                <Route
                  path="/ai-settings"
                  element={
                    <ProtectedRoute>
                      <AiSettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/law-updates"
                  element={
                    <ProtectedRoute>
                      <LawUpdates />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ChakraProvider>
    </ErrorBoundary>
  )
}

export default App
