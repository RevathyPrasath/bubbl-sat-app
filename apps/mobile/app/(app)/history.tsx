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

interface Session {
  id: string
  subject: string
  totalQuestions: number
  correctCount: number
  scorePct: number
  timeTakenSecs: number | null
  abandoned: boolean
  createdAt: string
  topDomain: string | null
}

function formatTime(secs: number | null): string {
  if (!secs) return ''
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function scoreColor(pct: number): string {
  if (pct >= 70) return Colors.correct
  if (pct >= 50) return '#FFC107'
  return Colors.wrong
}

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/session-history')
      .then((data: any) => setSessions(data.sessions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalSessions = sessions.length
  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((s, a) => s + a.scorePct, 0) / sessions.length)
    : 0
  const bestScore = sessions.length > 0
    ? Math.max(...sessions.map(s => s.scorePct))
    : 0

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Summary stats */}
          {sessions.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{totalSessions}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: Colors.primary }]}>{avgScore}%</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { color: Colors.correct }]}>{bestScore}%</Text>
                <Text style={styles.statLabel}>Best Score</Text>
              </View>
            </View>
          )}

          {/* Session list */}
          {sessions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyDesc}>Complete a practice session to see your history here.</Text>
              <TouchableOpacity
                style={styles.practiceBtn}
                onPress={() => router.push('/(app)/practice')}
                activeOpacity={0.8}
              >
                <Text style={styles.practiceBtnText}>Start Practice</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sessions.map((s, i) => {
              const color = scoreColor(s.scorePct)
              return (
                <View key={s.id} style={styles.sessionCard}>
                  <View style={[styles.scoreBar, { backgroundColor: color }]} />
                  <View style={styles.sessionBody}>
                    <View style={styles.sessionTop}>
                      <View style={styles.sessionLeft}>
                        <Text style={styles.sessionSubject}>
                          {s.subject.charAt(0).toUpperCase() + s.subject.slice(1)}
                          {s.abandoned ? '  ·  Abandoned' : ''}
                        </Text>
                        <Text style={styles.sessionDate}>{formatDate(s.createdAt)}</Text>
                      </View>
                      <Text style={[styles.sessionScore, { color }]}>{s.scorePct}%</Text>
                    </View>
                    <View style={styles.sessionMeta}>
                      <Text style={styles.metaItem}>{s.correctCount}/{s.totalQuestions} correct</Text>
                      {s.timeTakenSecs && (
                        <Text style={styles.metaItem}>⏱ {formatTime(s.timeTakenSecs)}</Text>
                      )}
                      {s.topDomain && (
                        <Text style={styles.metaItem}>💪 {s.topDomain}</Text>
                      )}
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${s.scorePct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>
              )
            })
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

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNum: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: Colors.textSecondary, fontSize: 11 },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyDesc: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  practiceBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  practiceBtnText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },

  sessionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  scoreBar: { width: 4 },
  sessionBody: { flex: 1, padding: 14 },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  sessionLeft: { flex: 1 },
  sessionSubject: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  sessionDate: { color: Colors.textSecondary, fontSize: 12 },
  sessionScore: { fontSize: 20, fontWeight: '700' },
  sessionMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { color: Colors.textSecondary, fontSize: 12 },
  barTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
})
