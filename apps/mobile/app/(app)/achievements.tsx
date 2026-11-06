import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiFetch } from '../../lib/api'
import { Colors } from '../../constants/Colors'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  earnedAt?: string
}

function timeAgo(iso?: string): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [earnedCount, setEarnedCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/achievements')
      .then((data: any) => {
        setAchievements(data.achievements ?? [])
        setEarnedCount(data.earnedCount ?? 0)
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const earned = achievements.filter(a => a.earned)
  const locked = achievements.filter(a => !a.earned)

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Progress bar */}
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>Unlocked</Text>
              <Text style={styles.progressCount}>{earnedCount} / {total}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: total > 0 ? `${Math.round((earnedCount / total) * 100)}%` : '0%' }]} />
            </View>
          </View>

          {/* Earned */}
          {earned.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Earned</Text>
              {earned.map(a => (
                <View key={a.id} style={[styles.achievementCard, styles.earnedCard]}>
                  <Text style={styles.achievementIcon}>{a.icon}</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{a.title}</Text>
                    <Text style={styles.achievementDesc}>{a.description}</Text>
                    {a.earnedAt && (
                      <Text style={styles.earnedAt}>{timeAgo(a.earnedAt)}</Text>
                    )}
                  </View>
                  <Text style={styles.earnedCheck}>✓</Text>
                </View>
              ))}
            </>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: earned.length > 0 ? 20 : 0 }]}>Locked</Text>
              {locked.map(a => (
                <View key={a.id} style={[styles.achievementCard, styles.lockedCard]}>
                  <Text style={[styles.achievementIcon, styles.lockedIcon]}>{a.icon}</Text>
                  <View style={styles.achievementInfo}>
                    <Text style={[styles.achievementTitle, styles.lockedText]}>{a.title}</Text>
                    <Text style={styles.achievementDesc}>{a.description}</Text>
                  </View>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              ))}
            </>
          )}

          {achievements.length === 0 && (
            <Text style={styles.empty}>No achievements data available.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backText: { color: Colors.primary, fontSize: 14, fontWeight: '600', width: 60 },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 48 },

  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { color: Colors.textSecondary, fontSize: 13 },
  progressCount: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },

  sectionTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 12 },

  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  earnedCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.primary + '44',
  },
  lockedCard: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
  },
  achievementIcon: { fontSize: 32, width: 40, textAlign: 'center' },
  lockedIcon: { opacity: 0.3 },
  achievementInfo: { flex: 1 },
  achievementTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  lockedText: { color: Colors.textSecondary },
  achievementDesc: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  earnedAt: { color: Colors.primary, fontSize: 11, marginTop: 4, fontWeight: '600' },
  earnedCheck: { color: Colors.correct, fontSize: 18, fontWeight: '700' },
  lockIcon: { fontSize: 16, opacity: 0.4 },

  empty: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 40 },
})
