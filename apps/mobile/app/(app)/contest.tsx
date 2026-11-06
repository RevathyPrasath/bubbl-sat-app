import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useEffect, useState, useRef, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from '../../lib/api'
import { Colors } from '../../constants/Colors'

interface Choice { key: string; text: string }
interface ContestQuestion {
  id: string
  number: number
  subject: string
  domain: string
  skill: string
  difficulty: string
  stem: string
  passage: string | null
  diagram_url: string | null
  type: 'mcq' | 'grid-in'
  choices: Choice[]
  correct?: string
  explanation?: string
}
interface RankingEntry {
  rank: number
  userId: string
  name: string
  wins: number
  totalCorrect: number
  contestsEntered: number
  avgScore: number
  bestScore: number
  isMe: boolean
}

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  correctCount: number
  timeTakenSecs: number
  isMe: boolean
}
interface ContestData {
  contestId: string
  contestDate: string
  opensAt: string
  closesAt: string
  isOpen: boolean
  secondsUntilOpen: number
  hasSubmitted: boolean
  myEntry: { correctCount: number; timeTakenSecs: number; rank: number } | null
  questions: ContestQuestion[]
  leaderboard: LeaderboardEntry[]
  totalEntrants: number
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function rankSuffix(n: number): string {
  if (n === 1) return '🥇'
  if (n === 2) return '🥈'
  if (n === 3) return '🥉'
  return `#${n}`
}

function scoreColor(correct: number, total: number): string {
  const pct = total > 0 ? correct / total : 0
  if (pct >= 0.7) return Colors.correct
  if (pct >= 0.5) return '#FFC107'
  return Colors.wrong
}

function parseSteps(explanation: string): string[] {
  if (!explanation.trim()) return []
  const lines = explanation.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0)
  if (lines.length > 1) return lines
  const parts = explanation.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 2)
  if (parts.length > 1) {
    return parts.map((s, i) => (i < parts.length - 1 ? s + '.' : s.endsWith('.') ? s : s + '.'))
  }
  return [explanation.trim()]
}

// Seconds elapsed since contest opened (global clock, same for everyone)
function secondsSinceOpen(opensAt: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(opensAt).getTime()) / 1000))
}

type Phase = 'loading' | 'countdown' | 'active' | 'submitted' | 'error'

export default function ContestScreen() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [contest, setContest] = useState<ContestData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ correctCount: number; timeTakenSecs: number; rank: number; totalEntrants: number } | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [rankingsTab, setRankingsTab] = useState<'today' | 'weekly' | 'alltime'>('today')
  const [rankings, setRankings] = useState<{ rankings: RankingEntry[]; myRanking: RankingEntry | null; totalContests: number } | null>(null)
  const [rankingsLoading, setRankingsLoading] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const contestRef = useRef<ContestData | null>(null)
  const submittingRef = useRef(false)

  function secondsUntilClose(closesAt: string): number {
    return Math.max(0, Math.round((new Date(closesAt).getTime() - Date.now()) / 1000))
  }

  const startGlobalTimer = useCallback((data: ContestData) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsed(secondsSinceOpen(data.opensAt))
      setTimeRemaining(secondsUntilClose(data.closesAt))
    }, 1000)
    setElapsed(secondsSinceOpen(data.opensAt))
    setTimeRemaining(secondsUntilClose(data.closesAt))
  }, [])

  const load = useCallback(async () => {
    setPhase('loading')
    try {
      const data = await apiFetch('/api/contest') as ContestData
      setContest(data)
      contestRef.current = data
      setAnswers({})
      setCurrentIndex(0)

      if (data.hasSubmitted) {
        setPhase('submitted')
      } else if (!data.isOpen) {
        setCountdown(data.secondsUntilOpen)
        setPhase('countdown')
      } else {
        // Contest is already open — jump straight in with global timer
        startGlobalTimer(data)
        setPhase('active')
      }
    } catch {
      setErrorMsg("Failed to load today's contest.")
      setPhase('error')
    }
  }, [startGlobalTimer])

  useFocusEffect(useCallback(() => {
    load()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [load]))

  // Countdown ticker — auto-opens contest at 0
  useEffect(() => {
    if (phase !== 'countdown' || !contest) return
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(id)
          // Contest just opened — start global timer and go active
          startGlobalTimer(contest)
          setPhase('active')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, contest, startGlobalTimer])

  async function handleSubmit(auto = false) {
    if (!contest || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const finalElapsed = secondsSinceOpen(contest.opensAt)
    // On auto-submit (time expired), retry once on network failure
    const attempt = async () => apiFetch('/api/contest/submit', {
      method: 'POST',
      body: JSON.stringify({
        contestId: contest.contestId,
        answers,
        timeTakenSecs: finalElapsed,
      }),
    }) as Promise<typeof result>
    try {
      let res: typeof result
      try {
        res = await attempt()
      } catch {
        if (auto) {
          await new Promise(r => setTimeout(r, 2000))
          res = await attempt()
        } else {
          throw new Error('network')
        }
      }
      setResult(res)
      const updated = await apiFetch('/api/contest') as ContestData
      setContest(updated)
      setPhase('submitted')
    } catch {
      setErrorMsg('Failed to submit. Try again.')
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  // Auto-submit when contest closes
  useEffect(() => {
    if (phase !== 'active' || timeRemaining > 0) return
    handleSubmit(true)
  }, [phase, timeRemaining])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    )
  }

  if (phase === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Countdown ────────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.pageTitle}>Daily Challenge</Text>
          <Text style={styles.pageSubtitle}>{contest?.contestDate}</Text>

          <View style={styles.countdownCard}>
            <Text style={styles.countdownEmoji}>🏆</Text>
            <Text style={styles.countdownLabel}>Contest opens in</Text>
            <Text style={styles.countdownTime}>{formatCountdown(countdown)}</Text>
            <Text style={styles.countdownSub}>All students start at the same time</Text>
          </View>

          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>How it works</Text>
            <Text style={styles.rulesItem}>• Same 10 questions for every student</Text>
            <Text style={styles.rulesItem}>• Timer starts automatically when contest opens</Text>
            <Text style={styles.rulesItem}>• Everyone competes on the same clock</Text>
            <Text style={styles.rulesItem}>• Most correct answers wins — ties broken by time</Text>
            <Text style={styles.rulesItem}>• One attempt per day</Text>
          </View>

          <View style={styles.entrantsRow}>
            <Text style={styles.entrantsText}>
              {contest?.totalEntrants ?? 0} {(contest?.totalEntrants ?? 0) === 1 ? 'student has' : 'students have'} already submitted today
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Active quiz ──────────────────────────────────────────────────────────────
  if (phase === 'active' && contest) {
    const q = contest.questions[currentIndex]
    const selectedAnswer = answers[q.id] ?? null
    const answeredCount = contest.questions.filter(cq => answers[cq.id]).length
    const allAnswered = answeredCount === contest.questions.length
    const progress = ((currentIndex + 1) / contest.questions.length) * 100

    return (
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.quizHeader}>
          <TouchableOpacity
            onPress={() => currentIndex > 0 && setCurrentIndex(i => i - 1)}
            disabled={currentIndex === 0}
            style={styles.navBtn}
          >
            <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnDisabled]}>←</Text>
          </TouchableOpacity>

          <Text style={styles.quizCounter}>Q{currentIndex + 1}/{contest.questions.length}</Text>
          <Text style={styles.quizDomain} numberOfLines={1}>{q.domain}</Text>

          {/* Global elapsed timer — same for all students */}
          <View style={styles.timerBox}>
            <Text style={styles.timerLabel}>⏱</Text>
            <Text style={styles.timerValue}>{formatTime(elapsed)}</Text>
          </View>

          {/* Closing countdown — turns red under 60s */}
          <View style={[styles.timerBox, timeRemaining <= 60 && styles.timerBoxUrgent]}>
            <Text style={styles.timerLabel}>⌛</Text>
            <Text style={[styles.timerValue, timeRemaining <= 60 && styles.timerValueUrgent]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>

          <Text style={styles.quizAnswered}>{answeredCount}/{contest.questions.length}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>

        <ScrollView contentContainerStyle={styles.quizContainer} keyboardShouldPersistTaps="handled">
          {q.passage ? (
            <View style={styles.passageCard}>
              <Text style={styles.passageText}>{q.passage}</Text>
            </View>
          ) : null}

          {q.diagram_url && Platform.OS === 'web' ? (() => {
            const Img = 'img' as unknown as React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>>
            return (
              <View style={styles.diagramBox}>
                <Img src={q.diagram_url!} alt="Diagram" style={{ width: '100%', height: 160, objectFit: 'contain' } as React.CSSProperties} />
              </View>
            )
          })() : null}

          <Text style={styles.quizStem}>{q.stem}</Text>

          <View style={styles.choicesContainer}>
            {q.choices.map(choice => (
              <TouchableOpacity
                key={choice.key}
                style={[styles.choiceBtn, selectedAnswer === choice.key && styles.choiceBtnSelected]}
                onPress={() => setAnswers(prev => ({ ...prev, [q.id]: choice.key }))}
                activeOpacity={0.7}
              >
                <Text style={[styles.choiceKey, selectedAnswer === choice.key && styles.choiceKeySelected]}>
                  {choice.key}.
                </Text>
                <Text style={[styles.choiceText, selectedAnswer === choice.key && styles.choiceTextSelected]}>
                  {choice.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {currentIndex + 1 < contest.questions.length ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => setCurrentIndex(i => i + 1)}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color={Colors.bg} />
                : <Text style={styles.submitBtnText}>
                    {allAnswered ? 'Submit Challenge' : `Submit (${answeredCount}/${contest.questions.length} answered)`}
                  </Text>
              }
            </TouchableOpacity>
          )}

          {/* Answer map — tap any number to jump to that question */}
          <View style={styles.answerMap}>
            {contest.questions.map((cq, i) => (
              <TouchableOpacity
                key={cq.id}
                style={[
                  styles.answerDot,
                  answers[cq.id] ? styles.answerDotFilled : styles.answerDotEmpty,
                  i === currentIndex && styles.answerDotCurrent,
                ]}
                onPress={() => setCurrentIndex(i)}
              >
                <Text style={[styles.answerDotLabel, answers[cq.id] && styles.answerDotLabelFilled]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Submitted / Results ──────────────────────────────────────────────────────
  if (phase === 'submitted' && contest) {
    const entry = result ?? contest.myEntry
    const total = contest.questions.length
    const correct = entry?.correctCount ?? 0
    const color = scoreColor(correct, total)

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.pageTitle}>Daily Challenge</Text>
          <Text style={styles.pageSubtitle}>{contest.contestDate}</Text>

          {/* Score card */}
          <View style={[styles.scoreCard, { borderColor: color }]}>
            <Text style={styles.scoreRank}>{entry?.rank ? rankSuffix(entry.rank) : '—'}</Text>
            <Text style={[styles.scoreMain, { color }]}>{correct}/{total}</Text>
            <Text style={styles.scoreTime}>⏱ {entry?.timeTakenSecs != null ? formatTime(entry.timeTakenSecs) : '—'}</Text>
            <Text style={styles.scoreMeta}>
              {entry?.rank && entry.rank <= 3
                ? 'Podium finish!'
                : `Rank ${entry?.rank ?? '—'} out of ${contest.totalEntrants} students`}
            </Text>
          </View>

          {/* Leaderboard tabs */}
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <View style={styles.tabRow}>
            {(['today', 'weekly', 'alltime'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, rankingsTab === tab && styles.tabBtnActive]}
                onPress={() => {
                  setRankingsTab(tab)
                  if (tab !== 'today' && !rankings) {
                    setRankingsLoading(true)
                    apiFetch(`/api/contest/rankings?period=${tab === 'weekly' ? 'weekly' : 'alltime'}`)
                      .then(d => setRankings(d as any))
                      .finally(() => setRankingsLoading(false))
                  } else if (tab !== 'today') {
                    setRankingsLoading(true)
                    apiFetch(`/api/contest/rankings?period=${tab === 'weekly' ? 'weekly' : 'alltime'}`)
                      .then(d => setRankings(d as any))
                      .finally(() => setRankingsLoading(false))
                  }
                }}
              >
                <Text style={[styles.tabBtnText, rankingsTab === tab && styles.tabBtnTextActive]}>
                  {tab === 'today' ? 'Today' : tab === 'weekly' ? '7 Days' : 'All Time'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {rankingsTab === 'today' && contest.leaderboard.map(e => (
            <View key={e.userId} style={[styles.lbRow, e.isMe && styles.lbRowMe]}>
              <Text style={[styles.lbRank, e.rank <= 3 && styles.lbRankPodium]}>{rankSuffix(e.rank)}</Text>
              <Text style={[styles.lbName, e.isMe && styles.lbNameMe]} numberOfLines={1}>
                {e.name}{e.isMe ? ' (you)' : ''}
              </Text>
              <Text style={styles.lbScore}>{e.correctCount}/{total}</Text>
              <Text style={styles.lbTime}>{formatTime(e.timeTakenSecs)}</Text>
            </View>
          ))}

          {rankingsTab !== 'today' && (
            rankingsLoading
              ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              : (rankings?.rankings ?? []).map(e => (
                <View key={e.userId} style={[styles.lbRow, e.isMe && styles.lbRowMe]}>
                  <Text style={[styles.lbRank, e.rank <= 3 && styles.lbRankPodium]}>{rankSuffix(e.rank)}</Text>
                  <Text style={[styles.lbName, e.isMe && styles.lbNameMe]} numberOfLines={1}>
                    {e.name}{e.isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.lbScore}>{e.wins}W · {e.avgScore}/10</Text>
                  <Text style={styles.lbTime}>{e.contestsEntered}d</Text>
                </View>
              ))
          )}

          {/* Per-question review */}
          <Text style={styles.sectionTitle}>Review</Text>
          {contest.questions.map((q, i) => {
            const isCorrect = q.correct
              ? (answers[q.id] ?? '').toUpperCase() === q.correct.toUpperCase()
              : false
            return (
              <View key={q.id} style={[styles.reviewCard, isCorrect ? styles.reviewCorrect : styles.reviewWrong]}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewNum}>Q{i + 1}</Text>
                  <Text style={styles.reviewDomain}>{q.domain}</Text>
                  {q.correct && (
                    <Text style={[styles.reviewBadge, { color: isCorrect ? Colors.correct : Colors.wrong }]}>
                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </Text>
                  )}
                </View>
                <Text style={styles.reviewStem} numberOfLines={3}>{q.stem}</Text>
                {q.correct && (
                  <View style={styles.reviewAnswers}>
                    <View style={styles.answerChip}>
                      <Text style={styles.answerChipLabel}>Your answer</Text>
                      <Text style={[styles.answerChipValue, { color: isCorrect ? Colors.correct : Colors.wrong }]}>
                        {answers[q.id] ?? '—'}
                      </Text>
                    </View>
                    <View style={styles.answerChip}>
                      <Text style={styles.answerChipLabel}>Correct</Text>
                      <Text style={[styles.answerChipValue, { color: Colors.correct }]}>{q.correct}</Text>
                    </View>
                  </View>
                )}
                {q.explanation ? (
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationTitle}>How to solve</Text>
                    {parseSteps(q.explanation).map((step, si) => (
                      <View key={si} style={styles.explanationStep}>
                        <View style={styles.explanationStepNum}>
                          <Text style={styles.explanationStepNumText}>{si + 1}</Text>
                        </View>
                        <Text style={styles.explanationStepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )
          })}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return null
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  container: { padding: 20, paddingBottom: 48 },
  errorText: { color: Colors.wrong, fontSize: 15, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: Colors.bg, fontWeight: '700', fontSize: 15 },

  pageTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },

  // Countdown
  countdownCard: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  countdownEmoji: { fontSize: 44, marginBottom: 12 },
  countdownLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  countdownTime: { fontSize: 56, fontWeight: '800', color: Colors.primary, marginBottom: 8, letterSpacing: -2 },
  countdownSub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },

  rulesCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  rulesTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 10 },
  rulesItem: { color: Colors.textSecondary, fontSize: 13, lineHeight: 24 },

  entrantsRow: { alignItems: 'center', marginTop: 4 },
  entrantsText: { color: Colors.textSecondary, fontSize: 13 },

  // Quiz header
  quizHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 10, gap: 8, backgroundColor: Colors.bg,
  },
  navBtn: { width: 32, alignItems: 'center' },
  navBtnText: { color: Colors.primary, fontSize: 20, fontWeight: '700' },
  navBtnDisabled: { color: Colors.border },
  quizCounter: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', minWidth: 36 },
  quizDomain: { flex: 1, color: Colors.primary, fontSize: 11, fontWeight: '600' },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  timerBoxUrgent: { borderColor: Colors.wrong, backgroundColor: Colors.wrong + '15' },
  timerLabel: { fontSize: 12 },
  timerValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] as any },
  timerValueUrgent: { color: Colors.wrong },
  quizAnswered: { color: Colors.textSecondary, fontSize: 11, minWidth: 28, textAlign: 'right' },

  progressTrack: { height: 3, backgroundColor: Colors.border },
  progressFill: { height: 3, backgroundColor: Colors.primary },

  quizContainer: { padding: 16, paddingBottom: 40 },
  passageCard: {
    backgroundColor: Colors.card, borderRadius: 10, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: Colors.border,
  },
  passageText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  diagramBox: {
    backgroundColor: Colors.card, borderRadius: 8, overflow: 'hidden',
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  quizStem: { color: Colors.textPrimary, fontSize: 16, lineHeight: 24, marginBottom: 16 },
  choicesContainer: { gap: 10, marginBottom: 20 },
  choiceBtn: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.card,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  choiceBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  choiceKey: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700', minWidth: 20 },
  choiceKeySelected: { color: Colors.primary },
  choiceText: { color: Colors.textPrimary, fontSize: 15, flex: 1, lineHeight: 22 },
  choiceTextSelected: { color: Colors.textPrimary },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  nextBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },

  answerMap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  answerDot: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1,
  },
  answerDotEmpty: { backgroundColor: Colors.card, borderColor: Colors.border },
  answerDotFilled: { backgroundColor: Colors.primary + '25', borderColor: Colors.primary },
  answerDotCurrent: { borderWidth: 2.5, borderColor: Colors.primary },
  answerDotLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  answerDotLabelFilled: { color: Colors.primary },

  // Results
  scoreCard: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 28,
    alignItems: 'center', borderWidth: 3, marginBottom: 24,
  },
  scoreRank: { fontSize: 40, marginBottom: 8 },
  scoreMain: { fontSize: 44, fontWeight: '800', marginBottom: 4 },
  scoreTime: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  scoreMeta: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },

  sectionTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 12, marginTop: 4 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.primary },

  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, marginBottom: 6,
  },
  lbRowMe: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  lbRank: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, minWidth: 28 },
  lbRankPodium: { fontSize: 20 },
  lbName: { flex: 1, color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  lbNameMe: { color: Colors.primary },
  lbScore: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  lbTime: { color: Colors.textSecondary, fontSize: 12, minWidth: 44, textAlign: 'right' },

  reviewCard: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderLeftWidth: 4,
  },
  reviewCorrect: { backgroundColor: Colors.card, borderColor: Colors.border, borderLeftColor: Colors.correct },
  reviewWrong: { backgroundColor: Colors.card, borderColor: Colors.border, borderLeftColor: Colors.wrong },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reviewNum: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  reviewDomain: { flex: 1, color: Colors.primary, fontSize: 11, fontWeight: '600' },
  reviewBadge: { fontSize: 12, fontWeight: '700' },
  reviewStem: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  reviewAnswers: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  answerChip: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: Colors.border,
  },
  answerChipLabel: { color: Colors.textSecondary, fontSize: 10, marginBottom: 2 },
  answerChipValue: { fontSize: 15, fontWeight: '700' },
  reviewExplanation: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  explanationBox: { marginTop: 4, gap: 8 },
  explanationTitle: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  explanationStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  explanationStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  explanationStepNumText: { color: Colors.primary, fontSize: 11, fontWeight: '800' },
  explanationStepText: { flex: 1, color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
})
