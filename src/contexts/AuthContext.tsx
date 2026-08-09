import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  user_metadata: {
    fullname?: string
    full_name?: string
    name?: string
    avatar_url?: string
    picture?: string
    avatar?: string
    plan_name?: string
    tokens?: number
    phone?: string
    company?: string
    position?: string
    location?: string
    country?: string
    state?: string
    address?: string
    bio?: string
    settings?: any
  }
}

export interface UserProfile {
  id: string
  email: string
  fullname: string
  plan_name: string
  tokens: number
  preferred_jurisdiction?: string
  documents_generated?: number
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string, fullname: string) => Promise<{ error?: any }>
  signInWithGoogle: () => Promise<{ error?: any }>
  signOut: () => Promise<{ error?: any }>
  updateUser: (userData: any) => Promise<void>
  refreshProfile: () => Promise<UserProfile | null>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        return null
      }
      return data as UserProfile
    } catch {
      return null
    }
  }

  const syncUserWithProfile = (rawUser: User | null, userProf: UserProfile | null): User | null => {
    if (!rawUser) return null
    if (!userProf) return rawUser

    return {
      ...rawUser,
      user_metadata: {
        ...rawUser.user_metadata,
        tokens: userProf.tokens,
        plan_name: userProf.plan_name,
        fullname: userProf.fullname || rawUser.user_metadata?.fullname,
      }
    }
  }

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null
    const prof = await fetchProfile(user.id)
    if (prof) {
      setProfile(prof)
      setUser(prev => syncUserWithProfile(prev, prof))
    }
    return prof
  }

  const lastFetchedUserIdRef = React.useRef<string | null>(null)

  const handleSessionChange = async (session: Session | null, isInitial = false) => {
    const currentUser = (session?.user as User) || null
    if (currentUser) {
      if (!isInitial && lastFetchedUserIdRef.current === currentUser.id) {
        setLoading(false)
        return
      }
      lastFetchedUserIdRef.current = currentUser.id
      const prof = await fetchProfile(currentUser.id)
      setProfile(prof)
      setUser(syncUserWithProfile(currentUser, prof))
    } else {
      lastFetchedUserIdRef.current = null
      setUser(null)
      setProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Safety fallback timeout: ensure loading transitions to false within 3000ms max
    const timer = setTimeout(() => {
      setLoading(false)
    }, 3000)

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      await handleSessionChange(session, true)
      clearTimeout(timer)
    }).catch(() => {
      setLoading(false)
      clearTimeout(timer)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'INITIAL_SESSION') return // Avoid race condition with getSession
        await handleSessionChange(session, false)
      }
    )

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullname: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullname,
          plan_name: 'Free',
          tokens: 2
        }
      }
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    const returnTo = sessionStorage.getItem('lawcraft_redirect') || '/dashboard'
    const targetPath = returnTo.startsWith('/') ? returnTo : '/' + returnTo
    const redirectTo = `${window.location.origin}${targetPath}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    setProfile(null)
    setUser(null)
    return { error }
  }

  const updateUser = async (userData: any) => {
    // Security: Strip billing & token fields from client-side metadata updates
    const { tokens, plan_name, documents_generated, ...safeUserData } = userData || {}

    const { error } = await supabase.auth.updateUser({
      data: safeUserData
    })
    if (error) throw error

    // Refresh the session & profile to get updated user data
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const prof = await fetchProfile(session.user.id)
      setProfile(prof)
      setUser(syncUserWithProfile(session.user as User, prof))
    }
  }

  const value = {
    user,
    profile,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateUser,
    refreshProfile,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

