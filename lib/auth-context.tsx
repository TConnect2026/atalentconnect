'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from './supabase-client'

const SESSION_ACTIVITY_KEY = 'atc_last_activity'
const INACTIVITY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

type UserProfile = {
  id: string
  firm_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  created_at: string
  updated_at: string
}

type AuthContextType = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

function updateLastActivity() {
  try {
    localStorage.setItem(SESSION_ACTIVITY_KEY, Date.now().toString())
  } catch {}
}

function isSessionExpiredByInactivity(): boolean {
  try {
    const last = localStorage.getItem(SESSION_ACTIVITY_KEY)
    if (!last) return false // First visit, not expired
    return Date.now() - parseInt(last, 10) > INACTIVITY_LIMIT_MS
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }, [supabase])

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Check 30-day inactivity
        if (isSessionExpiredByInactivity()) {
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        setUser(session.user)
        fetchProfile(session.user.id)
        updateLastActivity()
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        try { localStorage.removeItem(SESSION_ACTIVITY_KEY) } catch {}
      } else if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
        updateLastActivity()
      }
      setLoading(false)
    })

    // Track activity on user interactions (throttled)
    let activityTimeout: NodeJS.Timeout | null = null
    const trackActivity = () => {
      if (activityTimeout) return
      activityTimeout = setTimeout(() => {
        updateLastActivity()
        activityTimeout = null
      }, 60_000) // Update at most once per minute
    }

    window.addEventListener('click', trackActivity)
    window.addEventListener('keydown', trackActivity)
    window.addEventListener('scroll', trackActivity)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('click', trackActivity)
      window.removeEventListener('keydown', trackActivity)
      window.removeEventListener('scroll', trackActivity)
      if (activityTimeout) clearTimeout(activityTimeout)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
