import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useState, useEffect } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiFetch } from '../../lib/api'
import { Colors } from '../../constants/Colors'
import { saveActiveSession } from '../../lib/active-session-store'
import { recordPractice } from '../../lib/notifications'

type Mode = 'math' | 'english' | 'full'

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'PSDA', 'Geometry']
const ENGLISH_DOMAINS = ['Craft & Structure', 'Information & Ideas', 'SEC', 'Expression of Ideas']

interface PaperResponse {
  paperId: string
  questions: Question[]
}

interface Question {
  id: string
  domain: string
  skill: string
  subject: string
  stem: string
  choices?: Array<{ key: string; text: string }>
  type: 'mcq' | 'grid-in'
  passage?: string
  diagram_url?: string | null
  paperId?: string
}

export default function PracticeScreen() {
  const [mode, setMode] = useState<Mode>('math')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const domains = mode === 'math' ? MATH_DOMAINS : ENGLISH_DOMAINS
  const isFull = mode === 'full'

  const sessionInfo = isFull
    ? '44 questions · ~60 min · Math + English'
    : mode === 'math'
    ? '22 questions · ~33 min'
    : '22 questions · ~28 min'

  // Load skills when a domain is selected
  useEffect(() => {
    if (!selectedDomain || isFull) {
      setSkills([])
      setSelectedSkill(null)
      return
    }
    setLoadingSkills(true)
    setSelectedSkill(null)
    apiFetch(`/api/skills?subject=${mode}&domain=${encodeURIComponent(selectedDomain)}`)
      .then((data: any) => setSkills(data.skills ?? []))
      .catch(() => setSkills([]))
      .finally(() => setLoadingSkills(false))
  }, [selectedDomain, mode])

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      if (isFull) {
        const [mathData, engData] = await Promise.all([
          apiFetch('/api/paper', {
            method: 'POST',
            body: JSON.stringify({ subject: 'math', questionCount: 22 }),
          }) as Promise<PaperResponse>,
          apiFetch('/api/paper', {
            method: 'POST',
            body: JSON.stringify({ subject: 'english', questionCount: 22 }),
          }) as Promise<PaperResponse>,
        ])

        const mathQs = mathData.questions.map(q => ({ ...q, paperId: mathData.paperId }))
        const engQs = engData.questions.map(q => ({ ...q, paperId: engData.paperId }))

        const combined: Question[] = []
        const maxLen = Math.max(mathQs.length, engQs.length)
        for (let i = 0; i < maxLen; i++) {
          if (i < mathQs.length) combined.push(mathQs[i])
          if (i < engQs.length) combined.push(engQs[i])
        }

        const questionsJson = JSON.stringify(combined)
        saveActiveSession({ paperId: mathData.paperId, questionsJson, currentIndex: 0, totalQuestions: combined.length })
        await recordPractice()
        router.push({ pathname: '/(app)/question', params: { paperId: mathData.paperId } })
      } else {
        const body: Record<string, unknown> = { subject: mode }
        if (selectedDomain) body.domain = selectedDomain
        if (selectedSkill) body.skill = selectedSkill

        const data = await apiFetch('/api/paper', {
          method: 'POST',
          body: JSON.stringify(body),
        }) as PaperResponse

        const questionsJson = JSON.stringify(data.questions)
        saveActiveSession({ paperId: data.paperId, questionsJson, currentIndex: 0, totalQuestions: data.questions.length })
        await recordPractice()
        router.push({ pathname: '/(app)/question', params: { paperId: data.paperId } })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start session.'
      if (message.toLowerCase().includes('limit') || message.toLowerCase().includes('upgrade') || message.includes('403')) {
        router.push('/(app)/paywall')
        return
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(app)/home')} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Choose Your Focus</Text>

        {/* Mode toggle */}
        <Text style={styles.sectionLabel}>Mode</Text>
        <View style={styles.toggleRow}>
          {(['math', 'english', 'full'] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.togglePill, mode === m && styles.togglePillActive]}
              onPress={() => { setMode(m); setSelectedDomain(null); setSelectedSkill(null) }}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === m }}
              accessibilityLabel={m === 'math' ? 'Math mode' : m === 'english' ? 'English mode' : 'Full test mode'}
            >
              <Text style={[styles.togglePillText, mode === m && styles.togglePillTextActive]}>
                {m === 'math' ? 'Math' : m === 'english' ? 'English' : 'Full Test'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Full test info card */}
        {isFull ? (
          <View style={styles.fullTestCard}>
            <Text style={styles.fullTestTitle}>Full Practice Test</Text>
            <Text style={styles.fullTestDesc}>
              44 questions covering all Math and English domains — interleaved to simulate real SAT conditions. Timer runs for ~60 minutes.
            </Text>
            <View style={styles.fullTestStats}>
              <View style={styles.fullTestStat}>
                <Text style={styles.fullTestStatNum}>22</Text>
                <Text style={styles.fullTestStatLabel}>Math</Text>
              </View>
              <View style={styles.fullTestStatDivider} />
              <View style={styles.fullTestStat}>
                <Text style={styles.fullTestStatNum}>22</Text>
                <Text style={styles.fullTestStatLabel}>English</Text>
              </View>
              <View style={styles.fullTestStatDivider} />
              <View style={styles.fullTestStat}>
                <Text style={styles.fullTestStatNum}>~60</Text>
                <Text style={styles.fullTestStatLabel}>Minutes</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Domain picker */}
            <Text style={styles.sectionLabel}>Domain (optional)</Text>
            <TouchableOpacity
              style={[styles.domainCard, selectedDomain === null && styles.domainCardActive]}
              onPress={() => { setSelectedDomain(null); setSelectedSkill(null) }}
              activeOpacity={0.8}
            >
              <Text style={[styles.domainCardText, selectedDomain === null && styles.domainCardTextActive]}>
                Auto — close my gaps
              </Text>
            </TouchableOpacity>
            <View style={styles.domainGrid}>
              {domains.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.domainChip, selectedDomain === d && styles.domainChipActive]}
                  onPress={() => setSelectedDomain(d === selectedDomain ? null : d)}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedDomain === d }}
                  accessibilityLabel={d}
                >
                  <Text style={[styles.domainChipText, selectedDomain === d && styles.domainChipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Skill picker — shown when a domain is selected */}
            {selectedDomain && (
              <>
                <Text style={styles.sectionLabel}>Skill (optional)</Text>
                {loadingSkills ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginBottom: 16 }} />
                ) : skills.length > 0 ? (
                  <View style={styles.domainGrid}>
                    {skills.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.skillChip, selectedSkill === s && styles.skillChipActive]}
                        onPress={() => setSelectedSkill(s === selectedSkill ? null : s)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.skillChipText, selectedSkill === s && styles.skillChipTextActive]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.sessionInfo}>{sessionInfo}</Text>

        <TouchableOpacity
          style={[styles.startButton, loading && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isFull ? 'Start full test' : 'Start practice session'}
          accessibilityState={{ disabled: loading }}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bg} />
          ) : (
            <Text style={styles.startButtonText}>
              {isFull ? 'Start Full Test' : 'Start Session'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },
  backButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '600', width: 60 },
  container: { padding: 20, paddingBottom: 40 },

  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 24 },
  sectionLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 4 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  togglePill: {
    flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: 'center',
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  togglePillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  togglePillText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  togglePillTextActive: { color: Colors.bg },

  fullTestCard: {
    backgroundColor: Colors.primary + '12', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: Colors.primary + '44', marginBottom: 24,
  },
  fullTestTitle: { color: Colors.primary, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  fullTestDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  fullTestStats: { flexDirection: 'row', justifyContent: 'space-around' },
  fullTestStat: { alignItems: 'center', gap: 4 },
  fullTestStatNum: { color: Colors.primary, fontSize: 22, fontWeight: '700' },
  fullTestStatLabel: { color: Colors.textSecondary, fontSize: 12 },
  fullTestStatDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },

  domainCard: {
    backgroundColor: Colors.card, borderRadius: 10, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  domainCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  domainCardText: { color: Colors.textSecondary, fontSize: 15 },
  domainCardTextActive: { color: Colors.primary, fontWeight: '600' },
  domainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  domainChip: {
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
  },
  domainChipActive: { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  domainChipText: { color: Colors.textSecondary, fontSize: 14 },
  domainChipTextActive: { color: Colors.primary, fontWeight: '600' },

  skillChip: {
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 16,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border,
  },
  skillChipActive: { backgroundColor: '#7B61FF22', borderColor: '#7B61FF' },
  skillChipText: { color: Colors.textSecondary, fontSize: 13 },
  skillChipTextActive: { color: '#7B61FF', fontWeight: '600' },

  errorText: {
    color: Colors.wrong, fontSize: 14, backgroundColor: '#2A0A0A',
    padding: 12, borderRadius: 8, marginBottom: 12,
  },
  sessionInfo: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  startButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  startButtonDisabled: { opacity: 0.6 },
  startButtonText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
})
