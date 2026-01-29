import { createBrowserClient } from '@supabase/ssr'

// Browser client for client-side operations
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Sign up a new user (company admin)
export async function signUp(email: string, password: string, firstName: string, lastName: string, companyName: string) {
  console.log('signUp called with:', { email, firstName, lastName, companyName })
  const supabase = createClient()

  console.log('Attempting auth.signUp...')
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
      },
    },
  })

  if (error) {
    console.error('Auth signUp error:', error)
    throw error
  }

  console.log('Auth signUp successful, user:', data.user?.id)

  // Create firm and admin profile
  if (data.user) {
    // First create the firm/company
    console.log('Creating firm for company:', companyName)
    const { data: firmData, error: firmError } = await supabase
      .from('firms')
      .insert({
        name: companyName,
      })
      .select()
      .single()

    if (firmError) {
      console.error('Error creating firm:', firmError)
      throw new Error(`Failed to create firm: ${firmError.message}`)
    }

    console.log('Firm created:', firmData.id)

    // Now create the admin profile linked to the firm
    console.log('Attempting to insert admin profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        firm_id: firmData.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'administrator', // First user is admin
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      console.error('Profile error details:', JSON.stringify(profileError, null, 2))
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }
    console.log('Admin profile created successfully')
  }

  return data
}

// Sign in
export async function signIn(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

// Sign out
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

// Reset password request
export async function resetPassword(email: string) {
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) {
    throw error
  }
}

// Update password
export async function updatePassword(newPassword: string) {
  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw error
  }
}

// Resend verification email
export async function resendVerificationEmail(email: string) {
  const supabase = createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) {
    throw error
  }
}
