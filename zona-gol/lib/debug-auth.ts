// Debug utility to test Supabase connection and auth
"use client"

import { createClientSupabaseClient } from './supabase/client'

export async function debugSupabaseConnection() {
  console.log("🔍 Debug: Testing Supabase connection...")
  
  try {
    const supabase = createClientSupabaseClient()
    
    // Test 1: Check environment variables
    console.log("📋 Environment variables:")
    console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing")
    
    // Test 2: Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      console.error("❌ Connection error:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ Connection successful")
    
    // Test 3: Check if users table exists and has data
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5)
    
    if (usersError) {
      console.error("❌ Users table error:", usersError)
      return { success: false, error: `Users table error: ${usersError.message}` }
    }
    
    console.log("👥 Users in database:", usersData?.length || 0)
    if (usersData && usersData.length > 0) {
      console.log("Sample users:", usersData)
    }
    
    // Test 4: Test auth session
    const { data: session } = await supabase.auth.getSession()
    console.log("🔐 Current session:", session.session ? "Active" : "None")
    
    return { 
      success: true, 
      data: {
        usersCount: usersData?.length || 0,
        hasSession: !!session.session,
        sampleUsers: usersData
      }
    }
    
  } catch (error: any) {
    console.error("💥 Debug error:", error)
    return { success: false, error: error.message }
  }
}

export async function debugSignIn(email: string, password: string) {
  console.log(`🔐 Debug: Attempting login for ${email}`)
  
  try {
    const supabase = createClientSupabaseClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error("❌ Sign in error:", error)
      return { success: false, error: error.message }
    }
    
    console.log("✅ Sign in successful:", data.user?.email)
    return { success: true, user: data.user }
    
  } catch (error: any) {
    console.error("💥 Sign in debug error:", error)
    return { success: false, error: error.message }
  }
}