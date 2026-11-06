import { Platform } from 'react-native'
import { apiFetch } from './api'

// Push notifications only work on physical devices with native builds (not Expo Go web)
// This module is a no-op on web — safe to call from anywhere

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return

  try {
    const Device = await import('expo-device')
    if (!Device.default.isDevice) return // simulator — skip

    const Notifications = await import('expo-notifications')

    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return

    const tokenData = await Notifications.getExpoPushTokenAsync()
    const token = tokenData.data

    await apiFetch('/api/push/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    }).catch(() => {/* best-effort */})

    await scheduleContestReminder()
  } catch {
    // Silently ignore — push is non-critical
  }
}

export async function disableNotifications(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const Notifications = await import('expo-notifications')
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch {
    // Non-critical
  }
}

export async function scheduleContestReminder(): Promise<void> {
  if (Platform.OS === 'web') return

  try {
    const Notifications = await import('expo-notifications')

    // Skip if already scheduled
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    if (scheduled.some(n => n.identifier === 'contest-daily')) return

    await Notifications.scheduleNotificationAsync({
      identifier: 'contest-daily',
      content: {
        title: "Today's Challenge is Live! 🏆",
        body: 'Compete with students worldwide. Can you top the leaderboard?',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 10,
        minute: 0,
      },
    })
  } catch {
    // Non-critical
  }
}
