import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../constants/Colors'
import { apiFetch } from '../../lib/api'

const FEATURES_FREE = [
  '2 practice sessions / week',
  'Basic gap analysis',
  'Wrong answers notebook',
]

const FEATURES_PREMIUM = [
  'Unlimited practice sessions',
  'Full-length mock tests',
  'Advanced gap analysis',
  'Spaced repetition',
  'Score history & trends',
  'Study plan generator',
  'All achievements',
  'No ads',
]

export default function PaywallScreen() {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual')
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }) as { url: string }
      if (data.url) {
        Linking.openURL(data.url)
      }
    } catch {
      // silently fail — user stays on paywall
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>⭐</Text>
          <Text style={styles.heroTitle}>Go Premium</Text>
          <Text style={styles.heroSub}>
            Unlock unlimited practice and reach your target SAT score faster.
          </Text>
        </View>

        {/* Plan toggle */}
        <View style={styles.planToggle}>
          <TouchableOpacity
            style={[styles.planPill, plan === 'monthly' && styles.planPillActive]}
            onPress={() => setPlan('monthly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.planPillText, plan === 'monthly' && styles.planPillTextActive]}>
              Monthly
            </Text>
            <Text style={[styles.planPrice, plan === 'monthly' && styles.planPriceActive]}>
              $8.99/mo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.planPill, plan === 'annual' && styles.planPillActive]}
            onPress={() => setPlan('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE 26%</Text>
            </View>
            <Text style={[styles.planPillText, plan === 'annual' && styles.planPillTextActive]}>
              Annual
            </Text>
            <Text style={[styles.planPrice, plan === 'annual' && styles.planPriceActive]}>
              $80/yr
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feature comparison */}
        <View style={styles.comparisonRow}>
          {/* Free */}
          <View style={[styles.planCard, styles.planCardFree]}>
            <Text style={styles.planCardTitle}>Free</Text>
            {FEATURES_FREE.map(f => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Premium */}
          <View style={[styles.planCard, styles.planCardPremium]}>
            <Text style={[styles.planCardTitle, { color: Colors.primary }]}>Premium</Text>
            {FEATURES_PREMIUM.map(f => (
              <View key={f} style={styles.featureRow}>
                <Text style={[styles.featureCheck, { color: Colors.primary }]}>✓</Text>
                <Text style={[styles.featureText, { color: Colors.textPrimary }]}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.upgradeBtn, loading && { opacity: 0.6 }]}
          onPress={handleUpgrade}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.bg} />
            : <Text style={styles.upgradeBtnText}>
                Start {plan === 'annual' ? 'Annual' : 'Monthly'} Plan →
              </Text>
          }
        </TouchableOpacity>
        <Text style={styles.fine}>Cancel anytime. No hidden fees.</Text>

        {/* Stay free */}
        <TouchableOpacity onPress={() => router.replace('/(app)/home')} activeOpacity={0.7}>
          <Text style={styles.stayFree}>Continue with free plan</Text>
        </TouchableOpacity>
      </ScrollView>
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
  container: { padding: 20, paddingBottom: 48, alignItems: 'center' },

  hero: { alignItems: 'center', marginBottom: 28 },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: { color: Colors.textPrimary, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  heroSub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  planToggle: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  planPill: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  planPillActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  planPillText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700' },
  planPillTextActive: { color: Colors.primary },
  planPrice: { color: Colors.textSecondary, fontSize: 13 },
  planPriceActive: { color: Colors.primary },
  saveBadge: {
    backgroundColor: Colors.correct + '22',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  saveBadgeText: { color: Colors.correct, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  comparisonRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 24 },
  planCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  planCardFree: { backgroundColor: Colors.card, borderColor: Colors.border },
  planCardPremium: { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '44' },
  planCardTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  featureRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  featureCheck: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  featureText: { color: Colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 17 },

  upgradeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  upgradeBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  fine: { color: Colors.textSecondary, fontSize: 12, marginBottom: 20 },
  stayFree: { color: Colors.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
})
