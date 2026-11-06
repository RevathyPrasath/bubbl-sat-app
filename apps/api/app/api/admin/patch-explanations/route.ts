import { createSupabaseAdminClient } from '@/lib/supabase'

const SEED_SECRET = process.env.SEED_SECRET ?? 'bubbl-dev-seed'

// Source-of-truth explanations keyed by question stem snippet (first 40 chars)
const explanationMap: Record<string, { explanation: string; trap_choice?: string; strategy?: string }> = {
  'If 3x + 9 = 24': { explanation: 'Subtract 9: 3x = 15. Divide by 3: x = 5.', trap_choice: 'A', strategy: 'Isolate x step by step. Do not divide before subtracting.' },
  'A store sells notebooks': { explanation: 'n + p = 10 and 3n + 1.5p = 22.50. Substituting p = 10−n gives 1.5n = 7.50, so n = 5.', trap_choice: 'D', strategy: 'Set up two equations — one for count, one for cost.' },
  '2x + 3y = 12 and 4x − 3y': { explanation: 'Add the equations: 6x = 18, so x = 3.', trap_choice: 'B', strategy: 'When y-coefficients are opposites, add the equations directly.' },
  'For what value of k does 2x': { explanation: 'Multiply first equation by 3: 6x + 3ky = 24. Match 6x + 9y = 24: 3k = 9, k = 3.', trap_choice: 'D', strategy: 'Multiply one equation to match the other leading coefficient.' },
  'What are the solutions to |2x': { explanation: 'Case 1: 2x − 4 = 10 → x = 7. Case 2: 2x − 4 = −10 → x = −3.', trap_choice: 'A', strategy: 'Always solve both the positive and negative cases.' },
  'What are the solutions to x²': { explanation: 'Factor: (x − 2)(x − 3) = 0 → x = 2 or x = 3.', trap_choice: 'C', strategy: 'Find two numbers that multiply to +6 and add to −5.' },
  'A bacterial population doubles': { explanation: 'The doubling period is 3 hours, so the exponent is t/3. At t=3: 500·2=1000 ✓.', trap_choice: 'A', strategy: 'The doubling period goes in the denominator. Test t=3 to verify.' },
  'If y = x² and y = x + 6': { explanation: 'x² = x + 6 → x² − x − 6 = 0 → (x−3)(x+2) = 0 → x = 3 or −2.', trap_choice: 'B', strategy: 'Set equal, rearrange to standard form, then factor.' },
  'A line of best fit passes': { explanation: 'Slope = (9−4)/(5−0) = 5/5 = 1.', trap_choice: 'C', strategy: 'Use rise/run with two clear points. Do not estimate visually.' },
  'A data set has mean 20': { explanation: 'Sum = 100. New sum = 150. New mean = 150/6 = 25.', trap_choice: 'D', strategy: 'Compute original sum, add the new value, divide by new count.' },
  'A bag has 4 red, 5 blue': { explanation: 'Not blue = 7. Total = 12. P = 7/12.', trap_choice: 'A', strategy: 'P(not blue) = 1 − P(blue) = 1 − 5/12 = 7/12.' },
  'Store A is 80% of Store B': { explanation: 'B = 1.25 × 200,000 = 250,000. A = 0.80 × 250,000 = 200,000.', trap_choice: 'A', strategy: 'Work step by step from the known value.' },
  'In a right triangle, sin(θ)': { explanation: 'Opposite=3, hypotenuse=5. Adjacent=√(25−9)=4. cos(θ)=4/5.', trap_choice: 'A', strategy: 'Draw the triangle and apply Pythagorean theorem to find the missing side.' },
  'What is the center and radius': { explanation: '(x−h)²+(y−k)²=r². h=3, k=−2, r=5.', trap_choice: 'B', strategy: 'The center uses opposite signs. (x−3) means center x = +3.' },
  'A rectangle has length (x+2)': { explanation: '(x+2)(x−1)=18 → x²+x−20=0 → (x+5)(x−4)=0 → x=4. Verify: 6×3=18 ✓.', trap_choice: 'A', strategy: 'Expand, set equal to area, solve quadratic, verify.' },
  'In the right triangle shown': { explanation: 'Use the Pythagorean theorem: a² + b² = c². So 9² + 12² = 81 + 144 = 225. The hypotenuse = √225 = 15.', trap_choice: 'B', strategy: 'Memorize the 3-4-5 Pythagorean triple and its multiples. 9-12-15 is 3×(3-4-5).' },
  "Which word most logically comp": { explanation: "'Accessible' fits — non-specialists could understand. Complex/theoretical hinder understanding. Ambiguous means unclear.", trap_choice: 'B', strategy: "'Even non-specialists could understand' signals the blank means easy to grasp." },
  'Although praised for her measu': { explanation: "'Radical' matches 'so extreme they would have shocked.' Strong is vague, unpopular lacks extremity, personal is irrelevant.", trap_choice: 'A', strategy: "'So extreme they would have shocked' signals the word must mean radical departure from the norm." },
  'What is the primary purpose of': { explanation: 'The passage defines the phenomenon and lists interventions without advocating for any.', trap_choice: 'C', strategy: 'Structure is define + list solutions. Not a cost comparison.' },
  'Which choice best states the m': { explanation: 'The passage covers both the distance and the navigation mechanism. A is too narrow, C contradicts "still investigating", D is one detail.', trap_choice: 'A', strategy: 'The main idea must cover the whole passage.' },
  'Which quote best supports the': { explanation: 'B directly states the press was decisive. C weakens the claim. A sets up the debate. D is structural.', trap_choice: 'A', strategy: 'Find the quote that most directly supports the claim, not one that introduces debate.' },
  'Which claim is best supported': { explanation: 'White light=22 cm, highest of the three. A and D overstate — blue produced 14 cm. C contradicts data (red 18 < white 22).', trap_choice: 'C', strategy: 'Stay within what the data shows. Reject extremes and contradictions.' },
  'Which verb form is most approp': { explanation: '"Last summer" signals a completed past event — simple past "discovered" is correct.', trap_choice: 'A', strategy: 'Time markers like "last summer" always require simple past tense.' },
  'At the center of the controver': { explanation: '"Three separate allegations" is the true subject (plural) — use "are". The prepositional phrase is not the subject.', trap_choice: 'A', strategy: 'Identify the real subject after the verb in inverted sentences. "Allegations" is plural.' },
  'The merger was approved by sha': { explanation: 'A semicolon joins two independent clauses correctly. A comma alone (D) is a comma splice.', trap_choice: 'D', strategy: 'A comma alone cannot join independent clauses. Use a semicolon or comma + conjunction.' },
  'Having studied marine biology': { explanation: 'The participial phrase must be immediately followed by "the research team" — the noun it modifies.', trap_choice: 'C', strategy: 'The noun right after the opening phrase is what the phrase modifies.' },
  'The novel sold millions of cop': { explanation: 'A semicolon joins two independent clauses. A comma alone is a comma splice. A colon introduces, not contrasts.', trap_choice: 'A', strategy: 'When "however" signals contrast between two complete sentences, use a semicolon.' },
  'Regular exercise improves card': { explanation: '"Furthermore" signals addition — the second sentence adds another benefit. However/In contrast signal contradiction. Therefore signals a result.', trap_choice: 'B', strategy: 'Identify the relationship (addition/contrast/result), then match the transition.' },
  'The report was brief and short': { explanation: '"Brief" already means short in length. All other choices add redundant words.', trap_choice: 'A', strategy: 'For concision questions, the shortest answer that preserves meaning wins.' },
  'A researcher argues sleep depr': { explanation: 'C uses the specific data point (35%) and connects it to the claim. A is vague, B is imprecise, D is descriptive only.', trap_choice: 'B', strategy: 'Research synthesis needs the specific data point + the claim it supports.' },
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== SEED_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()

  // Fetch all questions
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, stem, explanation')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const updated: string[] = []
  const skipped: string[] = []
  const noMatch: string[] = []

  for (const q of questions ?? []) {
    // Find matching entry by first 32 chars of stem
    const prefix = q.stem.slice(0, 32)
    const matchKey = Object.keys(explanationMap).find(k => q.stem.startsWith(k))

    if (!matchKey) {
      noMatch.push(`${q.id}: ${prefix}`)
      continue
    }

    const patch = explanationMap[matchKey]

    // Skip if explanation already looks complete (>30 chars)
    if (q.explanation && q.explanation.length > 30) {
      skipped.push(q.id)
      continue
    }

    const { error: updateErr } = await supabase
      .from('questions')
      .update(patch)
      .eq('id', q.id)

    if (updateErr) {
      return Response.json({ error: updateErr.message, questionId: q.id }, { status: 500 })
    }
    updated.push(q.id)
  }

  return Response.json({ updated: updated.length, skipped: skipped.length, noMatch, updatedIds: updated })
}
