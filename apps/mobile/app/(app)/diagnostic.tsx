import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiFetch } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/Colors'

interface Choice {
  key: string
  text: string
}

interface DiagnosticQuestion {
  id: string
  domain: string
  stem: string
  choices: Choice[]
  passage?: string
}

interface SubmitResponse {
  correct: boolean
  correctAnswer: string
  explanation: string
}

const TOTAL = 10

export default function DiagnosticScreen() {
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<SubmitResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [paperId, setPaperId] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/paper', {
      method: 'POST',
      body: JSON.stringify({ diagnostic: true }),
    })
      .then((data: unknown) => {
        const d = data as { paperId: string; questions: DiagnosticQuestion[] }
        setPaperId(d.paperId)
        setQuestions(d.questions.slice(0, TOTAL))
      })
      .catch(() => Alert.alert('Error', 'Failed to load diagnostic.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit() {
    if (!selectedChoice || !paperId) return
    const question = questions[currentIndex]
    setSubmitting(true)
    try {
      const result = await apiFetch('/api/submit-answer', {
        method: 'POST',
        body: JSON.stringify({ paperId, questionId: question.id, answer: selectedChoice }),
      }) as SubmitResponse
      setFeedback(result)
    } catch {
      Alert.alert('Error', 'Failed to submit answer.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleNext() {
    setFeedback(null)
    setSelectedChoice(null)
    const nextIndex = currentIndex + 1
    if (nextIndex >= TOTAL) {
      // Mark diagnostic done
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ diagnostic_done: true })
          .eq('id', user.id)
      }
      router.replace('/(app)/home')
    } else {
      setCurrentIndex(nextIndex)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  const question = questions[currentIndex]
  if (!question) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Dot progress
  const dots = Array.from({ length: TOTAL }, (_, i) => i)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Text style={styles.title}>Let's see where you're at</Text>
          <TouchableOpacity
            onPress={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                await supabase.from('profiles').update({ diagnostic_done: true }).eq('id', user.id)
              }
              router.replace('/(app)/home')
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          10 quick questions to personalize your practice
        </Text>

        {/* Dot progress */}
        <View style={styles.dotsRow}>
          {dots.map((i) => (
            <View
              key={i}
              style={[styles.dot, i <= currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
          <Text style={styles.dotLabel}>{currentIndex + 1} of {TOTAL}</Text>
        </View>

        {/* Question card */}
        <View style={styles.questionCard}>
          <Text style={styles.domainTag}>{question.domain}</Text>
          {question.passage ? (
            <Text style={styles.passageText}>{question.passage}</Text>
          ) : null}
          <Text style={styles.stem}>{question.stem}</Text>
        </View>

        {/* Choices */}
        <View style={styles.choicesContainer}>
          {question.choices.map((choice) => (
            <TouchableOpacity
              key={choice.key}
              style={[
                styles.choiceButton,
                selectedChoice === choice.key && styles.choiceButtonSelected,
              ]}
              onPress={() => !feedback && setSelectedChoice(choice.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.choiceKey,
                selectedChoice === choice.key && styles.choiceKeySelected,
              ]}>
                {choice.key}.
              </Text>
              <Text style={[
                styles.choiceText,
                selectedChoice === choice.key && styles.choiceTextSelected,
              ]}>
                {choice.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {feedback ? (
          <View style={[styles.feedbackCard, feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={[styles.feedbackTitle, feedback.correct ? styles.feedbackTitleCorrect : styles.feedbackTitleWrong]}>
              {feedback.correct ? '✓ Correct!' : `✗ Answer: ${feedback.correctAnswer}`}
            </Text>
            <Text style={styles.feedbackExplanation}>{feedback.explanation}</Text>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.nextButtonText}>
                {currentIndex + 1 >= TOTAL ? 'Finish →' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, (!selectedChoice || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedChoice || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
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
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 15,
    paddingTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    backgroundColor: Colors.border,
  },
  dotLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginLeft: 8,
  },
  questionCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  domainTag: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  passageText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  stem: {
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  choicesContainer: {
    gap: 10,
    marginBottom: 20,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  choiceButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  choiceKey: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 20,
  },
  choiceKeySelected: {
    color: Colors.primary,
  },
  choiceText: {
    color: Colors.textPrimary,
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  choiceTextSelected: {
    color: Colors.textPrimary,
  },
  feedbackCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  feedbackCorrect: {
    backgroundColor: Colors.correct + '15',
    borderColor: Colors.correct,
  },
  feedbackWrong: {
    backgroundColor: Colors.wrong + '15',
    borderColor: Colors.wrong,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  feedbackTitleCorrect: {
    color: Colors.correct,
  },
  feedbackTitleWrong: {
    color: Colors.wrong,
  },
  feedbackExplanation: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: Colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: Colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
})
