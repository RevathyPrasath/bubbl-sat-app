import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../constants/Colors'
import { getSessionResults, AnswerRecord } from '../../lib/session-store'

// Split explanation into steps. Tries newlines, then sentence boundaries.
function parseSteps(explanation: string): string[] {
  if (!explanation.trim()) return []

  // Newline-separated steps take priority
  const lines = explanation.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0)
  if (lines.length > 1) return lines

  // Split on ". " sentence boundaries and restore periods
  const parts = explanation.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 2)
  if (parts.length > 1) {
    return parts.map((s, i) => (i < parts.length - 1 ? s + '.' : s.endsWith('.') ? s : s + '.'))
  }

  return [explanation.trim()]
}

function scoreColor(correct: number, total: number): string {
  const pct = total > 0 ? correct / total : 0
  if (pct >= 0.7) return Colors.correct
  if (pct >= 0.5) return '#FFC107'
  return Colors.wrong
}

export default function ResultsScreen() {
  const answers = getSessionResults()

  const total = answers.length
  const correctCount = answers.filter((a) => a.correct).length
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const circleColor = scoreColor(correctCount, total)

  // Domain breakdown
  const domainMap: Record<string, { correct: number; total: number; oldAbility?: number; newAbility?: number }> = {}
  for (const a of answers) {
    const d = a.question.domain
    if (!domainMap[d]) domainMap[d] = { correct: 0, total: 0 }
    domainMap[d].total++
    if (a.correct) domainMap[d].correct++
    if (a.oldAbility !== undefined) domainMap[d].oldAbility = a.oldAbility
    if (a.newAbility !== undefined) domainMap[d].newAbility = a.newAbility
  }
  const domains = Object.entries(domainMap)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(app)/home')}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Session Complete!</Text>

        {/* Score circle */}
        <View style={[styles.scoreCircle, { borderColor: circleColor }]}>
          <Text style={[styles.scoreMain, { color: circleColor }]}>{correctCount}/{total}</Text>
          <Text style={[styles.scorePct, { color: circleColor }]}>{pct}%</Text>
        </View>

        {/* Domain breakdown */}
        {domains.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>By Domain</Text>
            {domains.map(([domain, stats]) => {
              const domainPct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
              const delta = stats.newAbility !== undefined && stats.oldAbility !== undefined
                ? stats.newAbility - stats.oldAbility
                : null
              return (
                <View key={domain} style={styles.domainRow}>
                  <View style={styles.domainLeft}>
                    <Text style={styles.domainName}>{domain}</Text>
                    {delta !== null && (
                      <Text style={[styles.abilityDelta, { color: delta >= 0 ? Colors.correct : Colors.wrong }]}>
                        {delta >= 0 ? `↑ +${delta}` : `↓ ${delta}`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.domainBarTrack}>
                    <View
                      style={[
                        styles.domainBarFill,
                        { width: `${domainPct}%`, backgroundColor: scoreColor(stats.correct, stats.total) },
                      ]}
                    />
                  </View>
                  <Text style={styles.domainPct}>{domainPct}%</Text>
                </View>
              )
            })}
          </>
        )}

        {/* Per-question review */}
        {answers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Review</Text>
            {answers.map((a: AnswerRecord, i: number) => (
              <View
                key={a.question.id + i}
                style={[styles.reviewCard, a.correct ? styles.reviewCorrect : styles.reviewWrong]}
              >
                {/* Header */}
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewNumber}>Q{i + 1}</Text>
                  {a.question.isReview && (
                    <Text style={styles.reviewRepeatBadge}>↩ Review</Text>
                  )}
                  <Text style={[styles.reviewBadge, { color: a.correct ? Colors.correct : Colors.wrong }]}>
                    {a.correct ? '✓ Correct' : '✗ Incorrect'}
                  </Text>
                  {a.timeTakenSecs != null && (
                    <Text style={styles.timeBadge}>
                      {a.timeTakenSecs < 60
                        ? `${a.timeTakenSecs}s`
                        : `${Math.floor(a.timeTakenSecs / 60)}m ${a.timeTakenSecs % 60}s`}
                    </Text>
                  )}
                </View>

                {/* Topic + difficulty */}
                <View style={styles.topicRow}>
                  <Text style={styles.topicLabel}>{a.question.domain}  ·  {a.question.skill}</Text>
                  {a.question.difficulty && (
                    <Text style={[styles.diffLabel, {
                      color: a.question.difficulty.toLowerCase() === 'easy' ? Colors.correct
                        : a.question.difficulty.toLowerCase() === 'hard' ? Colors.wrong
                        : '#FFC107'
                    }]}>
                      {a.question.difficulty}
                    </Text>
                  )}
                </View>

                {/* Diagram */}
                {a.question.diagram_url ? (
                  <View style={styles.reviewDiagramContainer}>
                    {Platform.OS === 'web' ? (() => {
                      const Img = 'img' as unknown as React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>>
                      return (
                        <Img
                          src={a.question.diagram_url!}
                          alt="Question diagram"
                          style={{ width: '100%', height: 160, objectFit: 'contain' } as React.CSSProperties}
                        />
                      )
                    })() : null}
                  </View>
                ) : null}

                {/* Full question stem */}
                <Text style={styles.reviewStem}>{a.question.stem}</Text>

                {/* Answer row — always show your answer + correct answer */}
                <View style={styles.answerRow}>
                  <View style={styles.answerChip}>
                    <Text style={styles.answerChipLabel}>Your answer</Text>
                    <Text style={[styles.answerChipValue, { color: a.correct ? Colors.correct : Colors.wrong }]}>
                      {a.userAnswer || '—'}
                    </Text>
                  </View>
                  <View style={styles.answerChip}>
                    <Text style={styles.answerChipLabel}>Correct answer</Text>
                    <Text style={[styles.answerChipValue, { color: Colors.correct }]}>
                      {a.correctAnswer || '—'}
                    </Text>
                  </View>
                </View>

                {/* Solution — always shown */}
                <View style={styles.solutionBox}>
                  <Text style={styles.solutionLabel}>
                    {a.correct ? '✓ Why this is correct' : '✗ How to solve it'}
                  </Text>
                  {a.explanation ? (
                    parseSteps(a.explanation).map((step, si) => (
                      <View key={si} style={styles.stepRow}>
                        {parseSteps(a.explanation).length > 1 && (
                          <View style={styles.stepBullet}>
                            <Text style={styles.stepBulletText}>{si + 1}</Text>
                          </View>
                        )}
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.stepText}>No explanation available for this question.</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {total === 0 && (
          <Text style={styles.noData}>No results to show.</Text>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(app)/gap')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>View Gap Analysis</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/(app)/practice')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Practice Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
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
    marginBottom: 24,
    textAlign: 'center',
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  scoreMain: {
    fontSize: 28,
    fontWeight: '700',
  },
  scorePct: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginTop: 8,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  domainLeft: {
    width: 100,
  },
  domainName: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  abilityDelta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  domainBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  domainBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  domainPct: {
    color: Colors.textSecondary,
    fontSize: 13,
    width: 36,
    textAlign: 'right',
  },
  reviewCard: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  reviewCorrect: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderLeftColor: Colors.correct,
  },
  reviewWrong: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderLeftColor: Colors.wrong,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reviewNumber: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  reviewBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewRepeatBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFC107',
    marginRight: 4,
  },
  timeBadge: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    flex: 1,
  },
  diffLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reviewDiagramContainer: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewStem: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  answerChip: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  answerChipLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 3,
  },
  answerChipValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  solutionBox: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  solutionLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  stepBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  stepBulletText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  noData: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  primaryButtonText: {
    color: Colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
})
