import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const LAST_PRACTICE_KEY = 'last_practice_date'
const NOTIF_PERMISSION_KEY = 'notification_permission_asked'

export async function recordPractice(): Promise<void> {
  await AsyncStorage.setItem(LAST_PRACTICE_KEY, new Date().toISOString())
}

export async function getLastPracticeDate(): Promise<Date | null> {
  const val = await AsyncStorage.getItem(LAST_PRACTICE_KEY)
  return val ? new Date(val) : null
}

export async function hasAskedPermission(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NOTIF_PERMISSION_KEY)
  return val === 'true'
}

export async function markPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PERMISSION_KEY, 'true')
}

export async function requestWebNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'web') return false
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function isNotificationSupported(): boolean {
  return Platform.OS === 'web' && typeof Notification !== 'undefined'
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) return null
  return Notification.permission
}

export function showReminderNotification(): void {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return
  new Notification('bubbl — Time to Practice! 📚', {
    body: "You haven't practiced today. Keep your streak going!",
    icon: '/icon.png',
  })
}

export async function checkAndShowReminder(): Promise<void> {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  const last = await getLastPracticeDate()
  if (!last) return

  const hoursSince = (Date.now() - last.getTime()) / 3600000
  if (hoursSince >= 23) {
    showReminderNotification()
  }
}
