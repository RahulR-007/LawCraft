import { createClient } from '@supabase/supabase-js'

// Production Supabase Credentials (valid default fallback for live builds)
const defaultUrl = 'https://snbwdyhegzjprtcxbnvn.supabase.co'
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYndkeWhlZ3pqcHJ0Y3hibnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDEwOTcsImV4cCI6MjA4ODgxNzA5N30.yzhWSsdc-bhDjqRu7_A3qDgw2tkI89vShlb-labTtzs'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  defaultUrl

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  defaultAnonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
