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
import { apiFetch } from '../../lib/api'
import { Colors } from '../../constants/Colors'

interface DomainAbility {
  domain: string
  ability: number   // 200–800
  subject: 'math' | 'english'
}

interface GapData {
  estimatedScoreMin: number
  estimatedScoreMax: number
  domains: DomainAbility[]
  topGaps: Array<{ domain: string; ability: number; reason: string }>
  encouragement: string
}

interface DayProgress {
  date: string
  total: number
  correct: number
  pct: number
}

interface ScorePoint {
  week: string
  label: string
  avgPct: number
  estimatedScore: number
  smoothedScore: number
}

function abilityToPercent(ability: number): number {
  return Math.round(((ability - 200) / 600) * 100)
}

function abilityColor(ability: number): string {
  if (ability >= 600) return '#64FFDA'
  if (ability >= 400) return '#00BFA5'
  return '#006D5B'
}

function accuracyColor(pct: number): string {
  if (pct >= 70) return '#64FFDA'
  if (pct >= 50) return '#00BFA5'
  return '#006D5B'
}

function scoreColor(score: number): string {
  if (score >= 1200) return '#64FFDA'
  if (score >= 900) return '#00BFA5'
  return '#006D5B'
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function GapScreen() {
  const [gap, setGap] = useState<GapData | null>(null)
  const [history, setHistory] = useState<DayProgress[]>([])
  const [scoreHistory, setScoreHistory] = useState<ScorePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/gap-analysis').catch(() => null),
      apiFetch('/api/progress-history').catch(() => null),
      apiFetch('/api/score-history').catch(() => null),
    ]).then(([gapData, histData, scoreData]) => {
      if (gapData) setGap(gapData as GapData)
      if (histData) setHistory((histData as any).days ?? [])
      if (scoreData) setScoreHistory((scoreData as any).points ?? [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(app)/home')} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>← Home</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Your Progress</Text>
        </View>

        {/* Estimated score */}
        <View style={styles.scoreSection}>
          <Text style={styles.scoreSectionLabel}>Estimated SAT Score</Text>
          <Text style={styles.scoreRange}>
            {gap ? `${gap.estimatedScoreMin} – ${gap.estimatedScoreMax}` : '—'}
          </Text>
        </View>

        {/* Score trajectory chart */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Accuracy</Text>
            <View style={styles.chartContainer}>
              {history.slice(-14).map((day) => {
                const barColor = accuracyColor(day.pct)
                return (
                  <View key={day.date} style={styles.chartBar}>
                    <Text style={[styles.chartPct, { color: barColor }]}>{day.pct}%</Text>
                    <View style={styles.chartBarTrack}>
                      <View style={[styles.chartBarFill, { height: `${Math.max(4, day.pct)}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={styles.chartDate}>{shortDate(day.date)}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* SAT Score history */}
        {scoreHistory.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimated Score Trend</Text>
            <View style={styles.scoreChartContainer}>
              {/* Y-axis labels */}
              <View style={styles.scoreYAxis}>
                {[1600, 1200, 800, 400].map(v => (
                  <Text key={v} style={styles.scoreYLabel}>{v}</Text>
                ))}
              </View>
              {/* Bars */}
              <View style={styles.scoreChartBars}>
                {scoreHistory.map((p) => {
                  const heightPct = Math.max(4, Math.round(((p.smoothedScore - 400) / 1200) * 100))
                  const barColor = scoreColor(p.smoothedScore)
                  return (
                    <View key={p.week} style={styles.scoreBar}>
                      <Text style={[styles.scoreBarNum, { color: barColor }]}>{p.smoothedScore}</Text>
                      <View style={styles.scoreBarTrack}>
                        <View style={[styles.scoreBarFill, { height: `${heightPct}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={styles.scoreBarLabel}>{p.label}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>
        )}

        {/* Domain list */}
        {gap && gap.domains.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Domain Breakdown</Text>
            {gap.domains.map((d) => {
              const pct = abilityToPercent(d.ability)
              const color = abilityColor(d.ability)
              return (
                <View key={d.domain} style={styles.domainRow}>
                  <Text style={styles.domainLabel}>{d.domain}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]}
                    />
                  </View>
                  <Text style={[styles.domainAbility, { color }]}>{d.ability}</Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Top gaps */}
        {gap && gap.topGaps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Gaps to Close</Text>
            {gap.topGaps.map((g, i) => (
              <View key={g.domain} style={styles.gapCard}>
                <View style={styles.gapCardHeader}>
                  <Text style={styles.gapRank}>{i + 1}.</Text>
                  <View style={styles.gapCardInfo}>
                    <Text style={styles.gapDomain}>{g.domain}</Text>
                    <Text style={styles.gapReason}>"{g.reason}"</Text>
                  </View>
                  <Text style={[styles.gapAbility, { color: abilityColor(g.ability) }]}>
                    {g.ability}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.practiceNowButton}
                  onPress={() => router.push('/(app)/practice')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.practiceNowText}>Practice Now →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Encouragement */}
        {gap?.encouragement ? (
          <View style={styles.encouragementCard}>
            <Text style={styles.encouragementText}>{gap.encouragement}</Text>
          </View>
        ) : null}

        {!gap && (
          <Text style={styles.noData}>
            Complete a practice session to see your gap analysis.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scoreChartContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 130,
  },
  scoreYAxis: {
    justifyContent: 'space-between',
    marginRight: 6,
    paddingVertical: 16,
  },
  scoreYLabel: { color: Colors.textSecondary, fontSize: 8 },
  scoreChartBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  scoreBar: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 2 },
  scoreBarNum: { fontSize: 7, fontWeight: '700' },
  scoreBarTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  scoreBarFill: { width: '100%', borderRadius: 2, minHeight: 4 },
  scoreBarLabel: { fontSize: 7, color: Colors.textSecondary },

  scoreSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingVertical: 20,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreSectionLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreRange: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    gap: 4,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 3,
  },
  chartPct: {
    fontSize: 8,
    fontWeight: '700',
  },
  chartBarTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 3,
    minHeight: 4,
  },
  chartDate: {
    fontSize: 8,
    color: Colors.textSecondary,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  domainLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    width: 110,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  domainAbility: {
    fontSize: 13,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  gapCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.wrong + '55',
  },
  gapCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  gapRank: {
    color: Colors.wrong,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 20,
  },
  gapCardInfo: {
    flex: 1,
  },
  gapDomain: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  gapReason: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  gapAbility: {
    fontSize: 15,
    fontWeight: '700',
  },
  practiceNowButton: {
    backgroundColor: Colors.wrong + '20',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.wrong + '44',
  },
  practiceNowText: {
    color: Colors.wrong,
    fontSize: 14,
    fontWeight: '700',
  },
  encouragementCard: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    marginBottom: 8,
  },
  encouragementText: {
    color: Colors.primary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  noData: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
})
