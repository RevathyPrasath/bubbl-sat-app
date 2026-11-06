import AsyncStorage from '@react-native-async-storage/async-storage'

const SAT_DATE_KEY = 'sat_test_date'
const TARGET_SCORE_KEY = 'target_score'
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled'

export async function saveSatDate(dateIso: string): Promise<void> {
  await AsyncStorage.setItem(SAT_DATE_KEY, dateIso)
}

export async function getSatDate(): Promise<string | null> {
  return AsyncStorage.getItem(SAT_DATE_KEY)
}

export async function clearSatDate(): Promise<void> {
  await AsyncStorage.removeItem(SAT_DATE_KEY)
}

export async function saveTargetScore(score: number): Promise<void> {
  await AsyncStorage.setItem(TARGET_SCORE_KEY, String(score))
}

export async function getTargetScore(): Promise<number | null> {
  const val = await AsyncStorage.getItem(TARGET_SCORE_KEY)
  return val ? parseInt(val, 10) : null
}

export async function clearTargetScore(): Promise<void> {
  await AsyncStorage.removeItem(TARGET_SCORE_KEY)
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)
  return val === null ? true : val === 'true'
}

export async function saveNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled))
}
