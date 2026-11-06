import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../constants/Colors'
import { supabase } from '../../lib/supabase'

export default function WelcomeScreen() {
  const [guestLoading, setGuestLoading] = useState(false)
  const [guestError, setGuestError] = useState('')

  async function handleGuest() {
    setGuestLoading(true)
    setGuestError('')
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setGuestError('Guest sign-in unavailable. Please create an account.')
    }
    // AuthContext will detect the new session and redirect to home automatically
    setGuestLoading(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🫧 bubbl</Text>
        <Text style={styles.tagline}>Adaptive SAT Practice. Free.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/signin')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleGuest}
          disabled={guestLoading}
          activeOpacity={0.7}
        >
          {guestLoading
            ? <ActivityIndicator color={Colors.textSecondary} size="small" />
            : <Text style={styles.guestButtonText}>Try without an account</Text>
          }
        </TouchableOpacity>

        {guestError ? <Text style={styles.guestError}>{guestError}</Text> : null}

        <Text style={styles.noCard}>No credit card required</Text>
      </View>

      <View style={styles.features}>
        <Text style={styles.featureItem}>✓  Adapts to your level</Text>
        <Text style={styles.featureItem}>✓  Step-by-step explanations</Text>
        <Text style={styles.featureItem}>✓  Daily challenge — compete with peers</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: Colors.card,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  guestError: {
    color: Colors.wrong,
    fontSize: 13,
    textAlign: 'center',
  },
  noCard: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  features: {
    gap: 8,
  },
  featureItem: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
})
