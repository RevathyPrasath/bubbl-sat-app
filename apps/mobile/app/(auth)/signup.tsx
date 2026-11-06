import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/Colors'

export default function SignUpScreen() {
  const { signUp, signInWithGoogle, signInWithFacebook } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)

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

  async function handleSignUp() {
    setError(null)

    if (!name.trim() || !email.trim() || !password.trim() || !birthYear.trim()) {
      setError('Please fill in all fields.')
      return
    }

    const age = new Date().getFullYear() - parseInt(birthYear, 10)
    if (isNaN(age) || age < 13) {
      Alert.alert(
        'Age Requirement',
        'Bubbl is designed for students 13 and older. Please ask a parent or guardian to contact us.',
        [{ text: 'OK' }]
      )
      return
    }

    setLoading(true)
    try {
      const { needsConfirmation } = await signUp(email.trim(), password, name.trim())
      if (needsConfirmation) {
        setConfirmEmail(email.trim())
      } else {
        router.replace('/(app)/diagnostic')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function inputStyle(field: string) {
    return [styles.input, focusedField === field && styles.inputFocused]
  }

  if (confirmEmail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmIcon}>📧</Text>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmEmail}>{confirmEmail}</Text>
          </Text>
          <Text style={styles.confirmSub}>
            Click the link in the email to activate your account, then sign in.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(auth)/signin')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
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

          <Text style={styles.title}>Create Account</Text>

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

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={inputStyle('name')}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="words"
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
          />

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
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={inputStyle('password')}
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 8 characters"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={styles.label}>Birth Year</Text>
          <TextInput
            style={inputStyle('birthYear')}
            value={birthYear}
            onChangeText={setBirthYear}
            placeholder="e.g. 2008"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
            maxLength={4}
            onFocus={() => setFocusedField('birthYear')}
            onBlur={() => setFocusedField(null)}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/signin')} style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? Sign In</Text>
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
  confirmContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  confirmIcon: {
    fontSize: 56,
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmBody: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  confirmEmail: {
    color: Colors.primary,
    fontWeight: '600',
  },
  confirmSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
})
