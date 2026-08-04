import { createClient } from '@supabase/supabase-js'

// Fallback values for deployment builds when environment variables are not configured in hosting dashboard
const fallbackUrl = 'https://snbwdyhegzjprtcxbnvn.supabase.co'
const fallbackAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYndkeWhlZ3pqcHJ0Y3hibnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY5MDAwMDAsImV4cCI6MjAyMjQ3NjAwMH0.placeholder'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackAnonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


