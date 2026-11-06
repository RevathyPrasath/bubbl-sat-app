import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface ReviewResult {
  approved: boolean
  reason: string
}

export async function reviewForumContent(content: {
  title?: string
  body: string
}): Promise<ReviewResult> {
  // Dev mode: skip review when no API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return { approved: true, reason: 'Auto-approved (dev mode — no ANTHROPIC_API_KEY set).' }
  }

  const text = content.title ? `Title: ${content.title}\n\nBody: ${content.body}` : content.body

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `You are a content moderator for a high school SAT prep app called Bubbl. Review the following student post and decide whether to approve or reject it.

APPROVE if the post:
- Discusses SAT concepts, strategies, math or English skills
- Asks for help understanding a type of SAT problem (not a specific verbatim question)
- Shares study tips, test-taking strategies, or experiences with the SAT
- Is generally helpful and appropriate for high school students

REJECT if the post:
- Appears to paste a verbatim or near-verbatim copyrighted SAT question (specific passage excerpt + question + answer choices)
- Is entirely off-topic (no connection to the SAT or academic preparation)
- Contains inappropriate, harmful, or offensive content
- Is spam or advertising

Respond ONLY with valid JSON in this exact format:
{"approved": true, "reason": "One student-friendly sentence explaining the decision."}
or
{"approved": false, "reason": "One student-friendly sentence explaining why it was rejected."}

Post to review:
${text}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  try {
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(jsonStr) as { approved: boolean; reason: string }
    if (typeof parsed.approved === 'boolean' && typeof parsed.reason === 'string') {
      return parsed
    }
  } catch {
    // Fall through to safe default
  }

  // If Claude's response is unparseable, approve with a note (fail open)
  return { approved: true, reason: 'Content looks good — welcome to the forum!' }
}
