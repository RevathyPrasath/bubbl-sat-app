import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
} from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { Colors } from '../../constants/Colors'
import { getSatDate, saveSatDate, clearSatDate, getTargetScore, saveTargetScore, getNotificationsEnabled, saveNotificationsEnabled } from '../../lib/settings-store'
import { registerForPushNotifications, disableNotifications } from '../../lib/push-notifications'

interface ProfileStats {
  totalAnswered: number
  totalCorrect: number
  accuracyPct: number
  xp: number
  level: number
  xpInLevel: number
  xpToNextLevel: number
  bestStreak: number
  strongestDomain: string | null
  weakestDomain: string | null
  plan: string
  name: string
  estimatedScoreMin?: number
  estimatedScoreMax?: number
}

function daysUntil(dateIso: string): number {
  const diff = new Date(dateIso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function levelLabel(level: number): string {
  const labels = ['Beginner', 'Learner', 'Practitioner', 'Advanced', 'Expert', 'Master']
  return labels[Math.min(level - 1, labels.length - 1)]
}

export default function ProfileScreen() {
  const { user, signOut, updatePassword } = useAuth()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [satDate, setSatDate] = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState(false)
  const [dateInput, setDateInput] = useState('')
  const [targetScore, setTargetScore] = useState<number | null>(null)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Student'
  const email = user?.email ?? ''

  useEffect(() => {
    Promise.all([
      apiFetch('/api/profile-stats').catch(() => null),
      apiFetch('/api/gap-analysis').catch(() => null),
      getSatDate(),
      getTargetScore(),
      getNotificationsEnabled(),
    ]).then(([statsData, gapData, savedDate, savedTarget, notifEnabled]) => {
      if (statsData) {
        const s = statsData as ProfileStats
        if (gapData) {
          s.estimatedScoreMin = (gapData as any).estimatedScoreMin
          s.estimatedScoreMax = (gapData as any).estimatedScoreMax
        }
        setStats(s)
      }
      if (savedDate) setSatDate(savedDate)
      if (savedTarget) setTargetScore(savedTarget)
      setNotificationsEnabled(notifEnabled as boolean)
    }).finally(() => setLoading(false))
  }, [])

  async function handleSaveDate() {
    if (!dateInput.trim()) return
    const iso = new Date(dateInput).toISOString()
    await saveSatDate(iso)
    setSatDate(iso)
    setEditingDate(false)
    setDateInput('')
  }

  async function handleClearDate() {
    await clearSatDate()
    setSatDate(null)
  }

  async function handleSaveTarget() {
    const score = parseInt(targetInput, 10)
    if (isNaN(score) || score < 400 || score > 1600) {
      Alert.alert('Invalid score', 'Enter a score between 400 and 1600.')
      return
    }
    const rounded = Math.round(score / 10) * 10
    await saveTargetScore(rounded)
    setTargetScore(rounded)
    setEditingTarget(false)
    setTargetInput('')
  }

  async function handleChangePassword() {
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordLoading(true)
    try {
      await updatePassword(newPassword)
      setShowPasswordForm(false)
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert('Success', 'Password updated successfully.')
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleToggleNotifications(value: boolean) {
    setNotificationsEnabled(value)
    await saveNotificationsEnabled(value)
    if (value) {
      registerForPushNotifications()
    } else {
      disableNotifications()
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      Alert.alert('Error', 'Failed to sign out.')
    }
  }

  const daysLeft = satDate ? daysUntil(satDate) : null
  const currentScoreMid = stats?.estimatedScoreMin != null && stats?.estimatedScoreMax != null
    ? Math.round((stats.estimatedScoreMin + stats.estimatedScoreMax) / 2)
    : null
  const scoreGap = targetScore && currentScoreMid ? targetScore - currentScoreMid : null

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(app)/home')} activeOpacity={0.7}>
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Identity card */}
          <View style={styles.identityCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>
            <View style={[styles.planPill, stats?.plan === 'premium' && styles.planPillPremium]}>
              <Text style={[styles.planPillText, stats?.plan === 'premium' && styles.planPillTextPremium]}>
                {stats?.plan === 'premium' ? '⭐ Premium' : 'Free'}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{stats.totalAnswered}</Text>
                <Text style={styles.statLabel}>Questions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: Colors.correct }]}>{stats.accuracyPct}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: '#FF6B00' }]}>{stats.bestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>
          )}

          {/* XP bar */}
          {stats && (
            <View style={styles.xpCard}>
              <View style={styles.xpRow}>
                <Text style={styles.levelText}>Lv {stats.level} · {levelLabel(stats.level)}</Text>
                <Text style={styles.xpText}>{stats.xp} XP</Text>
              </View>
              <View style={styles.xpBarTrack}>
                <View
                  style={[styles.xpBarFill, {
                    width: `${Math.round((stats.xpInLevel / stats.xpToNextLevel) * 100)}%`
                  }]}
                />
              </View>
              <Text style={styles.xpHint}>{stats.xpToNextLevel - stats.xpInLevel} XP to Level {stats.level + 1}</Text>
            </View>
          )}

          {/* Goals card */}
          <View style={styles.goalsCard}>
            <Text style={styles.cardSectionLabel}>GOALS</Text>
            {/* Target score row */}
            <View style={styles.goalRow}>
              <View style={styles.goalLeft}>
                <Text style={styles.goalRowLabel}>Target Score</Text>
                {!editingTarget && (
                  <Text style={styles.goalRowValue}>
                    {targetScore
                      ? `${targetScore}${scoreGap !== null ? (scoreGap <= 0 ? '  ✓' : `  +${scoreGap} to go`) : ''}`
                      : '—  tap to set'}
                  </Text>
                )}
              </View>
              {!editingTarget && (
                <TouchableOpacity onPress={() => { setEditingTarget(true); setTargetInput(targetScore ? String(targetScore) : '') }} activeOpacity={0.7}>
                  <Text style={styles.editLink}>{targetScore ? 'Edit' : 'Set'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingTarget && (
              <View style={styles.inlineForm}>
                <TextInput
                  style={styles.inlineInput}
                  value={targetInput}
                  onChangeText={setTargetInput}
                  placeholder="400–1600"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="number-pad"
                  autoFocus
                />
                <View style={styles.inlineActions}>
                  <TouchableOpacity style={styles.inlineSaveBtn} onPress={handleSaveTarget} activeOpacity={0.8}>
                    <Text style={styles.inlineSaveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => setEditingTarget(false)} activeOpacity={0.8}>
                    <Text style={styles.inlineCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.goalDivider} />

            {/* SAT date row */}
            <View style={styles.goalRow}>
              <View style={styles.goalLeft}>
                <Text style={styles.goalRowLabel}>SAT Date</Text>
                {!editingDate && (
                  <Text style={[styles.goalRowValue, daysLeft !== null && daysLeft <= 14 && { color: Colors.wrong }]}>
                    {satDate
                      ? `${new Date(satDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${daysLeft !== null ? `  (${daysLeft}d)` : ''}`
                      : '—  tap to set'}
                  </Text>
                )}
              </View>
              {!editingDate && (
                <View style={styles.goalActions}>
                  <TouchableOpacity onPress={() => setEditingDate(true)} activeOpacity={0.7}>
                    <Text style={styles.editLink}>{satDate ? 'Edit' : 'Set'}</Text>
                  </TouchableOpacity>
                  {satDate && (
                    <TouchableOpacity onPress={handleClearDate} activeOpacity={0.7}>
                      <Text style={styles.clearLink}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            {editingDate && (
              <View style={styles.inlineForm}>
                <TextInput
                  style={styles.inlineInput}
                  value={dateInput}
                  onChangeText={setDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="none"
                  autoFocus
                />
                <View style={styles.inlineActions}>
                  <TouchableOpacity style={styles.inlineSaveBtn} onPress={handleSaveDate} activeOpacity={0.8}>
                    <Text style={styles.inlineSaveBtnText}>Save</Text>
                  </TouchableOpacity>
                  {satDate && (
                    <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => setEditingDate(false)} activeOpacity={0.8}>
                      <Text style={styles.inlineCancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Insights pill row */}
          {stats && (stats.strongestDomain || stats.weakestDomain) && (
            <View style={styles.insightsPillRow}>
              {stats.strongestDomain && (
                <View style={[styles.insightPill, { borderColor: Colors.correct + '55', backgroundColor: Colors.correct + '15' }]}>
                  <Text style={[styles.insightPillText, { color: Colors.correct }]}>💪 {stats.strongestDomain}</Text>
                </View>
              )}
              {stats.weakestDomain && (
                <View style={[styles.insightPill, { borderColor: Colors.wrong + '55', backgroundColor: Colors.wrong + '15' }]}>
                  <Text style={[styles.insightPillText, { color: Colors.wrong }]}>🎯 {stats.weakestDomain}</Text>
                </View>
              )}
            </View>
          )}

          {/* My Tools */}
          <Text style={styles.groupLabel}>MY TOOLS</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.groupRow} onPress={() => router.push('/(app)/study-plan')} activeOpacity={0.8}>
              <Text style={styles.groupRowText}>📅  Study Plan</Text>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.groupRow} onPress={() => router.push('/(app)/notebook')} activeOpacity={0.8}>
              <Text style={styles.groupRowText}>📓  Wrong Answers</Text>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.groupRow} onPress={() => router.push('/(app)/achievements')} activeOpacity={0.8}>
              <Text style={styles.groupRowText}>🏆  Achievements</Text>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.groupRow} onPress={() => router.push('/(app)/history')} activeOpacity={0.8}>
              <Text style={styles.groupRowText}>📋  Session History</Text>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Account */}
          <Text style={styles.groupLabel}>ACCOUNT</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => { setShowPasswordForm(v => !v); setPasswordError(null); setNewPassword(''); setConfirmPassword('') }}
              activeOpacity={0.8}
            >
              <Text style={styles.groupRowText}>🔑  Change Password</Text>
              <Text style={styles.rowArrow}>{showPasswordForm ? '∨' : '›'}</Text>
            </TouchableOpacity>

            {showPasswordForm && (
              <View style={styles.passwordForm}>
                {passwordError && (
                  <Text style={styles.passwordError}>{passwordError}</Text>
                )}
                <TextInput
                  style={styles.inlineInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password (min 8 chars)"
                  placeholderTextColor={Colors.textSecondary}
                  secureTextEntry
                  autoFocus
                />
                <TextInput
                  style={[styles.inlineInput, { marginTop: 8 }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.textSecondary}
                  secureTextEntry
                />
                <View style={styles.inlineActions}>
                  <TouchableOpacity
                    style={[styles.inlineSaveBtn, passwordLoading && { opacity: 0.6 }]}
                    onPress={handleChangePassword}
                    disabled={passwordLoading}
                    activeOpacity={0.8}
                  >
                    {passwordLoading
                      ? <ActivityIndicator color={Colors.bg} size="small" />
                      : <Text style={styles.inlineSaveBtnText}>Update Password</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inlineCancelBtn} onPress={() => setShowPasswordForm(false)} activeOpacity={0.8}>
                    <Text style={styles.inlineCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.rowDivider} />
            <View style={styles.groupRow}>
              <Text style={styles.groupRowText}>🔔  Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
                thumbColor={notificationsEnabled ? Colors.primary : Colors.textSecondary}
              />
            </View>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.groupRow} onPress={handleSignOut} activeOpacity={0.8}>
              <Text style={[styles.groupRowText, { color: Colors.wrong }]}>🚪  Sign Out</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backText: { color: Colors.primary, fontSize: 14, fontWeight: '600', width: 60 },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, paddingBottom: 48, gap: 12 },

  // Identity
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.bg, fontSize: 20, fontWeight: '700' },
  identityInfo: { flex: 1 },
  displayName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emailText: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  planPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planPillPremium: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
  planPillText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  planPillTextPremium: { color: Colors.primary },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statNum: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel: { color: Colors.textSecondary, fontSize: 11 },

  // XP
  xpCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  levelText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  xpText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  xpBarTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  xpBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  xpHint: { color: Colors.textSecondary, fontSize: 11 },

  // Goals
  goalsCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  cardSectionLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  goalLeft: { flex: 1 },
  goalRowLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
  goalRowValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  goalActions: { flexDirection: 'row', gap: 12 },
  editLink: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  clearLink: { color: Colors.wrong, fontSize: 13, fontWeight: '600' },
  goalDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },

  // Inline form (shared by target score, SAT date, password)
  inlineForm: { marginTop: 10, gap: 8 },
  inlineInput: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  inlineActions: { flexDirection: 'row', gap: 8 },
  inlineSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  inlineSaveBtnText: { color: Colors.bg, fontSize: 13, fontWeight: '700' },
  inlineCancelBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inlineCancelBtnText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },

  // Insights pills
  insightsPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  insightPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  insightPillText: { fontSize: 12, fontWeight: '600' },

  // Group sections
  groupLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 4,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  groupRowText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
  rowArrow: { color: Colors.textSecondary, fontSize: 18, fontWeight: '300' },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 16 },

  // Password form
  passwordForm: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 0,
  },
  passwordError: {
    color: Colors.wrong,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
  },
})
