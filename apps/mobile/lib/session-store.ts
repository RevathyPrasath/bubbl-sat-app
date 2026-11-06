export interface AnswerRecord {
  question: {
    id: string
    domain: string
    skill: string
    subject: string
    stem: string
    diagram_url?: string | null
    choices?: { key: string; text: string }[]
    type: 'mcq' | 'grid-in'
    difficulty?: string
    isReview?: boolean
  }
  userAnswer: string
  correct: boolean
  correctAnswer: string
  explanation: string
  oldAbility?: number
  newAbility?: number
  timeTakenSecs?: number
}

let _results: AnswerRecord[] = []

export function setSessionResults(r: AnswerRecord[]) {
  _results = r
}

export function getSessionResults(): AnswerRecord[] {
  return _results
}
