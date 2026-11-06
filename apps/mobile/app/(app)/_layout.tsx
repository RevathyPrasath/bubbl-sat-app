import { Tabs, router } from 'expo-router'
import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus, Text } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/Colors'
import { registerForPushNotifications } from '../../lib/push-notifications'
import { getNotificationsEnabled } from '../../lib/settings-store'
import { initAdMob, showAppOpenAd } from '../../lib/admob'

function TabIcon({ label, active }: { label: string; active: boolean }) {
  const icons: Record<string, string> = {
    Home: '⌂',
    Practice: '✎',
    Daily: '🏆',
    Progress: '◎',
    Forum: '💬',
    Profile: '◉',
  }
  return (
    <Text style={{ fontSize: 20, color: active ? Colors.primary : Colors.textSecondary }}>
      {icons[label] ?? '•'}
    </Text>
  )
}

export default function AppLayout() {
  const { user, loading } = useAuth()
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/welcome')
    }
    if (!loading && user) {
      getNotificationsEnabled().then(enabled => { if (enabled) registerForPushNotifications() })
      initAdMob()
    }
  }, [user, loading])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        showAppOpenAd()
      }
      appState.current = nextState
    })
    return () => sub.remove()
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-around',
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarAccessibilityLabel: 'Practice tab',
          tabBarIcon: ({ focused }) => <TabIcon label="Practice" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="contest"
        options={{
          title: 'Daily',
          tabBarAccessibilityLabel: 'Daily challenge tab',
          tabBarIcon: ({ focused }) => <TabIcon label="Daily" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="gap"
        options={{
          title: 'Progress',
          tabBarAccessibilityLabel: 'Progress tab',
          tabBarIcon: ({ focused }) => <TabIcon label="Progress" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" active={focused} />,
        }}
      />

      {/* Non-tab screens — hidden from tab bar but fully routable via router.push */}
      <Tabs.Screen
        name="question"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="results"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="notebook"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="study-plan"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="diagnostic"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="achievements"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="history"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="paywall"
        options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  )
}
