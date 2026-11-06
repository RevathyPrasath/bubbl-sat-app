import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../lib/api'
import { Colors } from '../../constants/Colors'
import { getActiveSession, ActiveSession } from '../../lib/active-session-store'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestWebNotificationPermission,
  hasAskedPermission,
  markPermissionAsked,
  checkAndShowReminder,
} from '../../lib/notifications'

interface SubscriptionData {
  plan: 'free' | 'premium'
  papersUsedThisWeek: number
  papersAllowedPerWeek: number
}

interface GapData {
  estimatedScoreMin: number
  estimatedScoreMax: number
  mathPercent: number
  englishPercent: number
  recommendation?: {
    subject: string
    domain: string
    reason: string
  }
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [gap, setGap] = useState<GapData | null>(null)
  const [streak, setStreak] = useState(0)
  const [loadingData, setLoadingData] = useState(true)
  const [resumeSession, setResumeSession] = useState<ActiveSession | null>(null)
  const [showNotifBanner, setShowNotifBanner] = useState(false)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'

  useFocusEffect(
    useCallback(() => {
      setResumeSession(getActiveSession())
    }, [])
  )

  useEffect(() => {
    checkAndShowReminder()
    if (isNotificationSupported() && getNotificationPermission() === 'default') {
      hasAskedPermission().then(asked => {
        if (!asked) setShowNotifBanner(true)
      })
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [subData, gapData, progressData] = await Promise.all([
          apiFetch('/api/subscription').catch(() => null) as Promise<SubscriptionData | null>,
          apiFetch('/api/gap-analysis').catch(() => null) as Promise<GapData | null>,
          apiFetch('/api/progress-history').catch(() => null) as Promise<{ streak: number } | null>,
        ])
        if (subData) setSubscription(subData)
        if (gapData) setGap(gapData)
        if (progressData) setStreak(progressData.streak ?? 0)
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [])

  const sessionsLeft = subscription
    ? Math.max(0, subscription.papersAllowedPerWeek - subscription.papersUsedThisWeek)
    : null

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.replace('/(app)/home')} activeOpacity={0.8}>
            <Text style={styles.appName}>bubbl</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/(app)/profile')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Text style={styles.avatarBtnText}>{firstName[0]?.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Guest banner */}
        {user?.is_anonymous && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.guestBannerText}>
              You're in guest mode — create a free account to save your progress →
            </Text>
          </TouchableOpacity>
        )}

        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.greetingName}>{firstName} 👋</Text>
        </View>

        {/* Hero stats card */}
        <View style={styles.heroCard}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>
              {gap ? `${gap.estimatedScoreMin}` : '—'}
            </Text>
            <Text style={styles.heroStatSub}>Est. Score</Text>
          </View>
          <View style={styles.heroDiv} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatNum, { color: '#FF6B00' }]}>
              {streak > 0 ? `🔥 ${streak}` : '—'}
            </Text>
            <Text style={styles.heroStatSub}>Day Streak</Text>
          </View>
          <View style={styles.heroDiv} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>
              {subscription
                ? `${subscription.papersUsedThisWeek}/${subscription.papersAllowedPerWeek === 999 ? '∞' : subscription.papersAllowedPerWeek}`
                : '—'}
            </Text>
            <Text style={styles.heroStatSub}>Sessions</Text>
          </View>
          {loadingData && (
            <ActivityIndicator color={Colors.primary} style={styles.heroLoader} size="small" />
          )}
        </View>

        {/* Resume banner */}
        {resumeSession && (
          <TouchableOpacity
            style={styles.resumeBanner}
            onPress={() =>
              router.push({
                pathname: '/(app)/question',
                params: {
                  paperId: resumeSession.paperId,
                  resumeIndex: resumeSession.currentIndex.toString(),
                },
              })
            }
            activeOpacity={0.85}
          >
            <View style={styles.resumePulse} />
            <View style={styles.resumeLeft}>
              <Text style={styles.resumeTitle}>Session in progress</Text>
              <Text style={styles.resumeSub}>
                Q{resumeSession.currentIndex + 1} of {resumeSession.totalQuestions} · tap to continue
              </Text>
            </View>
            <Text style={styles.resumeArrow}>▶</Text>
          </TouchableOpacity>
        )}

        {/* Notification banner */}
        {showNotifBanner && (
          <View style={styles.notifBanner}>
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifBody}>
              <Text style={styles.notifTitle}>Stay consistent</Text>
              <Text style={styles.notifText}>Enable daily reminders to protect your streak.</Text>
            </View>
            <View style={styles.notifBtns}>
              <TouchableOpacity
                onPress={async () => {
                  await markPermissionAsked()
                  await requestWebNotificationPermission()
                  setShowNotifBanner(false)
                }}
                style={styles.notifYesBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Enable daily reminders"
              >
                <Text style={styles.notifYes}>Enable</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => { await markPermissionAsked(); setShowNotifBanner(false) }}
                activeOpacity={0.8}
                style={styles.notifNoBtn}
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification prompt"
              >
                <Text style={styles.notifNo}>Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's Focus */}
        {gap?.recommendation && (
          <>
            <Text style={styles.sectionLabel}>TODAY'S FOCUS</Text>
            <TouchableOpacity
              style={styles.focusCard}
              onPress={() => router.push('/(app)/practice')}
              activeOpacity={0.85}
            >
              <View style={styles.focusLeft}>
                <View style={styles.focusTag}>
                  <Text style={styles.focusTagText}>{gap.recommendation.subject}</Text>
                </View>
                <Text style={styles.focusDomain}>{gap.recommendation.domain}</Text>
                <Text style={styles.focusReason}>"{gap.recommendation.reason}"</Text>
              </View>
              <View style={styles.focusArrowBox}>
                <Text style={styles.focusArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Practice */}
        <Text style={styles.sectionLabel}>PRACTICE</Text>
        <View style={styles.practiceRow}>
          <TouchableOpacity
            style={[styles.practiceCard, styles.practiceCardMath]}
            onPress={() => router.push('/(app)/practice')}
            activeOpacity={0.85}
          >
            <Text style={styles.practiceEmoji}>📐</Text>
            <Text style={styles.practiceTitle}>Math</Text>
            {sessionsLeft !== null && (
              <View style={styles.sessionPill}>
                <Text style={styles.sessionPillText}>{sessionsLeft} left</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.practiceCard, styles.practiceCardEnglish]}
            onPress={() => router.push('/(app)/practice')}
            activeOpacity={0.85}
          >
            <Text style={styles.practiceEmoji}>📖</Text>
            <Text style={styles.practiceTitle}>English</Text>
            {sessionsLeft !== null && (
              <View style={styles.sessionPill}>
                <Text style={styles.sessionPillText}>{sessionsLeft} left</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Progress */}
        {gap && (
          <>
            <Text style={styles.sectionLabel}>YOUR PROGRESS</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <View style={styles.progressLabelRow}>
                  <View style={[styles.progressDot, { backgroundColor: '#7B61FF' }]} />
                  <Text style={styles.progressLabel}>Math</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${gap.mathPercent}%`, backgroundColor: '#7B61FF' }]} />
                </View>
                <Text style={styles.progressPct}>{gap.mathPercent}%</Text>
              </View>
              <View style={styles.progressRow}>
                <View style={styles.progressLabelRow}>
                  <View style={[styles.progressDot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.progressLabel}>English</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${gap.englishPercent}%`, backgroundColor: Colors.primary }]} />
                </View>
                <Text style={styles.progressPct}>{gap.englishPercent}%</Text>
              </View>
            </View>
          </>
        )}

        {/* Tools */}
        <Text style={styles.sectionLabel}>TOOLS</Text>
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => router.push('/(app)/study-plan')}
            activeOpacity={0.85}
          >
            <Text style={styles.toolEmoji}>📅</Text>
            <Text style={styles.toolTitle}>Study Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => router.push('/(app)/notebook')}
            activeOpacity={0.85}
          >
            <Text style={styles.toolEmoji}>📓</Text>
            <Text style={styles.toolTitle}>Wrong Answers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => router.push('/(app)/achievements')}
            activeOpacity={0.85}
          >
            <Text style={styles.toolEmoji}>🏆</Text>
            <Text style={styles.toolTitle}>Achievements</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  guestBanner: {
    backgroundColor: Colors.primary + '18',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  guestBannerText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: { fontSize: 24, color: Colors.primary, fontWeight: '800', letterSpacing: -0.5 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '30',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  // Greeting
  greetingRow: { marginBottom: 20 },
  greeting: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  greetingName: { fontSize: 26, color: Colors.textPrimary, fontWeight: '800', marginTop: 2 },

  // Hero stats
  heroCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatNum: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  heroStatSub: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  heroDiv: { width: 1, height: 36, backgroundColor: Colors.border },
  heroLoader: { position: 'absolute', right: 12, top: 12 },

  // Resume
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 10,
  },
  resumePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  resumeLeft: { flex: 1 },
  resumeTitle: { color: Colors.primary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  resumeSub: { color: Colors.primary, fontSize: 12, opacity: 0.75 },
  resumeArrow: { color: Colors.primary, fontSize: 18 },

  // Notification
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  notifIcon: { fontSize: 22 },
  notifBody: { flex: 1 },
  notifTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  notifText: { color: Colors.textSecondary, fontSize: 12 },
  notifBtns: { gap: 10 },
  notifYesBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  notifYes: { color: Colors.bg, fontSize: 13, fontWeight: '700' },
  notifNoBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  notifNo: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },

  // Section labels
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },

  // Focus card
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  focusLeft: { flex: 1, gap: 4 },
  focusTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  focusTagText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  focusDomain: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  focusReason: { color: Colors.textSecondary, fontSize: 12, fontStyle: 'italic' },
  focusArrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusArrow: { color: Colors.primary, fontSize: 16, fontWeight: '700' },

  // Practice cards
  practiceRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  practiceCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  practiceCardMath: {
    backgroundColor: '#7B61FF15',
    borderColor: '#7B61FF40',
  },
  practiceCardEnglish: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary + '40',
  },
  practiceEmoji: { fontSize: 32 },
  practiceTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  sessionPill: {
    backgroundColor: '#FFFFFF10',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sessionPillText: { color: Colors.textSecondary, fontSize: 11 },

  // Progress
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 76 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  progressLabel: { color: Colors.textSecondary, fontSize: 13 },
  progressTrack: { flex: 1, height: 7, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPct: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },

  // Tools
  toolsRow: { flexDirection: 'row', gap: 10 },
  toolCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  toolEmoji: { fontSize: 22 },
  toolTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
})
