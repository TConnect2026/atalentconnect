import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Warn if using placeholder values
if (typeof window !== 'undefined' && supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️ Using placeholder Supabase credentials. Please update .env.local with your actual Supabase project credentials.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
