import { Platform } from 'react-native'
import { apiFetch } from './api'

// react-native-google-mobile-ads must be installed via:
//   npx expo install react-native-google-mobile-ads
// and AdMob App IDs must be set in app.json under the plugin config.
// This module fails silently if the package is not yet installed.

let isPremium = false
let adLoaded = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let interstitial: any = null
let GoogleAds: any = null

async function loadSdk(): Promise<boolean> {
  if (GoogleAds) return true
  try {
    GoogleAds = require('react-native-google-mobile-ads')
    return true
  } catch {
    return false
  }
}

export async function initAdMob(): Promise<void> {
  if (Platform.OS === 'web') return

  try {
    const sub = await apiFetch('/api/subscription').catch(() => null) as { plan: string } | null
    isPremium = sub?.plan === 'premium'
    if (isPremium) return

    const loaded = await loadSdk()
    if (!loaded) return

    const adUnitId = Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID!
      : process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID!

    interstitial = GoogleAds.InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    })

    interstitial.addAdEventListener(GoogleAds.AdEventType.LOADED, () => {
      adLoaded = true
    })

    interstitial.addAdEventListener(GoogleAds.AdEventType.CLOSED, () => {
      adLoaded = false
      interstitial?.load()
    })

    interstitial.load()
  } catch {
    // Non-critical — ad revenue is secondary
  }
}

export async function showAppOpenAd(): Promise<void> {
  if (Platform.OS === 'web') return
  if (isPremium) return
  if (!adLoaded || !interstitial) return

  try {
    await interstitial.show()
  } catch {
    // ignore
  }
}
