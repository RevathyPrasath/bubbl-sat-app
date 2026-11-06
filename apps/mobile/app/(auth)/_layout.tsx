import { Slot, router } from 'expo-router'
import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AuthLayout() {
  const { user, loading, passwordRecovery } = useAuth()

  useEffect(() => {
    if (loading) return
    if (passwordRecovery) {
      router.replace('/(auth)/reset-password')
    } else if (user) {
      router.replace('/(app)/home')
    }
  }, [user, loading, passwordRecovery])

  return <Slot />
}
