import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'
import { createSupabaseClient, createSupabaseUserClient } from '@/lib/supabase'

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'PSDA', 'Geometry']
const ENGLISH_DOMAINS = ['Craft & Structure', 'Information & Ideas', 'SEC', 'Expression of Ideas']
const ALL_DOMAINS = [...MATH_DOMAINS, ...ENGLISH_DOMAINS]

function abilityToPercent(ability: number): number {
  return Math.round(((ability - 200) / 600) * 100)
}

// GET — fast, no AI, reads directly from domain_ability
export async function GET(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  const token = req.headers.get('Authorization')!.slice(7)
  const supabase = createSupabaseUserClient(token)

  const { data: abilityRows } = await supabase
    .from('domain_ability')
    .select('domain, ability')
    .eq('user_id', user.id)

  const abilityMap: Record<string, number> = {}
  for (const d of ALL_DOMAINS) abilityMap[d] = 500
  for (const r of abilityRows ?? []) abilityMap[r.domain] = r.ability

  // Estimated score: average ability mapped to 1600 scale
  const mathAvg = MATH_DOMAINS.reduce((s, d) => s + abilityMap[d], 0) / MATH_DOMAINS.length
  const engAvg = ENGLISH_DOMAINS.reduce((s, d) => s + abilityMap[d], 0) / ENGLISH_DOMAINS.length
  const mathSection = Math.round(((mathAvg - 200) / 600) * 800)
  const engSection = Math.round(((engAvg - 200) / 600) * 800)
  const estimatedScoreMin = Math.max(400, Math.min(1600, mathSection + engSection - 40))
  const estimatedScoreMax = Math.min(1600, estimatedScoreMin + 80)

  const domains = ALL_DOMAINS.map(d => ({
    domain: d,
    ability: abilityMap[d],
    subject: MATH_DOMAINS.includes(d) ? 'math' : 'english',
  }))

  const topGaps = [...domains]
    .sort((a, b) => a.ability - b.ability)
    .slice(0, 3)
    .map(d => ({
      domain: d.domain,
      ability: d.ability,
      reason: `Ability score ${d.ability} — needs focused practice`,
    }))

  const lowestDomain = topGaps[0]
  const recommendation = lowestDomain
    ? { subject: MATH_DOMAINS.includes(lowestDomain.domain) ? 'Math' : 'English', domain: lowestDomain.domain, reason: `Your weakest area right now` }
    : null

  const mathPercent = abilityToPercent(mathAvg)
  const englishPercent = abilityToPercent(engAvg)

  return Response.json({
    estimatedScoreMin,
    estimatedScoreMax,
    mathPercent,
    englishPercent,
    domains,
    topGaps,
    recommendation,
    encouragement: 'Keep practising — every question makes you sharper.',
  })
}

interface GapAnalysisResponse {
  domain_scores: Record<string, number>
  estimated_score_low: number
  estimated_score_high: number
  top_gaps: Array<{ domain: string; score: number; insight: string }>
  recommended_next: string
  encouragement: string
}

export async function POST(req: Request) {
  let user: { id: string; email: string }
  try {
    user = await requireAuth(req)
  } catch (err) {
    return err as Response
  }

  let body: { lookbackPapers?: number }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const lookbackPapers = body.lookbackPapers ?? 3

  const supabase = createSupabaseClient()

  // Fetch recent attempts
  const { data: recentAttempts, error: attemptsError } = await supabase
    .from('attempts')
    .select('id, subject, total_questions, correct_count, score_pct, domain_results, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(lookbackPapers)

  if (attemptsError) {
    return Response.json({ error: 'Failed to fetch attempts' }, { status: 500 })
  }

  // Fetch domain abilities
  const { data: domainAbilities, error: abilityError } = await supabase
    .from('domain_ability')
    .select('domain, ability')
    .eq('user_id', user.id)

  if (abilityError) {
    return Response.json({ error: 'Failed to fetch ability data' }, { status: 500 })
  }

  const domainAbilityMap: Record<string, number> = {}
  for (const row of domainAbilities ?? []) {
    domainAbilityMap[row.domain] = row.ability
  }

  const prompt = `You are an SAT tutor for the Bubbl app analyzing a student's recent practice performance.

STUDENT PERFORMANCE (last ${lookbackPapers} papers):
${JSON.stringify(recentAttempts, null, 2)}

Domain ability scores (200-800 scale, 500=average):
${JSON.stringify(domainAbilityMap, null, 2)}

Analyze this data and return ONLY valid JSON in this exact format:
{
  "domain_scores": {
    "Algebra": <0-100>,
    "Advanced Math": <0-100>,
    "PSDA": <0-100>,
    "Geometry": <0-100>,
    "Craft & Structure": <0-100>,
    "Information & Ideas": <0-100>,
    "SEC": <0-100>,
    "Expression": <0-100>
  },
  "estimated_score_low": <400-1600>,
  "estimated_score_high": <400-1600>,
  "top_gaps": [
    {
      "domain": "<domain name>",
      "score": <0-100>,
      "insight": "<specific, actionable, 1-2 sentences — name the exact skill failing, not just the domain>"
    }
  ],
  "recommended_next": "<exact focus keyword: 'math psda' | 'english vocab' | 'math geometry' | 'english sec' | 'english synthesis'>",
  "encouragement": "<one sentence, specific and genuine — reference actual improvement or a specific strength you see>"
}

Rules:
- top_gaps: list only the 2-3 lowest-scoring domains
- insight must name the specific skill code failing, not just "needs more practice"
- estimated_score: map domain_scores to SAT scale (each domain = 200 pts of the 1600 total)
- Return JSON only, no preamble`

  let parsed: GapAnalysisResponse
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'No text response from Claude' }, { status: 503 })
    }

    const rawText = textBlock.text.trim()
    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    parsed = JSON.parse(jsonText)
  } catch (err) {
    console.error('Claude API error:', err)
    return Response.json({ error: 'Gap analysis service unavailable' }, { status: 503 })
  }

  // Update gap_profile
  await supabase
    .from('gap_profile')
    .upsert(
      {
        user_id: user.id,
        domain_scores: parsed.domain_scores,
        estimated_score_low: parsed.estimated_score_low,
        estimated_score_high: parsed.estimated_score_high,
        top_gaps: parsed.top_gaps,
        recommended_next: parsed.recommended_next,
        encouragement: parsed.encouragement,
        papers_since_update: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  return Response.json({
    domainScores: parsed.domain_scores,
    estimatedScoreLow: parsed.estimated_score_low,
    estimatedScoreHigh: parsed.estimated_score_high,
    topGaps: parsed.top_gaps,
    recommendedNext: parsed.recommended_next,
    encouragement: parsed.encouragement,
  })
}
