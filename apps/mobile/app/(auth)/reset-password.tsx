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

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset() {
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.')
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
          <Text style={styles.title}>Set New Password</Text>

          {!done ? (
            <>
              <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry
                autoFocus
              />

              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat your password"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry
              />

              {/* Strength hint */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  {[4, 7, 11].map((min, i) => (
                    <View
                      key={min}
                      style={[styles.strengthBar, {
                        backgroundColor: password.length >= min
                          ? i === 0 ? Colors.wrong : i === 1 ? '#FFC107' : Colors.correct
                          : Colors.border,
                      }]}
                    />
                  ))}
                  <Text style={styles.strengthLabel}>
                    {password.length < 4 ? 'Too short' : password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color={Colors.bg} />
                  : <Text style={styles.primaryButtonText}>Update Password</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Password Updated!</Text>
              <Text style={styles.successBody}>
                Your password has been changed successfully.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.replace('/(app)/home')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Go to App →</Text>
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
  container: { flex: 1, padding: 24, justifyContent: 'center' },
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
    color: Colors.textPrimary, fontSize: 16, marginBottom: 16,
  },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { color: Colors.textSecondary, fontSize: 12, width: 60 },
  primaryButton: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  successCard: { alignItems: 'center' },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 12 },
  successBody: { color: Colors.textSecondary, fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 32 },
})
