"use client"

import { useEffect } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { authActions } from '../actions/auth-actions'

export function useAuth() {
  const {
    user,
    profile,
    session,
    loading,
    error,
    isAuthenticated,
  } = useAuthStore()

  // Auth is initialized by SupabaseProvider, no need to initialize here

  const signIn = async (email: string, password: string) => {
    return authActions.signIn(email, password)
  }

  const signUp = async (email: string, password: string, userData: any) => {
    return authActions.signUp(email, password, userData)
  }

  const signOut = async () => {
    return authActions.signOut()
  }

  const updateProfile = async (updates: any) => {
    return authActions.updateProfile(updates)
  }

  const resetPassword = async (email: string) => {
    return authActions.resetPassword(email)
  }

  const updatePassword = async (newPassword: string) => {
    return authActions.updatePassword(newPassword)
  }

  return {
    user,
    profile,
    session,
    loading,
    error,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
  }
}