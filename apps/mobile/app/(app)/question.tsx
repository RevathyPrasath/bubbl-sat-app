import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Dimensions,
  Modal,
} from 'react-native'
import { useState, useRef, useEffect, useCallback } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiFetch } from '../../lib/api'
import { Colors } from '../../constants/Colors'
import { Alert } from 'react-native'
import { setSessionResults, AnswerRecord } from '../../lib/session-store'
import { saveActiveSession, getActiveSession, clearActiveSession } from '../../lib/active-session-store'

const SCREEN_HEIGHT = Dimensions.get('window').height
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.68)

interface Choice {
  key: string
  text: string
}

interface Question {
  id: string
  domain: string
  skill: string
  subject: string
  stem: string
  choices?: Choice[]
  type: 'mcq' | 'grid-in'
  passage?: string
  diagram_url?: string | null
  paperId?: string
  difficulty?: string
  isReview?: boolean
}

function difficultyColor(d?: string): string {
  if (!d) return Colors.textSecondary
  const l = d.toLowerCase()
  if (l === 'easy') return Colors.correct
  if (l === 'hard') return Colors.wrong
  return '#FFC107'
}

interface SubmitResponse {
  correct: boolean
  correctAnswer: string
  explanation: string
  newAbility?: number
  oldAbility?: number
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function timerColor(secs: number): string {
  if (secs > 300) return Colors.correct
  if (secs > 120) return '#FFC107'
  return Colors.wrong
}

// ─── Desmos sheet ────────────────────────────────────────────────────────────

interface SheetProps {
  onClose: () => void
  onNext: () => void
  selectedAnswer: string | null
  gridInAnswer: string
  isGridIn: boolean
  isLast: boolean
}

function AnswerBar({ selectedAnswer, gridInAnswer, isGridIn, onNext, isLast, onClose }: Omit<SheetProps, 'onClose'> & { onClose: () => void }) {
  const hasAnswer = isGridIn ? gridInAnswer.trim().length > 0 : !!selectedAnswer
  return (
    <View style={sheetBarStyles.bar}>
      <View style={sheetBarStyles.answerInfo}>
        {hasAnswer ? (
          <>
            <View style={sheetBarStyles.dot} />
            <Text style={sheetBarStyles.answerLabel}>
              {isGridIn ? `Answer: ${gridInAnswer}` : `Selected: ${selectedAnswer}`}
            </Text>
          </>
        ) : (
          <Text style={sheetBarStyles.noAnswer}>No answer selected</Text>
        )}
      </View>
      <TouchableOpacity
        style={[sheetBarStyles.nextBtn, hasAnswer && sheetBarStyles.nextBtnActive]}
        onPress={() => { onClose(); setTimeout(onNext, 240) }}
        activeOpacity={0.8}
      >
        <Text style={[sheetBarStyles.nextBtnText, hasAnswer && sheetBarStyles.nextBtnTextActive]}>
          {isLast ? 'Review →' : 'Next →'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const sheetBarStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
    gap: 10,
  },
  answerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.correct },
  answerLabel: { color: Colors.correct, fontSize: 13, fontWeight: '600' },
  noAnswer: { color: Colors.textSecondary, fontSize: 13 },
  nextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  nextBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  nextBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700' },
  nextBtnTextActive: { color: Colors.bg },
})

function DesmosSheet({ onClose, onNext, selectedAnswer, gridInAnswer, isGridIn, isLast }: SheetProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current

  useState(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  })

  function close() {
    Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }).start(onClose)
  }

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      <View style={styles.sheetHandle}>
        <View style={styles.sheetPill} />
        <TouchableOpacity onPress={close} style={styles.sheetClose}>
          <Text style={styles.sheetCloseText}>✕ Close</Text>
        </TouchableOpacity>
      </View>
      <AnswerBar
        selectedAnswer={selectedAnswer}
        gridInAnswer={gridInAnswer}
        isGridIn={isGridIn}
        isLast={isLast}
        onNext={onNext}
        onClose={close}
      />
      {Platform.OS === 'web' ? (
        (() => {
          const IFrame = 'iframe' as unknown as React.ComponentType<React.IframeHTMLAttributes<HTMLIFrameElement>>
          return (
            <IFrame
              src="https://www.desmos.com/calculator"
              style={{
                width: '100%',
                flex: 1,
                border: 'none',
                display: 'block',
                overflow: 'auto',
                WebkitOverflowScrolling: 'touch',
              } as React.CSSProperties}
              title="Desmos Graphing Calculator"
              allow="fullscreen"
              scrolling="yes"
            />
          )
        })()
      ) : (
        <View style={styles.nativeCalcFallback}>
          <Text style={styles.nativeCalcText}>Desmos Calculator</Text>
          <Text style={styles.nativeCalcSub}>Tap to open in your browser</Text>
          <TouchableOpacity
            style={styles.nativeCalcButton}
            onPress={() => {
              const { Linking } = require('react-native')
              Linking.openURL('https://www.desmos.com/calculator')
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.nativeCalcButtonText}>Open Desmos →</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  )
}

// ─── Reference sheet ─────────────────────────────────────────────────────────

// SVG diagrams rendered on web; native shows formula text only
const DIAGRAMS: Record<string, string> = {
  circle: `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="40" r="30" fill="none" stroke="#6366f1" stroke-width="2"/>
    <line x1="50" y1="40" x2="80" y2="40" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="62" y="36" font-size="10" fill="#aaa" font-family="sans-serif">r</text>
    <text x="20" y="78" font-size="9" fill="#888" font-family="sans-serif">A = πr²  C = 2πr</text>
  </svg>`,
  rectangle: `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="15" width="80" height="45" fill="none" stroke="#6366f1" stroke-width="2"/>
    <text x="45" y="11" font-size="10" fill="#aaa" font-family="sans-serif">w</text>
    <text x="84" y="42" font-size="10" fill="#aaa" font-family="sans-serif">l</text>
    <text x="20" y="76" font-size="9" fill="#888" font-family="sans-serif">A = lw</text>
  </svg>`,
  triangle: `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,8 5,70 95,70" fill="none" stroke="#6366f1" stroke-width="2"/>
    <line x1="50" y1="8" x2="50" y2="70" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="52" y="44" font-size="10" fill="#aaa" font-family="sans-serif">h</text>
    <text x="46" y="78" font-size="10" fill="#aaa" font-family="sans-serif">b</text>
    <text x="12" y="78" font-size="9" fill="#888" font-family="sans-serif">A = ½bh</text>
  </svg>`,
  trapezoid: `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
    <polygon points="25,15 75,15 95,65 5,65" fill="none" stroke="#6366f1" stroke-width="2"/>
    <line x1="50" y1="15" x2="50" y2="65" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="52" y="44" font-size="10" fill="#aaa" font-family="sans-serif">h</text>
    <text x="38" y="12" font-size="9" fill="#aaa" font-family="sans-serif">b₁</text>
    <text x="38" y="78" font-size="9" fill="#aaa" font-family="sans-serif">b₂</text>
  </svg>`,
  box: `<svg viewBox="0 0 110 85" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="25" width="60" height="45" fill="none" stroke="#6366f1" stroke-width="2"/>
    <polygon points="10,25 25,10 85,10 85,55 70,70 70,25" fill="none" stroke="#6366f1" stroke-width="2"/>
    <line x1="85" y1="10" x2="70" y2="25" stroke="#6366f1" stroke-width="1.5"/>
    <text x="34" y="82" font-size="9" fill="#aaa" font-family="sans-serif">l</text>
    <text x="2" y="52" font-size="9" fill="#aaa" font-family="sans-serif">h</text>
    <text x="88" y="40" font-size="9" fill="#aaa" font-family="sans-serif">w</text>
    <text x="2" y="10" font-size="8" fill="#888" font-family="sans-serif">V = lwh</text>
  </svg>`,
  cylinder: `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="22" rx="30" ry="10" fill="none" stroke="#6366f1" stroke-width="2"/>
    <ellipse cx="50" cy="68" rx="30" ry="10" fill="none" stroke="#6366f1" stroke-width="2"/>
    <line x1="20" y1="22" x2="20" y2="68" stroke="#6366f1" stroke-width="2"/>
    <line x1="80" y1="22" x2="80" y2="68" stroke="#6366f1" stroke-width="2"/>
    <line x1="50" y1="22" x2="80" y2="22" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="52" y="20" font-size="9" fill="#aaa" font-family="sans-serif">r</text>
    <text x="82" y="48" font-size="9" fill="#aaa" font-family="sans-serif">h</text>
    <text x="12" y="88" font-size="8" fill="#888" font-family="sans-serif">V = πr²h</text>
  </svg>`,
  cone: `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="70" rx="35" ry="12" fill="none" stroke="#6366f1" stroke-width="2"/>
    <line x1="15" y1="70" x2="50" y2="10" stroke="#6366f1" stroke-width="2"/>
    <line x1="85" y1="70" x2="50" y2="10" stroke="#6366f1" stroke-width="2"/>
    <line x1="50" y1="10" x2="50" y2="70" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <line x1="50" y1="70" x2="85" y2="70" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="52" y="44" font-size="9" fill="#aaa" font-family="sans-serif">h</text>
    <text x="66" y="68" font-size="9" fill="#aaa" font-family="sans-serif">r</text>
    <text x="8" y="88" font-size="8" fill="#888" font-family="sans-serif">V = ⅓πr²h</text>
  </svg>`,
  sphere: `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="45" r="34" fill="none" stroke="#6366f1" stroke-width="2"/>
    <ellipse cx="50" cy="45" rx="34" ry="12" fill="none" stroke="#6366f1" stroke-width="1" stroke-dasharray="4,3"/>
    <line x1="50" y1="45" x2="84" y2="45" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <text x="64" y="41" font-size="9" fill="#aaa" font-family="sans-serif">r</text>
    <text x="5" y="88" font-size="8" fill="#888" font-family="sans-serif">V = 4/3πr³  SA = 4πr²</text>
  </svg>`,
  pyramid: `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
    <polygon points="50,8 5,75 95,75" fill="none" stroke="#6366f1" stroke-width="2"/>
    <line x1="5" y1="75" x2="35" y2="55" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,2"/>
    <line x1="95" y1="75" x2="35" y2="55" stroke="#6366f1" stroke-width="2"/>
    <line x1="50" y1="8" x2="35" y2="55" stroke="#6366f1" stroke-width="2"/>
    <text x="8" y="88" font-size="8" fill="#888" font-family="sans-serif">V = ⅓lwh</text>
  </svg>`,
  pythagorean: `<svg viewBox="0 0 100 85" xmlns="http://www.w3.org/2000/svg">
    <polygon points="10,70 10,15 70,70" fill="none" stroke="#6366f1" stroke-width="2"/>
    <rect x="10" y="60" width="10" height="10" fill="none" stroke="#6366f1" stroke-width="1.5"/>
    <text x="2" y="44" font-size="10" fill="#aaa" font-family="sans-serif">a</text>
    <text x="36" y="82" font-size="10" fill="#aaa" font-family="sans-serif">b</text>
    <text x="42" y="38" font-size="10" fill="#aaa" font-family="sans-serif">c</text>
    <text x="5" y="10" font-size="8" fill="#888" font-family="sans-serif">a²+b²=c²</text>
  </svg>`,
  tri306090: `<svg viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
    <polygon points="8,75 8,15 90,75" fill="none" stroke="#6366f1" stroke-width="2"/>
    <rect x="8" y="65" width="10" height="10" fill="none" stroke="#6366f1" stroke-width="1.5"/>
    <text x="1" y="46" font-size="9" fill="#aaa" font-family="sans-serif">√3</text>
    <text x="42" y="84" font-size="9" fill="#aaa" font-family="sans-serif">1</text>
    <text x="50" y="40" font-size="9" fill="#aaa" font-family="sans-serif">2</text>
    <text x="2" y="12" font-size="8" fill="#6366f1" font-family="sans-serif">30°</text>
    <text x="68" y="72" font-size="8" fill="#6366f1" font-family="sans-serif">60°</text>
  </svg>`,
  tri454590: `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
    <polygon points="8,75 8,15 75,75" fill="none" stroke="#6366f1" stroke-width="2"/>
    <rect x="8" y="65" width="10" height="10" fill="none" stroke="#6366f1" stroke-width="1.5"/>
    <text x="0" y="46" font-size="9" fill="#aaa" font-family="sans-serif">1</text>
    <text x="36" y="84" font-size="9" fill="#aaa" font-family="sans-serif">1</text>
    <text x="44" y="38" font-size="9" fill="#aaa" font-family="sans-serif">√2</text>
    <text x="2" y="14" font-size="8" fill="#6366f1" font-family="sans-serif">45°</text>
    <text x="52" y="72" font-size="8" fill="#6366f1" font-family="sans-serif">45°</text>
  </svg>`,
}

function DiagramCard({ svgKey }: { svgKey: string }) {
  if (Platform.OS !== 'web') return null
  const svg = DIAGRAMS[svgKey]
  if (!svg) return null
  const Div = 'div' as unknown as React.ComponentType<React.HTMLAttributes<HTMLDivElement>>
  return (
    <Div
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ width: 100, height: 80, flexShrink: 0 } as React.CSSProperties}
    />
  )
}

const REF_SECTIONS = [
  {
    section: 'Area',
    items: [
      { label: 'Circle', formula: 'A = πr²', diagram: 'circle' },
      { label: 'Rectangle', formula: 'A = lw', diagram: 'rectangle' },
      { label: 'Triangle', formula: 'A = ½bh', diagram: 'triangle' },
      { label: 'Trapezoid', formula: 'A = ½(b₁ + b₂)h', diagram: 'trapezoid' },
    ],
  },
  {
    section: 'Circumference & Arc',
    items: [
      { label: 'Circumference', formula: 'C = 2πr' },
      { label: 'Arc length', formula: 'L = (θ/360°) × 2πr' },
      { label: 'Sector area', formula: 'A = (θ/360°) × πr²' },
    ],
  },
  {
    section: 'Volume',
    items: [
      { label: 'Rectangular box', formula: 'V = lwh', diagram: 'box' },
      { label: 'Cylinder', formula: 'V = πr²h', diagram: 'cylinder' },
      { label: 'Pyramid', formula: 'V = ⅓lwh', diagram: 'pyramid' },
      { label: 'Cone', formula: 'V = ⅓πr²h', diagram: 'cone' },
      { label: 'Sphere', formula: 'V = (4/3)πr³  ·  SA = 4πr²', diagram: 'sphere' },
    ],
  },
  {
    section: 'Right Triangles',
    items: [
      { label: 'Pythagorean theorem', formula: 'a² + b² = c²', diagram: 'pythagorean' },
      { label: '30-60-90', formula: 'x : x√3 : 2x', diagram: 'tri306090' },
      { label: '45-45-90', formula: 'x : x : x√2', diagram: 'tri454590' },
    ],
  },
  {
    section: 'Key Facts',
    items: [
      { label: 'Circle degrees', formula: '360°' },
      { label: 'Circle radians', formula: '2π radians' },
      { label: 'Triangle angles sum', formula: '180°' },
    ],
  },
]

function RefSheet({ onClose, onNext, selectedAnswer, gridInAnswer, isGridIn, isLast }: SheetProps) {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current

  useState(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  })

  function close() {
    Animated.timing(translateY, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }).start(onClose)
  }

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      <View style={styles.sheetHandle}>
        <View style={styles.sheetPill} />
        <Text style={styles.sheetTitle}>SAT Math Reference</Text>
        <TouchableOpacity onPress={close} style={styles.sheetClose}>
          <Text style={styles.sheetCloseText}>✕ Close</Text>
        </TouchableOpacity>
      </View>
      <AnswerBar
        selectedAnswer={selectedAnswer}
        gridInAnswer={gridInAnswer}
        isGridIn={isGridIn}
        isLast={isLast}
        onNext={onNext}
        onClose={close}
      />
      <ScrollView contentContainerStyle={styles.refContent}>
        {REF_SECTIONS.map(({ section, items }) => (
          <View key={section} style={styles.refSection}>
            <Text style={styles.refSectionTitle}>{section}</Text>
            {items.map((item) => {
              const hasDiagram = Platform.OS === 'web' && 'diagram' in item && !!item.diagram
              return (
                <View key={item.label} style={[styles.refRow, hasDiagram && styles.refRowWithDiagram]}>
                  <View style={styles.refTextGroup}>
                    <Text style={styles.refLabel}>{item.label}</Text>
                    <Text style={styles.refFormula}>{item.formula}</Text>
                  </View>
                  {'diagram' in item && item.diagram ? <DiagramCard svgKey={item.diagram} /> : null}
                </View>
              )
            })}
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function QuestionScreen() {
  const params = useLocalSearchParams<{ paperId: string; resumeIndex?: string }>()
  const paperId = params.paperId
  const session = getActiveSession()
  const questions: Question[] = session?.questionsJson ? JSON.parse(session.questionsJson) : []
  const resumeIndex = params.resumeIndex ? parseInt(params.resumeIndex, 10) : (session?.currentIndex ?? 0)

  const [currentIndex, setCurrentIndex] = useState(resumeIndex)

  // All answers stored locally — submitted in batch at the end
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [gridInDrafts, setGridInDrafts] = useState<Record<number, string>>({})

  // Flags & cross-out
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [crossedOut, setCrossedOut] = useState<Record<number, string[]>>({})
  const [crossOutMode, setCrossOutMode] = useState(false)

  // Timer
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerReady, setTimerReady] = useState(false)

  // UI panels
  const [showCalc, setShowCalc] = useState(false)
  const [showRefSheet, setShowRefSheet] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const finishingRef = useRef(false)
  finishingRef.current = finishing

  // Time tracking — ms timestamp when current question was first shown
  const questionStartRef = useRef<number>(Date.now())
  const timesRef = useRef<Record<number, number>>({}) // index → seconds spent

  const total = questions.length
  const question = questions[currentIndex]
  const isGridIn = question?.type === 'grid-in'
  const isMath = question?.subject === 'math'
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0
  const selectedChoice = answers[currentIndex] ?? null
  const gridInAnswer = gridInDrafts[currentIndex] ?? ''
  const currentCrossedOut = crossedOut[currentIndex] ?? []
  const isCurrentFlagged = flagged.has(currentIndex)
  const answeredCount = questions.filter((_, i) => !!(answers[i] || gridInDrafts[i])).length

  // ── Timer init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (questions.length === 0) return
    const hasMixed = questions.some(q => q.subject !== questions[0].subject)
    let secs: number
    if (hasMixed) {
      const mc = questions.filter(q => q.subject === 'math').length
      const ec = questions.filter(q => q.subject === 'english').length
      secs = mc * 90 + ec * 75
    } else {
      secs = questions.length * (questions[0].subject === 'math' ? 90 : 75)
    }
    setTimeLeft(secs)
    setTimerReady(true)
  }, [])

  // ── Timer tick ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerReady || timeLeft <= 0 || finishingRef.current) return
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, timerReady])

  // ── Auto-submit on time up ──────────────────────────────────────────────────
  const finalSubmitRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (timeLeft === 0 && timerReady && !finishingRef.current && questions.length > 0) {
      finalSubmitRef.current()
    }
  }, [timeLeft, timerReady])

  // ── Save active session + reset per-question timer ──────────────────────────
  useEffect(() => {
    questionStartRef.current = Date.now()
    if (questions.length > 0 && params.questions) {
      saveActiveSession({
        paperId,
        questionsJson: params.questions,
        currentIndex,
        totalQuestions: questions.length,
      })
    }
  }, [currentIndex])

  // ── Final submit ────────────────────────────────────────────────────────────
  function recordCurrentTime() {
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000)
    timesRef.current[currentIndex] = (timesRef.current[currentIndex] ?? 0) + elapsed
    questionStartRef.current = Date.now()
  }

  async function handleFinalSubmit() {
    if (finishingRef.current) return
    recordCurrentTime()
    setFinishing(true)
    setShowReview(false)

    const records: AnswerRecord[] = questions.map((q, i) => ({
      question: {
        id: q.id,
        domain: q.domain,
        skill: q.skill,
        subject: q.subject,
        stem: q.stem,
        diagram_url: q.diagram_url,
        choices: q.choices,
        type: q.type,
        difficulty: q.difficulty,
        isReview: q.isReview,
      },
      userAnswer: answers[i] || gridInDrafts[i] || '',
      correct: false,
      correctAnswer: '',
      explanation: '',
      timeTakenSecs: timesRef.current[i],
    }))

    const promises = records.map(async (record, i) => {
      if (!record.userAnswer) return
      const q = questions[i]
      try {
        const res = (await apiFetch('/api/submit-answer', {
          method: 'POST',
          body: JSON.stringify({
            paperId: q.paperId ?? paperId,
            questionId: q.id,
            answer: record.userAnswer,
            timeTakenSecs: record.timeTakenSecs,
          }),
        })) as SubmitResponse
        record.correct = res.correct
        record.correctAnswer = res.correctAnswer
        record.explanation = res.explanation
        record.oldAbility = res.oldAbility
        record.newAbility = res.newAbility
      } catch {
        // leave defaults
      }
    })

    await Promise.allSettled(promises)

    // Complete the paper — writes attempt record and marks paper done
    const questionResults = records.map((r, i) => ({
      questionId: questions[i].id,
      correct: r.correct,
      domain: questions[i].domain,
      timeTakenSecs: r.timeTakenSecs,
    }))
    const totalSecs = Object.values(timesRef.current).reduce((s, v) => s + v, 0)
    apiFetch('/api/complete-paper', {
      method: 'POST',
      body: JSON.stringify({ paperId, questionResults, timeTakenSecs: totalSecs }),
    }).catch(() => {/* best-effort */})

    clearActiveSession()
    setSessionResults(records)
    router.replace({ pathname: '/(app)/results', params: { paperId } })
  }

  finalSubmitRef.current = handleFinalSubmit

  // ── Navigation ──────────────────────────────────────────────────────────────
  function handleNext() {
    recordCurrentTime()
    if (isGridIn && gridInAnswer.trim()) {
      setAnswers(prev => ({ ...prev, [currentIndex]: gridInAnswer.trim() }))
    }
    setCrossOutMode(false)
    if (currentIndex + 1 < total) {
      setCurrentIndex(i => i + 1)
    } else {
      setShowReview(true)
    }
  }

  function handleBack() {
    if (currentIndex > 0) {
      recordCurrentTime()
      setCrossOutMode(false)
      setCurrentIndex(i => i - 1)
    }
  }

  function toggleFlag() {
    setFlagged(prev => {
      const next = new Set(prev)
      next.has(currentIndex) ? next.delete(currentIndex) : next.add(currentIndex)
      return next
    })
  }

  function handleChoiceTap(key: string) {
    if (crossOutMode) {
      setCrossedOut(prev => {
        const cur = prev[currentIndex] ?? []
        return {
          ...prev,
          [currentIndex]: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key],
        }
      })
    } else {
      setAnswers(prev => ({ ...prev, [currentIndex]: key }))
    }
  }

  // ── Loading / empty states ──────────────────────────────────────────────────
  if (finishing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.finishingText}>Calculating results…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!question) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No questions available.</Text>
        </View>
      </SafeAreaView>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          disabled={currentIndex === 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.backBtnText, currentIndex === 0 && styles.backBtnDisabled]}>←</Text>
        </TouchableOpacity>

        <View style={styles.domainGroup}>
          <Text style={styles.domainTag} numberOfLines={1}>{question.domain}</Text>
          {question.difficulty ? (
            <Text style={[styles.diffBadge, { color: difficultyColor(question.difficulty) }]}>
              {question.difficulty}
            </Text>
          ) : null}
          {question.isReview && (
            <Text style={styles.reviewBadge}>↩ Review</Text>
          )}
        </View>

        {timerReady && (
          <Text style={[styles.timer, { color: timerColor(timeLeft) }]}>
            ⏱ {formatTime(timeLeft)}
          </Text>
        )}

        <Text style={styles.questionCount}>Q{currentIndex + 1}/{total}</Text>

        <TouchableOpacity onPress={toggleFlag} style={styles.flagBtn} activeOpacity={0.7}>
          <Text style={styles.flagBtnText}>{isCurrentFlagged ? '🔖' : '📌'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowReport(true)} style={styles.flagBtn} activeOpacity={0.7}>
          <Text style={styles.flagBtnText}>⚑</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Passage */}
        {question.passage ? (
          <View style={styles.passageCard}>
            <Text style={styles.passageText}>{question.passage}</Text>
          </View>
        ) : null}

        {/* Diagram */}
        {question.diagram_url ? (
          <View style={styles.diagramContainer}>
            {Platform.OS === 'web' ? (() => {
              const Img = 'img' as unknown as React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>>
              return (
                <Img
                  src={question.diagram_url!}
                  alt="Question diagram"
                  style={{ width: '100%', height: 200, objectFit: 'contain' } as React.CSSProperties}
                />
              )
            })() : (
              <Image
                source={{ uri: question.diagram_url }}
                style={styles.diagram}
                resizeMode="contain"
                accessibilityLabel="Question diagram"
              />
            )}
          </View>
        ) : null}

        {/* Stem */}
        <Text style={styles.stem}>{question.stem}</Text>

        {/* Choices or grid-in */}
        {isGridIn ? (
          <View style={styles.gridInSection}>
            <Text style={styles.gridInLabel}>Your answer:</Text>
            <TextInput
              style={styles.gridInInput}
              value={gridInAnswer}
              onChangeText={text =>
                setGridInDrafts(prev => ({ ...prev, [currentIndex]: text }))
              }
              placeholder="Enter number, fraction, or decimal"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="default"
              autoCapitalize="none"
            />
            <Text style={styles.gridInHint}>
              Enter as: integer, decimal, or fraction (e.g. 3/4)
            </Text>
          </View>
        ) : (
          <View style={styles.choicesContainer}>
            {/* Cross-out toggle */}
            <TouchableOpacity
              style={[styles.crossOutToggle, crossOutMode && styles.crossOutToggleActive]}
              onPress={() => setCrossOutMode(m => !m)}
              activeOpacity={0.8}
            >
              <Text style={[styles.crossOutToggleText, crossOutMode && styles.crossOutToggleTextActive]}>
                {crossOutMode ? '✓  Selecting answers' : 'ABC  Cross out answers'}
              </Text>
            </TouchableOpacity>

            {question.choices?.map(choice => {
              const isCrossed = currentCrossedOut.includes(choice.key)
              const isSelected = selectedChoice === choice.key && !crossOutMode
              return (
                <TouchableOpacity
                  key={choice.key}
                  style={[
                    styles.choiceButton,
                    isSelected && styles.choiceButtonSelected,
                    isCrossed && styles.choiceButtonCrossed,
                  ]}
                  onPress={() => handleChoiceTap(choice.key)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected, disabled: isCrossed }}
                  accessibilityLabel={`Choice ${choice.key}: ${choice.text}`}
                >
                  <View style={[
                    styles.choiceCircle,
                    isSelected && styles.choiceCircleSelected,
                    isCrossed && styles.choiceCircleCrossed,
                  ]}>
                    <Text style={[
                      styles.choiceKey,
                      isSelected && styles.choiceKeySelected,
                      isCrossed && styles.choiceTextCrossed,
                    ]}>
                      {choice.key}
                    </Text>
                  </View>
                  <Text style={[
                    styles.choiceText,
                    isSelected && styles.choiceTextSelected,
                    isCrossed && styles.choiceTextCrossed,
                  ]}>
                    {choice.text}
                  </Text>
                  {isCrossed && <Text style={styles.crossIcon}>✕</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Next / Review */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {currentIndex + 1 === total ? 'Review & Submit →' : 'Next →'}
          </Text>
        </TouchableOpacity>

        {/* Skip hint when nothing answered */}
        {!(isGridIn ? gridInAnswer.trim() : selectedChoice) && (
          <Text style={styles.skipHint}>No answer selected — tap Next to skip this question</Text>
        )}
      </ScrollView>

      {/* Math FABs (calc + reference) */}
      {isMath && !showCalc && !showRefSheet && (
        <View style={styles.fabRow}>
          <TouchableOpacity
            style={styles.calcFab}
            onPress={() => setShowRefSheet(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.calcFabText}>📐</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.calcFab}
            onPress={() => setShowCalc(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.calcFabText}>🧮</Text>
          </TouchableOpacity>
        </View>
      )}

      {showCalc && (
        <DesmosSheet
          onClose={() => setShowCalc(false)}
          onNext={handleNext}
          selectedAnswer={selectedChoice}
          gridInAnswer={gridInAnswer}
          isGridIn={isGridIn}
          isLast={currentIndex + 1 === total}
        />
      )}
      {showRefSheet && (
        <RefSheet
          onClose={() => setShowRefSheet(false)}
          onNext={handleNext}
          selectedAnswer={selectedChoice}
          gridInAnswer={gridInAnswer}
          isGridIn={isGridIn}
          isLast={currentIndex + 1 === total}
        />
      )}

      {/* Review modal */}
      <Modal visible={showReview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Review Your Answers</Text>
            <Text style={styles.modalSub}>
              {answeredCount} answered · {total - answeredCount} skipped · {flagged.size} flagged
            </Text>

            <ScrollView style={styles.reviewGrid} contentContainerStyle={styles.reviewGridContent}>
              {questions.map((_, i) => {
                const isAnswered = !!(answers[i] || gridInDrafts[i])
                const isFlagged = flagged.has(i)
                let chipBg = Colors.border
                let chipText = Colors.textSecondary
                if (isAnswered && !isFlagged) { chipBg = Colors.correct + '30'; chipText = Colors.correct }
                if (isFlagged && isAnswered) { chipBg = '#FFC10730'; chipText = '#FFC107' }
                if (isFlagged && !isAnswered) { chipBg = Colors.wrong + '30'; chipText = Colors.wrong }
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.reviewChip, { backgroundColor: chipBg, borderColor: chipText }]}
                    onPress={() => { setCurrentIndex(i); setShowReview(false) }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.reviewChipText, { color: chipText }]}>
                      {isFlagged ? '🔖' : ''}{i + 1}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            <View style={styles.reviewLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.correct }]} />
                <Text style={styles.legendText}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                <Text style={styles.legendText}>Flagged</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.border }]} />
                <Text style={styles.legendText}>Skipped</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBackBtn}
                onPress={() => setShowReview(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBackText}>← Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleFinalSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitText}>Submit All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report question modal */}
      <Modal visible={showReport} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: 20 }]}>
            <Text style={[styles.modalTitle, { marginBottom: 16 }]}>Report Question</Text>
            {(['Wrong answer key', 'Unclear wording', 'Incorrect explanation', 'Duplicate question', 'Other']).map(reason => (
              <TouchableOpacity
                key={reason}
                style={styles.reportOption}
                activeOpacity={0.8}
                onPress={async () => {
                  setShowReport(false)
                  try {
                    await apiFetch('/api/report-question', {
                      method: 'POST',
                      body: JSON.stringify({ questionId: question.id, reason }),
                    })
                    Alert.alert('Thanks!', 'Your report has been submitted.')
                  } catch {
                    // silently ignore
                  }
                }}
              >
                <Text style={styles.reportOptionText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { marginTop: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border }]}
              onPress={() => setShowReport(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalSubmitText, { color: Colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: Colors.textSecondary, fontSize: 16 },
  finishingText: { color: Colors.textSecondary, fontSize: 15, marginTop: 8 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  backBtn: { padding: 4, minWidth: 28 },
  backBtnText: { color: Colors.primary, fontSize: 20, fontWeight: '600' },
  backBtnDisabled: { opacity: 0.25 },
  domainGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  domainTag: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  diffBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reviewBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFC107',
  },
  timer: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
  },
  questionCount: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  flagBtn: { padding: 4 },
  flagBtnText: { fontSize: 16 },
  closeButton: { padding: 4 },
  closeText: { color: Colors.textSecondary, fontSize: 16 },

  // Progress
  progressTrack: {
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  // Scroll content
  container: { padding: 20, paddingBottom: 120 },

  passageCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passageText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },

  diagramContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  diagram: { width: '100%', height: 200 },

  stem: {
    color: Colors.textPrimary,
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 22,
    fontWeight: '400',
    letterSpacing: 0.1,
  },

  // Choices
  choicesContainer: { gap: 10, marginBottom: 24 },
  crossOutToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginBottom: 8,
  },
  crossOutToggleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '18',
  },
  crossOutToggleText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  crossOutToggleTextActive: { color: Colors.primary },

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
  choiceButtonCrossed: {
    opacity: 0.4,
    borderStyle: 'dashed',
  },
  choiceCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  choiceCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  choiceCircleCrossed: { borderColor: Colors.wrong + '60' },
  choiceKey: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceKeySelected: { color: '#fff' },
  choiceText: { color: Colors.textPrimary, fontSize: 15, flex: 1, lineHeight: 22 },
  choiceTextSelected: { color: Colors.textPrimary },
  choiceTextCrossed: { textDecorationLine: 'line-through' },
  crossIcon: {
    color: Colors.wrong,
    fontSize: 14,
    fontWeight: '700',
    alignSelf: 'center',
  },

  // Grid-in
  gridInSection: { marginBottom: 24 },
  gridInLabel: { color: Colors.textSecondary, fontSize: 14, marginBottom: 8 },
  gridInInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 18,
    marginBottom: 8,
  },
  gridInHint: { color: Colors.textSecondary, fontSize: 12 },

  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  skipHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },

  // FABs
  fabRow: {
    position: 'absolute',
    bottom: 28,
    right: 16,
    flexDirection: 'column',
    gap: 10,
  },
  calcFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  calcFabText: { fontSize: 24 },

  // Bottom sheets
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: Colors.border,
    overflow: 'visible',
  },
  sheetHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetPill: {
    position: 'absolute',
    top: 8,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  sheetClose: { position: 'absolute', right: 16, paddingVertical: 6, paddingHorizontal: 10 },
  sheetCloseText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Reference sheet content
  refContent: { padding: 16, paddingBottom: 32 },
  refSection: { marginBottom: 20 },
  refSectionTitle: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  refRowWithDiagram: {
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  refTextGroup: { flex: 1, justifyContent: 'center', gap: 2 },
  refLabel: { color: Colors.textSecondary, fontSize: 14 },
  refFormula: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Desmos native fallback
  nativeCalcFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  nativeCalcText: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  nativeCalcSub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  nativeCalcButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  nativeCalcButtonText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },

  // Review modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: SCREEN_HEIGHT * 0.82,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  reviewGrid: { maxHeight: SCREEN_HEIGHT * 0.38 },
  reviewGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  reviewChip: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewChipText: { fontSize: 12, fontWeight: '700' },
  reviewLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: Colors.textSecondary, fontSize: 12 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalBackBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBackText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },
  reportOption: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reportOptionText: { color: Colors.textPrimary, fontSize: 15 },
})
