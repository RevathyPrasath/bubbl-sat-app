import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { useState, useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/Colors'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ForumPost {
  id: string
  topic: string
  title: string
  body: string
  createdAt: string
  authorName: string
  replyCount: number
}

interface ForumReply {
  id: string
  body: string
  createdAt: string
  authorName: string
}

interface PostDetail extends ForumPost {
  replies: ForumReply[]
}

type Screen = 'topics' | 'postList' | 'postDetail' | 'newPost'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPICS = [
  { id: 'Algebra', icon: '𝑥', desc: 'Linear equations, systems, inequalities' },
  { id: 'Advanced Math', icon: '∫', desc: 'Polynomials, functions, complex equations' },
  { id: 'Data & Statistics', icon: '📊', desc: 'Charts, probability, averages' },
  { id: 'Geometry & Trig', icon: '△', desc: 'Angles, circles, right triangles' },
  { id: 'Information & Ideas', icon: '💡', desc: 'Main idea, inference, evidence' },
  { id: 'Craft & Structure', icon: '🏛', desc: 'Vocabulary, text structure, purpose' },
  { id: 'Expression of Ideas', icon: '✍️', desc: 'Transitions, rhetoric, revision' },
  { id: 'Standard English', icon: '📝', desc: 'Grammar, punctuation, sentence structure' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ForumScreen() {
  const { user } = useAuth()
  const [screen, setScreen] = useState<Screen>('topics')
  const [activeTopic, setActiveTopic] = useState<string>('')
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [postDetail, setPostDetail] = useState<PostDetail | null>(null)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  // New post form state
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newTopic, setNewTopic] = useState('')

  // Reply state
  const [replyBody, setReplyBody] = useState('')

  // ── Subscription check ────────────────────────────────────────────────────

  const checkPremium = useCallback(async () => {
    if (!user) return
    try {
      const data = await apiFetch('/api/subscription') as { plan: string }
      setIsPremium(data.plan === 'premium')
    } catch {
      setIsPremium(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => {
    checkPremium()
  }, [checkPremium]))

  // ── Navigation helpers ────────────────────────────────────────────────────

  async function openTopic(topic: string) {
    setActiveTopic(topic)
    setLoadingPosts(true)
    setScreen('postList')
    try {
      const data = await apiFetch(`/api/forum?topic=${encodeURIComponent(topic)}`) as {
        posts: ForumPost[]
      }
      setPosts(data.posts)
    } catch {
      Alert.alert('Error', 'Failed to load posts. Please try again.')
      setScreen('topics')
    } finally {
      setLoadingPosts(false)
    }
  }

  async function openPost(postId: string) {
    setLoadingDetail(true)
    setScreen('postDetail')
    setReplyBody('')
    try {
      const data = await apiFetch(`/api/forum/${postId}`) as {
        post: ForumPost
        replies: ForumReply[]
      }
      setPostDetail({ ...data.post, replies: data.replies })
    } catch {
      Alert.alert('Error', 'Failed to load post. Please try again.')
      setScreen('postList')
    } finally {
      setLoadingDetail(false)
    }
  }

  function openNewPost() {
    setNewTitle('')
    setNewBody('')
    setNewTopic(activeTopic)
    setScreen('newPost')
  }

  function goBack() {
    if (screen === 'postList') setScreen('topics')
    else if (screen === 'postDetail') setScreen('postList')
    else if (screen === 'newPost') setScreen(postDetail ? 'postDetail' : 'postList')
  }

  // ── Submit post ───────────────────────────────────────────────────────────

  async function submitPost() {
    if (!newTitle.trim() || !newBody.trim() || !newTopic) {
      Alert.alert('Missing fields', 'Please fill in all fields before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const result = await apiFetch('/api/forum', {
        method: 'POST',
        body: JSON.stringify({ topic: newTopic, title: newTitle.trim(), body: newBody.trim() }),
      }) as { post: ForumPost; review: { approved: boolean; reason: string } }

      if (result.review.approved) {
        Alert.alert('Post published!', 'Your post is now live in the forum.')
      } else {
        Alert.alert(
          'Post not published',
          `${result.review.reason}\n\nTry revising your post to focus on SAT concepts or strategies.`
        )
      }
      setScreen('postList')
      // Refresh post list
      const data = await apiFetch(`/api/forum?topic=${encodeURIComponent(newTopic)}`) as {
        posts: ForumPost[]
      }
      setPosts(data.posts)
    } catch {
      Alert.alert('Error', 'Failed to submit post. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submit reply ──────────────────────────────────────────────────────────

  async function submitReply() {
    if (!postDetail || !replyBody.trim()) return
    setSubmitting(true)
    try {
      const result = await apiFetch(`/api/forum/${postDetail.id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ body: replyBody.trim() }),
      }) as { reply: ForumReply; review: { approved: boolean; reason: string } }

      if (result.review.approved) {
        setReplyBody('')
        // Refresh detail
        const data = await apiFetch(`/api/forum/${postDetail.id}`) as {
          post: ForumPost
          replies: ForumReply[]
        }
        setPostDetail({ ...data.post, replies: data.replies })
      } else {
        Alert.alert(
          'Reply not published',
          `${result.review.reason}\n\nMake sure your reply is relevant to the SAT.`
        )
      }
    } catch {
      Alert.alert('Error', 'Failed to submit reply. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Screen: Topic Grid ───────────────────────────────────────────────────

  if (screen === 'topics') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.pageTitle}>Student Forum</Text>
          <Text style={styles.pageSubtitle}>Discuss SAT strategies with fellow students</Text>

          {!isPremium && (
            <View style={styles.premiumBanner}>
              <Text style={styles.premiumBannerText}>
                Read posts for free. Upgrade to Premium to post and reply.
              </Text>
              <TouchableOpacity style={styles.premiumBannerBtn} activeOpacity={0.8}>
                <Text style={styles.premiumBannerBtnText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Choose a Topic</Text>
          <View style={styles.topicGrid}>
            {TOPICS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={styles.topicCard}
                onPress={() => openTopic(t.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.topicIcon}>{t.icon}</Text>
                <Text style={styles.topicTitle}>{t.id}</Text>
                <Text style={styles.topicDesc} numberOfLines={2}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>Community Rules</Text>
            <Text style={styles.rulesItem}>• SAT-related content only</Text>
            <Text style={styles.rulesItem}>• No verbatim copyrighted test questions</Text>
            <Text style={styles.rulesItem}>• All posts reviewed before publishing</Text>
            <Text style={styles.rulesItem}>• Keep it respectful and helpful</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ─── Screen: Post List ────────────────────────────────────────────────────

  if (screen === 'postList') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Topics</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{activeTopic}</Text>
          {isPremium && (
            <TouchableOpacity onPress={openNewPost} style={styles.newPostBtn}>
              <Text style={styles.newPostBtnText}>+ Post</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingPosts ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyDesc}>
              {isPremium
                ? 'Be the first to start a discussion in this topic!'
                : 'No discussions here yet. Upgrade to Premium to post first.'}
            </Text>
            {isPremium && (
              <TouchableOpacity style={styles.ctaBtn} onPress={openNewPost} activeOpacity={0.8}>
                <Text style={styles.ctaBtnText}>Start a Discussion</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={p => p.id}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.postRow}
                onPress={() => openPost(item.id)}
                activeOpacity={0.75}
              >
                <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.postBody} numberOfLines={2}>{item.body}</Text>
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{item.authorName}</Text>
                  <Text style={styles.postDot}>·</Text>
                  <Text style={styles.postTime}>{timeAgo(item.createdAt)}</Text>
                  <View style={styles.postReplies}>
                    <Text style={styles.postRepliesText}>💬 {item.replyCount}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              !isPremium ? (
                <View style={styles.upgradeCTA}>
                  <Text style={styles.upgradeCTAText}>Upgrade to Premium to join the conversation</Text>
                  <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.8}>
                    <Text style={styles.ctaBtnText}>Upgrade to Participate</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    )
  }

  // ─── Screen: Post Detail ──────────────────────────────────────────────────

  if (screen === 'postDetail') {
    if (loadingDetail || !postDetail) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{activeTopic}</Text>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        </SafeAreaView>
      )
    }

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{postDetail.topic}</Text>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView contentContainerStyle={styles.detailContainer}>
            {/* Post */}
            <View style={styles.detailPost}>
              <Text style={styles.detailTitle}>{postDetail.title}</Text>
              <View style={styles.postMeta}>
                <Text style={styles.postAuthor}>{postDetail.authorName}</Text>
                <Text style={styles.postDot}>·</Text>
                <Text style={styles.postTime}>{timeAgo(postDetail.createdAt)}</Text>
              </View>
              <Text style={styles.detailBody}>{postDetail.body}</Text>
            </View>

            {/* Replies */}
            {postDetail.replies.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  {postDetail.replies.length} {postDetail.replies.length === 1 ? 'Reply' : 'Replies'}
                </Text>
                {postDetail.replies.map(reply => (
                  <View key={reply.id} style={styles.replyCard}>
                    <View style={styles.replyHeader}>
                      <Text style={styles.replyAuthor}>{reply.authorName}</Text>
                      <Text style={styles.replyTime}>{timeAgo(reply.createdAt)}</Text>
                    </View>
                    <Text style={styles.replyBody}>{reply.body}</Text>
                  </View>
                ))}
              </>
            )}

            {postDetail.replies.length === 0 && (
              <View style={styles.noReplies}>
                <Text style={styles.noRepliesText}>No replies yet. Be the first to respond!</Text>
              </View>
            )}

            {/* Reply input (premium) or upgrade CTA (free) */}
            {isPremium ? (
              <View style={styles.replyInputCard}>
                <Text style={styles.replyInputLabel}>Add a Reply</Text>
                <TextInput
                  style={styles.replyInput}
                  value={replyBody}
                  onChangeText={setReplyBody}
                  placeholder="Share your thoughts or answer..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.charCount}>{replyBody.length}/1000</Text>
                <TouchableOpacity
                  style={[styles.submitBtn, (submitting || replyBody.trim().length < 5) && styles.submitBtnDisabled]}
                  onPress={submitReply}
                  disabled={submitting || replyBody.trim().length < 5}
                  activeOpacity={0.8}
                >
                  {submitting
                    ? <ActivityIndicator color={Colors.bg} />
                    : <Text style={styles.submitBtnText}>Submit Reply</Text>
                  }
                </TouchableOpacity>
                <Text style={styles.reviewNote}>Replies are reviewed before publishing</Text>
              </View>
            ) : (
              <View style={styles.upgradeCTA}>
                <Text style={styles.upgradeCTAText}>
                  Upgrade to Premium to join the conversation and reply to posts.
                </Text>
                <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.8}>
                  <Text style={styles.ctaBtnText}>Upgrade to Participate</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ─── Screen: New Post Form ────────────────────────────────────────────────

  if (screen === 'newPost') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <View style={styles.headerRight} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
            {/* Topic selector */}
            <Text style={styles.fieldLabel}>Topic</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicPicker}>
              {TOPICS.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.topicChip, newTopic === t.id && styles.topicChipActive]}
                  onPress={() => setNewTopic(t.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.topicChipText, newTopic === t.id && styles.topicChipTextActive]}>
                    {t.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title */}
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. How do I approach systems of equations?"
              placeholderTextColor={Colors.textSecondary}
              maxLength={120}
              returnKeyType="next"
            />
            <Text style={styles.charCount}>{newTitle.length}/120</Text>

            {/* Body */}
            <Text style={styles.fieldLabel}>Body</Text>
            <TextInput
              style={styles.bodyInput}
              value={newBody}
              onChangeText={setNewBody}
              placeholder="Describe your question or share your strategy in detail..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.charCount}>{newBody.length}/2000</Text>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (submitting || !newTitle.trim() || !newBody.trim() || !newTopic) && styles.submitBtnDisabled,
              ]}
              onPress={submitPost}
              disabled={submitting || !newTitle.trim() || !newBody.trim() || !newTopic}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color={Colors.bg} />
                : <Text style={styles.submitBtnText}>Submit for Review</Text>
              }
            </TouchableOpacity>
            <Text style={styles.reviewNote}>
              Posts are reviewed by AI before publishing to ensure they're SAT-related.
              Approved posts appear in the forum immediately.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return null
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  container: { padding: 20, paddingBottom: 48 },

  // Page header
  pageTitle: {
    fontSize: 24, fontWeight: '800', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13, color: Colors.textSecondary,
    textAlign: 'center', marginBottom: 20,
  },

  // Nav header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { minWidth: 72 },
  backBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  headerTitle: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  headerRight: { minWidth: 72 },
  newPostBtn: { minWidth: 72, alignItems: 'flex-end' },
  newPostBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  // Premium banner
  premiumBanner: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.primary + '40',
    marginBottom: 20, gap: 10,
  },
  premiumBannerText: { color: Colors.textPrimary, fontSize: 13, lineHeight: 19 },
  premiumBannerBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  premiumBannerBtnText: { color: Colors.bg, fontSize: 14, fontWeight: '700' },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: Colors.textPrimary,
    marginBottom: 12,
  },

  // Topic grid
  topicGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  topicCard: {
    width: '47%',
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  topicIcon: { fontSize: 24, marginBottom: 8 },
  topicTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  topicDesc: { fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },

  // Rules card
  rulesCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  rulesTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  rulesItem: { fontSize: 13, color: Colors.textSecondary, lineHeight: 24 },

  // Post list
  listContainer: { padding: 16, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  postRow: {
    paddingVertical: 14, paddingHorizontal: 4,
  },
  postTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  postBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postAuthor: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  postDot: { color: Colors.textSecondary, fontSize: 12 },
  postTime: { fontSize: 12, color: Colors.textSecondary },
  postReplies: { marginLeft: 'auto' },
  postRepliesText: { fontSize: 12, color: Colors.textSecondary },

  // Empty state
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },

  // Upgrade CTA
  upgradeCTA: {
    margin: 16, padding: 20,
    backgroundColor: Colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', gap: 14,
  },
  upgradeCTAText: {
    color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 21,
  },
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center',
  },
  ctaBtnText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },

  // Post detail
  detailContainer: { padding: 16, paddingBottom: 48 },
  detailPost: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  detailTitle: {
    fontSize: 18, fontWeight: '800', color: Colors.textPrimary,
    marginBottom: 10, lineHeight: 26,
  },
  detailBody: {
    fontSize: 15, color: Colors.textPrimary, lineHeight: 24, marginTop: 12,
  },

  // Replies
  replyCard: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  replyHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  replyAuthor: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  replyTime: { fontSize: 11, color: Colors.textSecondary },
  replyBody: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21 },

  noReplies: {
    padding: 20, alignItems: 'center', marginBottom: 8,
  },
  noRepliesText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  // Reply input
  replyInputCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginTop: 8,
  },
  replyInputLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  replyInput: {
    backgroundColor: Colors.bg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.textPrimary, fontSize: 14, lineHeight: 21,
    minHeight: 90,
  },

  // Form (new post)
  formContainer: { padding: 16, paddingBottom: 48 },
  fieldLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.textPrimary,
    marginBottom: 8, marginTop: 16,
  },
  topicPicker: { marginBottom: 4 },
  topicChip: {
    backgroundColor: Colors.card, borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.border,
    marginRight: 8,
  },
  topicChipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary },
  topicChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  topicChipTextActive: { color: Colors.primary, fontWeight: '700' },
  titleInput: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.textPrimary, fontSize: 15,
  },
  bodyInput: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.textPrimary, fontSize: 14, lineHeight: 21,
    minHeight: 130,
  },
  charCount: {
    fontSize: 11, color: Colors.textSecondary,
    textAlign: 'right', marginTop: 4, marginBottom: 2,
  },

  // Submit
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  reviewNote: {
    fontSize: 12, color: Colors.textSecondary,
    textAlign: 'center', marginTop: 10, lineHeight: 18,
  },
})
