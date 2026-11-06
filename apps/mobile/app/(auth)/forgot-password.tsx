import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/Colors'

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setError(null)
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    try {
      await sendPasswordReset(email.trim())
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Reset Password</Text>

          {!sent ? (
            <>
              <Text style={styles.subtitle}>
                Enter your account email and we'll send you a link to reset your password.
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleSend}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color={Colors.bg} />
                  : <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✉️</Text>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successBody}>
                We sent a password reset link to{'\n'}
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>{email}</Text>
                {'\n\n'}Click the link in the email to set a new password.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/(auth)/signin')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24 },
  backButton: { marginBottom: 24 },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  subtitle: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 28 },
  errorText: {
    color: Colors.wrong, fontSize: 14, marginBottom: 16,
    backgroundColor: '#2A0A0A', padding: 12, borderRadius: 8,
  },
  label: { color: Colors.textSecondary, fontSize: 14, marginBottom: 6 },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
    color: Colors.textPrimary, fontSize: 16, marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  successCard: { alignItems: 'center', paddingTop: 20 },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 12 },
  successBody: { color: Colors.textSecondary, fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 32 },
})
