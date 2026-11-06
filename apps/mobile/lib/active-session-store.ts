import { Platform } from 'react-native'

export interface ActiveSession {
  paperId: string
  questionsJson: string
  currentIndex: number
  totalQuestions: number
}

const KEY = 'bubbl_active_session'
let _cache: ActiveSession | null = null

function writeStorage(s: ActiveSession | null) {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s))
    else sessionStorage.removeItem(KEY)
  }
}

function readStorage(): ActiveSession | null {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  return null
}

export function saveActiveSession(s: ActiveSession) {
  _cache = s
  writeStorage(s)
}

export function getActiveSession(): ActiveSession | null {
  return _cache ?? readStorage()
}

export function clearActiveSession() {
  _cache = null
  writeStorage(null)
}
