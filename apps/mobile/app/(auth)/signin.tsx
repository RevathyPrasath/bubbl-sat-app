import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useState, useRef } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/Colors'

export default function SignInScreen() {
  const { signIn, signInWithGoogle, signInWithFacebook } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const passwordRef = useRef<TextInput>(null)

  async function handleGoogleSignIn() {
    setError(null)
    setSocialLoading('google')
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed.')
    } finally {
      setSocialLoading(null)
    }
  }

  async function handleFacebookSignIn() {
    setError(null)
    setSocialLoading('facebook')
    try {
      await signInWithFacebook()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Facebook sign in failed.')
    } finally {
      setSocialLoading(null)
    }
  }

  async function handleSignIn() {
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function inputStyle(field: string) {
    return [styles.input, focusedField === field && styles.inputFocused]
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Sign In</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={!!socialLoading}
            activeOpacity={0.8}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.googleButtonText}>G  Continue with Google</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.facebookButton}
            onPress={handleFacebookSignIn}
            disabled={!!socialLoading}
            activeOpacity={0.8}
          >
            {socialLoading === 'facebook' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.facebookButtonText}>f  Continue with Facebook</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={inputStyle('email')}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            accessibilityLabel="Email address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordRef}
            style={inputStyle('password')}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSignIn}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            accessibilityLabel="Password"
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.linkRow}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={styles.linkRow}>
            <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 24,
  },
  backText: {
    color: Colors.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  errorText: {
    color: Colors.wrong,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#2A0A0A',
    padding: 12,
    borderRadius: 8,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  facebookButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  linkRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
  },
})
