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

interface NotebookEntry {
  id: string
  domain: string
  skill: string
  subject: string
  stem: string
  correctAnswer: string
  explanation: string
  type: 'mcq' | 'grid-in'
  choices: { key: string; text: string }[]
  answeredAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function NotebookScreen() {
  const [grouped, setGrouped] = useState<Record<string, NotebookEntry[]>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/notebook')
      .then((data: any) => setGrouped(data.grouped ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const domains = Object.keys(grouped)
  const totalWrong = Object.values(grouped).reduce((s, arr) => s + arr.length, 0)

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wrong Answers</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : totalWrong === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No wrong answers!</Text>
          <Text style={styles.emptyDesc}>Complete a practice session to build your notebook.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.summary}>{totalWrong} question{totalWrong !== 1 ? 's' : ''} to review</Text>

          {domains.map(domain => (
            <View key={domain} style={styles.domainSection}>
              <TouchableOpacity
                style={styles.domainHeader}
                onPress={() => setExpanded(expanded === domain ? null : domain)}
                activeOpacity={0.8}
              >
                <View style={styles.domainHeaderLeft}>
                  <Text style={styles.domainName}>{domain}</Text>
                  <View style={styles.domainBadge}>
                    <Text style={styles.domainBadgeText}>{grouped[domain].length}</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>{expanded === domain ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expanded === domain && grouped[domain].map((entry, i) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryMeta}>
                    <Text style={styles.entrySkill}>{entry.skill}</Text>
                    <Text style={styles.entryTime}>{timeAgo(entry.answeredAt)}</Text>
                  </View>

                  <Text style={styles.entryStem} numberOfLines={3}>{entry.stem}</Text>

                  <View style={styles.answerRow}>
                    <View style={styles.correctChip}>
                      <Text style={styles.correctChipLabel}>Correct answer</Text>
                      <Text style={styles.correctChipValue}>{entry.correctAnswer}</Text>
                    </View>
                  </View>

                  {entry.explanation ? (
                    <View style={styles.explanationBox}>
                      <Text style={styles.explanationLabel}>How to solve</Text>
                      <Text style={styles.explanationText} numberOfLines={6}>
                        {entry.explanation}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  emptyDesc: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  container: { padding: 16, paddingBottom: 40 },
  summary: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  domainSection: { marginBottom: 12 },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  domainHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  domainName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  domainBadge: {
    backgroundColor: Colors.wrong + '30',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  domainBadgeText: { color: Colors.wrong, fontSize: 12, fontWeight: '700' },
  chevron: { color: Colors.textSecondary, fontSize: 12 },
  entryCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: Colors.border,
    borderLeftColor: Colors.wrong,
  },
  entryMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  entrySkill: { color: Colors.primary, fontSize: 11, fontWeight: '600' },
  entryTime: { color: Colors.textSecondary, fontSize: 11 },
  entryStem: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  answerRow: { marginBottom: 10 },
  correctChip: {
    backgroundColor: Colors.correct + '20',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.correct + '44',
  },
  correctChipLabel: { color: Colors.textSecondary, fontSize: 11, marginBottom: 2 },
  correctChipValue: { color: Colors.correct, fontSize: 15, fontWeight: '700' },
  explanationBox: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  explanationLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  explanationText: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
})
