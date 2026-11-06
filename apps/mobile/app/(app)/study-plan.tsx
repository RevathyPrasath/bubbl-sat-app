import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../constants/Colors'
import { getSatDate } from '../../lib/settings-store'
import { apiFetch } from '../../lib/api'

interface DomainGap {
  domain: string
  ability: number
  percentile: number
}

interface GapData {
  topGaps: DomainGap[]
  mathPercent: number
  englishPercent: number
}

interface WeekPlan {
  weekNum: number
  label: string
  focus: string[]
  dailyQuestions: number
  theme: string
}

function daysUntil(dateIso: string): number {
  const diff = new Date(dateIso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function buildWeeklyPlan(daysLeft: number, topGaps: DomainGap[], mathPct: number, engPct: number): WeekPlan[] {
  const weeks = Math.max(1, Math.ceil(daysLeft / 7))
  const plan: WeekPlan[] = []

  const weakMath = mathPct < engPct
  const mathFocus = weakMath ? 'Math (priority)' : 'Math'
  const engFocus = !weakMath ? 'English (priority)' : 'English'

  const gapDomains = topGaps.slice(0, 3).map((g) => g.domain)

  for (let w = 1; w <= Math.min(weeks, 8); w++) {
    const isLast = w === Math.min(weeks, 8)
    const isNearEnd = weeks <= 2

    let focus: string[]
    let theme: string
    let dailyQuestions: number

    if (isLast && weeks > 1) {
      focus = ['Full-length practice test', 'Review mistakes', 'Timed drills']
      theme = 'Final Review'
      dailyQuestions = 15
    } else if (isNearEnd) {
      focus = [...gapDomains.slice(0, 2), 'Timed practice']
      theme = 'Targeted Drill'
      dailyQuestions = 20
    } else if (w % 4 === 0) {
      focus = ['Mixed review', 'Full-length practice']
      theme = 'Assessment'
      dailyQuestions = 20
    } else if (w % 2 === 0) {
      focus = [engFocus, ...(gapDomains.slice(0, 1))]
      theme = 'English & Gaps'
      dailyQuestions = 15
    } else {
      focus = [mathFocus, ...(gapDomains.slice(0, 1))]
      theme = 'Math & Gaps'
      dailyQuestions = 15
    }

    const startDay = (w - 1) * 7 + 1
    const endDay = Math.min(w * 7, daysLeft)
    plan.push({
      weekNum: w,
      label: `Week ${w} (Days ${startDay}–${endDay})`,
      focus,
      dailyQuestions,
      theme,
    })
  }

  return plan
}

const THEME_COLORS: Record<string, string> = {
  'Math & Gaps': Colors.primary,
  'English & Gaps': '#7B61FF',
  'Assessment': '#FFC107',
  'Targeted Drill': '#FF6B00',
  'Final Review': Colors.correct,
}

export default function StudyPlanScreen() {
  const [satDate, setSatDate] = useState<string | null>(null)
  const [gapData, setGapData] = useState<GapData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSatDate(),
      apiFetch('/api/gap-analysis').catch(() => null),
    ]).then(([date, gap]) => {
      if (date) setSatDate(date)
      if (gap) setGapData(gap as GapData)
    }).finally(() => setLoading(false))
  }, [])

  const daysLeft = satDate ? daysUntil(satDate) : null
  const plan = daysLeft !== null && daysLeft > 0
    ? buildWeeklyPlan(
        daysLeft,
        gapData?.topGaps ?? [],
        gapData?.mathPercent ?? 50,
        gapData?.englishPercent ?? 50,
      )
    : null

  const dailyTarget = plan ? plan[0].dailyQuestions : 10
  const weeksLeft = daysLeft !== null ? Math.ceil(daysLeft / 7) : null

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Plan</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* No date set */}
          {!satDate && (
            <View style={styles.noDateCard}>
              <Text style={styles.noDateIcon}>📅</Text>
              <Text style={styles.noDateTitle}>No Test Date Set</Text>
              <Text style={styles.noDateBody}>
                Set your SAT test date on your profile to unlock a personalized study plan.
              </Text>
              <TouchableOpacity
                style={styles.setDateBtn}
                onPress={() => router.push('/(app)/profile')}
                activeOpacity={0.8}
              >
                <Text style={styles.setDateBtnText}>Go to Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Date set, test passed */}
          {satDate && daysLeft === 0 && (
            <View style={styles.todayCard}>
              <Text style={styles.todayIcon}>🎓</Text>
              <Text style={styles.todayTitle}>Test Day!</Text>
              <Text style={styles.todayBody}>Good luck today. You've got this.</Text>
            </View>
          )}

          {/* Active plan */}
          {satDate && daysLeft !== null && daysLeft > 0 && (
            <>
              {/* Countdown hero */}
              <View style={styles.heroCard}>
                <Text style={styles.heroLabel}>Your SAT is in</Text>
                <Text style={styles.heroDays}>{daysLeft}</Text>
                <Text style={styles.heroDaysLabel}>days</Text>
                <Text style={styles.heroDate}>
                  {new Date(satDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>

              {/* Daily target */}
              <View style={styles.targetRow}>
                <View style={styles.targetCard}>
                  <Text style={styles.targetNum}>{dailyTarget}</Text>
                  <Text style={styles.targetLabel}>questions / day</Text>
                </View>
                <View style={styles.targetCard}>
                  <Text style={styles.targetNum}>{weeksLeft}</Text>
                  <Text style={styles.targetLabel}>weeks left</Text>
                </View>
                <View style={styles.targetCard}>
                  <Text style={styles.targetNum}>{daysLeft * dailyTarget}</Text>
                  <Text style={styles.targetLabel}>questions total</Text>
                </View>
              </View>

              {/* Weakness callout */}
              {gapData && gapData.topGaps.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Priority Areas</Text>
                  {gapData.topGaps.slice(0, 3).map((gap) => (
                    <View key={gap.domain} style={styles.gapRow}>
                      <View style={styles.gapDot} />
                      <Text style={styles.gapDomain}>{gap.domain}</Text>
                      <View style={styles.gapBarTrack}>
                        <View style={[styles.gapBarFill, { width: `${Math.max(5, gap.percentile)}%` }]} />
                      </View>
                      <Text style={styles.gapPct}>{gap.percentile}%</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Weekly plan */}
              {plan && plan.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
                  {plan.map((week) => {
                    const color = THEME_COLORS[week.theme] ?? Colors.primary
                    return (
                      <View key={week.weekNum} style={[styles.weekCard, { borderLeftColor: color }]}>
                        <View style={styles.weekHeader}>
                          <Text style={[styles.weekTheme, { color }]}>{week.theme}</Text>
                          <Text style={styles.weekLabel}>{week.label}</Text>
                        </View>
                        <View style={styles.weekFocus}>
                          {week.focus.map((f, i) => (
                            <View key={i} style={[styles.focusPill, { borderColor: color + '44' }]}>
                              <Text style={[styles.focusPillText, { color }]}>{f}</Text>
                            </View>
                          ))}
                        </View>
                        <Text style={styles.weekTarget}>{week.dailyQuestions} questions / day</Text>
                      </View>
                    )
                  })}
                </View>
              )}

              <TouchableOpacity
                style={styles.practiceBtn}
                onPress={() => router.push('/(app)/practice')}
                activeOpacity={0.8}
              >
                <Text style={styles.practiceBtnText}>Start Today's Practice →</Text>
              </TouchableOpacity>
            </>
          )}
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
  container: { padding: 20, paddingBottom: 48 },

  noDateCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noDateIcon: { fontSize: 40, marginBottom: 12 },
  noDateTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  noDateBody: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  setDateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  setDateBtnText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },

  todayCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.correct,
  },
  todayIcon: { fontSize: 48, marginBottom: 12 },
  todayTitle: { color: Colors.correct, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  todayBody: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center' },

  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  heroLabel: { color: Colors.textSecondary, fontSize: 14, marginBottom: 6 },
  heroDays: { color: Colors.primary, fontSize: 64, fontWeight: '700', lineHeight: 70 },
  heroDaysLabel: { color: Colors.primary, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  heroDate: { color: Colors.textSecondary, fontSize: 13 },

  targetRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  targetCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  targetNum: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  targetLabel: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center' },

  section: { marginBottom: 24 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 14 },

  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  gapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.wrong,
    flexShrink: 0,
  },
  gapDomain: { color: Colors.textSecondary, fontSize: 12, width: 90, flexShrink: 0 },
  gapBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gapBarFill: { height: '100%', backgroundColor: Colors.wrong, borderRadius: 3 },
  gapPct: { color: Colors.textSecondary, fontSize: 12, width: 32, textAlign: 'right' },

  weekCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  weekTheme: { fontSize: 13, fontWeight: '700' },
  weekLabel: { color: Colors.textSecondary, fontSize: 11 },
  weekFocus: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  focusPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  focusPillText: { fontSize: 11, fontWeight: '600' },
  weekTarget: { color: Colors.textSecondary, fontSize: 12 },

  practiceBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  practiceBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
})
