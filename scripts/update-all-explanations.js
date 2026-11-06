const SUPABASE_URL = 'https://hdvyfeolbxgepneavuiv.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkdnlmZW9sYnhnZXBuZWF2dWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzIzODQ0MiwiZXhwIjoyMTA4ODE0NDQyfQ.sFN5XeS65w5n3zrtji762VrSNfFhoW7O-KN4MiVhqxU'
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

const updates = [

  // ── ENGLISH: Craft & Structure ─────────────────────────────────────────────
  {
    id: '0c610e12-dfb9-49f5-89af-e33b83c34dd6',
    explanation: `Concept: Vocabulary in Context — pick the word whose meaning best fits what the sentence is saying, not just any word that sounds academic.

Step 1 — Read the clue in the sentence. The key phrase is "even non-specialists could understand." This tells us the findings were easy to understand, not complicated.

Step 2 — Match the clue to a word. "Accessible" means easy to understand or approach — it fits perfectly.

Step 3 — Eliminate the wrong answers:
• "Complex" — means complicated. This would make non-specialists unable to understand, which is the opposite of what the sentence says.
• "Theoretical" — means abstract or based on theory, which does not explain why non-specialists could understand.
• "Ambiguous" — means unclear or having multiple meanings. Again, unclear findings would confuse non-specialists, not help them.

Key strategy: On vocabulary-in-context questions, always find the word or phrase in the sentence that tells you what the blank should mean. Let the text itself give you the answer.`,
  },
  {
    id: '1069f02f-5fd5-4a1e-b50c-fbc9d5421481',
    explanation: `Concept: Vocabulary in Context (Hard) — the correct word must be precise, not just vaguely correct.

Step 1 — Find the clue. The sentence says the views were "so extreme they would have shocked her admirers." The blank needs a word that means extreme.

Step 2 — Evaluate "radical." Radical means holding extreme or drastic views, especially on political or social matters. It perfectly captures "so extreme they would shock."

Step 3 — Why the others are wrong:
• "Strong" — vague. Strong opinions are not necessarily shocking or extreme. A person can hold strong views that are completely mainstream.
• "Unpopular" — means others disagree with her views. But unpopular views do not necessarily shock people — they might just be minority opinions.
• "Personal" — means private. But the sentence already implies the views were private ("privately held"), and "personal" adds no information about the nature of the views.

Key strategy: On hard vocabulary questions, two or three choices will be partially correct. The correct answer must match the text precisely — here, the word "extreme" in the sentence is the direct signal for "radical."`,
  },
  {
    id: 'dd237b9a-3d84-48a3-b377-39d6bff3a23a',
    explanation: `Concept: Text Structure — understanding the overall purpose of a passage, not just what it says.

Step 1 — Summarize what the passage actually does. Sentence 1 defines urban heat islands (cities are hotter than rural areas). Sentence 2 lists three possible solutions and notes they have different costs.

Step 2 — Match this to the answer choices. The passage does two things: explains the phenomenon and introduces potential solutions. Choice B captures both of these.

Step 3 — Eliminate the wrong answers:
• A — "To argue green roofs are the most effective solution." The passage lists three solutions equally and does not argue that any one is best.
• C — "To compare costs of cooling strategies." The passage only mentions that costs vary — it does not compare them or rank them.
• D — "To persuade planners to adopt reflective road surfaces." The passage does not advocate for any specific solution.

Key strategy: "Primary purpose" questions ask what the whole passage is doing, not just one detail. Look for the answer that covers everything the passage addresses without going beyond what is actually said.`,
  },

  // ── ENGLISH: Expression of Ideas ──────────────────────────────────────────
  {
    id: '50430f48-086c-437a-b71b-81820b8cd282',
    explanation: `Concept: Transitions — choosing the word that correctly signals the logical relationship between two sentences.

Step 1 — Understand what the two sentences are doing. Sentence 1: exercise improves cardiovascular health. Sentence 2: it also enhances mood and reduces anxiety.

Step 2 — Identify the relationship. Both sentences are saying positive things about exercise. The second adds another benefit — this is an addition relationship.

Step 3 — Match the relationship to the transition:
• "Furthermore" signals addition — it says "here is another related point." This is correct.
• "However" signals contrast or a surprising opposite — not appropriate here since both sentences agree.
• "Therefore" signals a conclusion or result — the second sentence is not a result of the first; it is a separate benefit.
• "In contrast" signals opposition — these sentences are not opposites.

Memory trick for transitions:
• Adding information → Furthermore, Additionally, Moreover, Also
• Contrasting → However, Nevertheless, On the other hand
• Showing a result → Therefore, Thus, As a result`,
  },
  {
    id: 'b526cd2f-d93e-4d09-943e-9e34600f3d06',
    explanation: `Concept: Concision — on the SAT, shorter is better when longer choices repeat the same information.

Step 1 — Identify what "brief" already means. "Brief" means short. It already contains the idea of being short in length and to the point.

Step 2 — Look at each choice for redundancy:
• A: "brief and concise in nature" — "concise" is a synonym for brief, so this repeats the same idea twice. "In nature" adds nothing.
• B: "brief" — this stands alone with no repetition. It is the correct answer.
• C: "short and to the point" — "short" and "to the point" both mean the same thing as brief. Two redundant words.
• D: "brief, short, and concise" — three words that all mean the same thing.

Key rule: When a sentence already has a word that carries a meaning, do not use another word that carries the exact same meaning. "Brief" alone does the job of all the others.`,
  },
  {
    id: 'a7696d80-eac4-4008-b6e7-2f3fa6bce26b',
    explanation: `Concept: Research Synthesis — the best introductory sentence uses specific evidence from the study and connects it directly to the argument being made.

Step 1 — Understand what a strong introductory sentence needs. It must (1) include a specific data point from the research, and (2) clearly connect that data to the researcher's argument about cognitive performance.

Step 2 — Evaluate each choice:
• A: "Sleep is important for students who want to perform well." — Vague and general. Contains no data from the study.
• B: "A study of 200 students found various differences based on sleep habits." — Mentions the study but "various differences" is imprecise and does not reference the key finding.
• C: "Students sleeping under 6 hours scored 35% lower on memory tests, suggesting sleep deprivation substantially harms cognitive function." — Uses the exact data point (35% lower) and connects it to the claim. This is correct.
• D: "The researcher studied sleep and memory in college students." — Only describes the study; does not introduce the argument or the evidence.

Key strategy: The best synthesis sentence is specific (uses numbers or direct quotes from the data) and interpretive (explains what the data means for the argument).`,
  },

  // ── ENGLISH: Information & Ideas ──────────────────────────────────────────
  {
    id: '4e89ee1d-2f18-49a1-accd-280be3d3c56f',
    explanation: `Concept: Main Idea — the correct answer covers everything the passage discusses, without being too broad or too narrow.

Step 1 — List what the passage covers. (1) Monarchs travel up to 3,000 miles. (2) They navigate using the sun's position and Earth's magnetic field. (3) Scientists are still investigating how this works.

Step 2 — Find the answer that captures all of this. Choice B — "Monarchs travel remarkable distances using sophisticated navigation" — covers both the long-distance travel and the complex navigation mechanism.

Step 3 — Eliminate:
• A: "Monarchs use Earth's magnetic field exclusively." The passage says they also use the sun's position, so "exclusively" is incorrect.
• C: "Scientists have fully explained monarch navigation." Wrong — the passage says scientists are still investigating, meaning they have not fully explained it.
• D: "Monarchs overwinter only in Mexico." This is just one detail from the passage, not the main idea of the whole text.

Key strategy: The main idea answer will always be broad enough to cover everything in the passage but not so broad that it adds claims the passage never makes.`,
  },
  {
    id: '14ed952f-4d0f-4d8d-85f0-572753ce5526',
    explanation: `Concept: Textual Evidence — finding which quote from the passage best supports a specific claim.

Step 1 — Be clear about what the claim is. The claim: "the press played a decisive role" in the Reformation.

Step 2 — Find the quote that directly supports this. Choice B — "without movable type, Luther's 95 Theses would never have spread across Europe within weeks" — directly argues the press was decisive. Without the press, the Theses would not have spread, meaning the press was essential.

Step 3 — Eliminate the others:
• A: "Historians debate whether the printing press caused the Reformation" — this sets up a debate but takes no side. It does not support the claim.
• C: "religious discontent had been building for decades before Gutenberg" — this actually weakens the claim by suggesting the Reformation would have happened anyway without the press.
• D: "Some argue... Others contend..." — this is a structural description of the passage, not evidence for the claim.

Key strategy: The correct quote will contain language that directly asserts or implies the claim. A quote that describes a debate, weakens the claim, or is neutral does not count as support.`,
  },
  {
    id: 'edd304f9-06b3-4741-a491-b25b80515dce',
    explanation: `Concept: Quantitative Evidence — reading data carefully and only choosing claims the numbers actually support.

Step 1 — Read the data carefully. Red light: 18 cm. Blue light: 14 cm. White light: 22 cm.

Step 2 — Evaluate each claim against the data:
• A: "Blue light inhibits all plant growth." — False. Blue light produced 14 cm of growth, which is positive growth. "Inhibits all growth" would mean 0 cm or negative.
• B: "White light produces the greatest average growth among conditions tested." — True. 22 cm is higher than 18 cm and 14 cm. "Among conditions tested" is an important qualifier — we're not claiming white light is best in the universe, just among these three. This is correct.
• C: "Red light is more effective than white light." — False. Red = 18 cm, White = 22 cm. White is higher.
• D: "Plants cannot survive under blue light." — False. 14 cm of growth means the plants are clearly surviving and growing.

Key strategy: Always check that your answer matches the data exactly. Watch for absolute words like "all," "only," "cannot" — these are almost always too extreme.`,
  },

  // ── ENGLISH: Standard English Conventions ─────────────────────────────────
  {
    id: '36cdb48c-9ab5-4a8f-ae98-0359f7a515cc',
    explanation: `Concept: Verb Tense — the correct verb tense must match the time signal in the sentence.

Step 1 — Find the time signal. "Last summer" tells you the action happened in the past and is now complete.

Step 2 — Match the tense. A completed past action takes the simple past tense. "Discovered" is the simple past of "discover."

Step 3 — Eliminate the wrong tenses:
• "Discovers" — simple present tense. Only correct for actions happening right now or always true (e.g., "Water freezes at 0°C"). Last summer is over, so present tense is wrong.
• "Will discover" — future tense. This would mean the discovery happens after now, but "last summer" is already in the past.
• "Is discovering" — present progressive. This describes an action happening right now and continuing. Not correct for a completed past event.

Memory tip: Time signals to know:
• "Last year / yesterday / in 2020" → simple past (discovered)
• "Since / for the past year" → present perfect (has discovered)
• "Next year / tomorrow" → future (will discover)`,
  },
  {
    id: '98bca66f-b9c5-4ef2-bc8b-6b00ad2b0fa9',
    explanation: `Concept: Punctuation — semicolons join two independent clauses (sentences that could each stand alone).

Step 1 — Identify the two parts. Part 1: "The novel sold millions of copies worldwide." Part 2: "critics, however, found its ending deeply unsatisfying." Each part is a complete sentence on its own.

Step 2 — Choose the correct punctuation to join them. A semicolon (;) is used to join two independent clauses without a coordinating conjunction (and, but, or, so). This is the correct choice.

Step 3 — Why the others are wrong:
• A: "worldwide, critics" — a comma alone joining two independent clauses is called a comma splice, which is a grammatical error.
• C: "worldwide: critics" — a colon is used to introduce a list, explanation, or quote. It would not be used to contrast two ideas this way.
• D: "worldwide critics" — no punctuation at all creates a run-on sentence, also a grammatical error.

Rule to memorise: You can always replace a semicolon with a period. If you could write two separate sentences, you can use a semicolon instead.`,
  },
  {
    id: '20514460-d307-4372-b4e0-d430beadc7d3',
    explanation: `Concept: Sentence Boundaries — fixing a run-on sentence where two independent clauses are incorrectly joined.

Step 1 — Identify the two independent clauses. Clause 1: "The merger was approved by shareholders." Clause 2: "the board announced a new expansion plan the following day." Both can stand alone as complete sentences.

Step 2 — Find a correct way to join them. You can use:
• A period (two separate sentences)
• A semicolon (;) — joining two independent clauses
• A comma + coordinating conjunction (and, but, so, yet, for, nor, or)

Step 3 — Evaluate the choices:
• A: "shareholders, and the board" — comma + "and" is a correct coordinating conjunction. This works.
• B: "shareholders the board" — no punctuation. This is a run-on sentence.
• C: "shareholders; the board" — semicolon joining two independent clauses. This is also correct. The question asks for the BEST correction, and C is the cleaner option since it does not change the logical relationship.
• D: "shareholders, the board" — comma alone is a comma splice (grammatical error).

The answer is C because a semicolon clearly and correctly joins two related independent clauses.`,
  },
  {
    id: 'dcba90ac-8036-4713-a0ae-05f0e677c2e1',
    explanation: `Concept: Subject-Verb Agreement in Inverted Sentences — when a sentence is inverted (verb before subject), you must find the real subject to decide singular or plural.

Step 1 — Find the real subject. The sentence starts with "At the center of the controversy" — this is a prepositional phrase describing where, not the subject. The real subject comes after the verb: "three separate allegations."

Step 2 — Determine singular or plural. "Three separate allegations" is plural (more than one allegation).

Step 3 — Choose the matching verb. Plural subject takes a plural verb: "are" (not "is").

Step 4 — Eliminate wrong choices:
• "Is" — singular verb. Incorrect because the subject is plural.
• "Were being" — past progressive and changes the meaning and tense unnecessarily.
• "Has been" — present perfect, singular. Incorrect for a plural subject and changes tense.

Common trap: Students see "controversy" (singular) near the blank and choose "is." But "controversy" is part of a prepositional phrase ("At the center of the controversy") and is never the subject. Always strip away the prepositional phrases to find the true subject.`,
  },
  {
    id: '17e057a2-044c-4222-b656-c25cb48f84e0',
    explanation: `Concept: Dangling Modifier — a participial phrase at the start of a sentence must immediately be followed by the noun it describes.

Step 1 — Identify the participial phrase. "Having studied marine biology for six years" — this phrase describes whoever did the studying.

Step 2 — Ask: who studied marine biology? The research team studied marine biology. So the research team must come immediately after the comma.

Step 3 — Evaluate the choices:
• A: "Having studied marine biology for six years, the research team finally mapped the coral reef." — The research team immediately follows the phrase. The modifier correctly refers to the research team. This is correct.
• B: "The coral reef was finally mapped, having studied marine biology for six years." — The coral reef comes after the phrase, implying the coral reef studied marine biology. That makes no sense.
• C: "The research team mapped the coral reef after six years, having studied marine biology." — The participial phrase is at the end and ambiguous. Moving it away from the noun it modifies creates confusion.
• D: "Having studied marine biology, finally the coral reef was mapped..." — Again, the coral reef appears to be the one who studied marine biology.

Rule to remember: Opening participial phrase → comma → the noun the phrase modifies. If the noun that follows the comma is not the one doing the action in the phrase, it is a dangling modifier.`,
  },

  // ── MATH: Algebra ─────────────────────────────────────────────────────────
  {
    id: 'bdb3836f-9caf-4d65-9970-6f76cc2d7914',
    explanation: `Concept: Solving a linear equation — use inverse operations to isolate the variable on one side.

The goal is to get x by itself. We undo each operation applied to x in reverse order.

Step 1 — Identify what is being done to x. x is multiplied by 3, and then 9 is added. So we reverse in the opposite order: first subtract 9, then divide by 3.

Step 2 — Subtract 9 from both sides. 3x + 9 − 9 = 24 − 9, which gives 3x = 15.

Step 3 — Divide both sides by 3. 3x ÷ 3 = 15 ÷ 3, which gives x = 5.

Step 4 — Check your answer. Substitute x = 5 back into the original equation: 3(5) + 9 = 15 + 9 = 24 ✓

Key principle: Whatever you do to one side of an equation, you must do to the other side. This keeps the equation balanced.`,
  },
  {
    id: 'bbb879df-b508-4654-8b87-3dfb7bf18e74',
    explanation: `Concept: Setting up a system of two equations from a word problem.

Step 1 — Define your variables. Let n = number of notebooks and p = number of pens.

Step 2 — Write the first equation (total items). Maya buys 10 items altogether: n + p = 10.

Step 3 — Write the second equation (total cost). Notebooks cost $3 each, pens cost $1.50 each, total spent is $22.50: 3n + 1.5p = 22.50.

Step 4 — Solve using substitution. From the first equation: p = 10 − n. Substitute into the second equation: 3n + 1.5(10 − n) = 22.50. Expand: 3n + 15 − 1.5n = 22.50. Combine like terms: 1.5n + 15 = 22.50. Subtract 15: 1.5n = 7.50. Divide by 1.5: n = 5.

Step 5 — Check. If n = 5, then p = 5. Cost = 3(5) + 1.5(5) = 15 + 7.50 = 22.50 ✓

Strategy tip: In any word problem with two unknowns, look for two facts the problem gives you — those become your two equations.`,
  },
  {
    id: 'cf1b370e-9df3-473c-a45f-1886c4975940',
    explanation: `Concept: Solving a system of equations by elimination — adding or subtracting the equations to cancel one variable.

The two equations are: 2x + 3y = 12 and 4x − 3y = 6.

Step 1 — Notice that the y-terms are +3y and −3y. If you add the two equations together, the y-terms will cancel each other out.

Step 2 — Add the equations. (2x + 3y) + (4x − 3y) = 12 + 6. This gives: 6x + 0y = 18, or simply 6x = 18.

Step 3 — Solve for x. Divide both sides by 6: x = 3.

Step 4 — Check by finding y. Substitute x = 3 into the first equation: 2(3) + 3y = 12 → 6 + 3y = 12 → 3y = 6 → y = 2. Check in second equation: 4(3) − 3(2) = 12 − 6 = 6 ✓

Key insight: Elimination works best when the coefficients of one variable are opposites (like +3y and −3y) or the same (then subtract). Always look for this pattern first before trying substitution.`,
  },
  {
    id: '2f129756-3d7a-4c7f-92e9-e08a1dfb0749',
    explanation: `Concept: Infinite solutions in a system — two equations have infinitely many solutions when they represent the exact same line.

Step 1 — Understand when infinite solutions occur. Two equations have infinitely many solutions when one equation is a multiple of the other (they are the same line written differently).

Step 2 — Multiply the first equation by 3 to match the x-coefficient of the second equation. 3 × (2x + ky = 8) gives 6x + 3ky = 24.

Step 3 — Compare with the second equation. The second equation is 6x + 9y = 24. For infinite solutions, every coefficient must match: 6x matches 6x ✓, and 24 matches 24 ✓. So 3k must equal 9.

Step 4 — Solve for k. 3k = 9, so k = 3.

Step 5 — Verify. With k = 3, the first equation becomes 2x + 3y = 8. Multiply by 3: 6x + 9y = 24 — which is identical to the second equation ✓

Key concept: No solution means parallel lines (same slope, different y-intercept). Infinite solutions means the same line (one equation is a scalar multiple of the other).`,
  },
  {
    id: 'c20da699-2a3b-418d-90c0-d46fa974c81b',
    explanation: `Concept: Absolute value equations — the expression inside the absolute value bars can be positive OR negative and still produce the same result.

Key rule: |A| = B means A = B OR A = −B. You must always solve both cases.

Step 1 — Set up the two cases. The equation is |2x − 4| = 10.
• Case 1: The expression inside equals +10: 2x − 4 = 10
• Case 2: The expression inside equals −10: 2x − 4 = −10

Step 2 — Solve Case 1. 2x − 4 = 10 → 2x = 14 → x = 7.

Step 3 — Solve Case 2. 2x − 4 = −10 → 2x = −6 → x = −3.

Step 4 — Check both answers. |2(7) − 4| = |14 − 4| = |10| = 10 ✓. |2(−3) − 4| = |−6 − 4| = |−10| = 10 ✓.

Common mistake: Students solve only one case and miss the second solution. Absolute value equations almost always have two solutions — always check both.`,
  },

  // ── MATH: Advanced Math ───────────────────────────────────────────────────
  {
    id: 'f6276b57-d4f7-421e-98c9-aca704e725ea',
    explanation: `Concept: Solving a quadratic equation by factoring — rewrite the quadratic as a product of two brackets, then find the values of x that make each bracket zero.

The equation is x² − 5x + 6 = 0.

Step 1 — Set up the factored form. We need two numbers that: (a) multiply to give +6 (the constant term), and (b) add to give −5 (the coefficient of x).

Step 2 — Find the pair. Think of factor pairs of 6: (1, 6), (2, 3). We need them to add to −5. Try −2 and −3: (−2) × (−3) = +6 ✓ and (−2) + (−3) = −5 ✓.

Step 3 — Write the factored form. x² − 5x + 6 = (x − 2)(x − 3) = 0.

Step 4 — Apply the zero product property. If (x − 2)(x − 3) = 0, then either x − 2 = 0 or x − 3 = 0. So x = 2 or x = 3.

Step 5 — Verify. 2² − 5(2) + 6 = 4 − 10 + 6 = 0 ✓. 3² − 5(3) + 6 = 9 − 15 + 6 = 0 ✓.

Tip: If factoring doesn't come easily, use the quadratic formula: x = (−b ± √(b² − 4ac)) / 2a with a = 1, b = −5, c = 6.`,
  },
  {
    id: 'ccfbeb75-0b6b-47d6-aa17-85f50ae38c6d',
    explanation: `Concept: Exponential growth models — building an equation for a quantity that multiplies by a fixed factor over a fixed time period.

The general formula is: Amount = Starting value × (growth factor)^(time ÷ period).

Step 1 — Identify the components from the problem. Starting value = 500. Growth factor = 2 (doubles). Period = 3 hours (doubles every 3 hours). Time = t hours.

Step 2 — Build the exponent. After every 3 hours, the population doubles once. After t hours, it has doubled t ÷ 3 times. So the exponent is t/3.

Step 3 — Write the complete expression. Population = 500 × 2^(t/3). This is Choice B.

Step 4 — Verify with a test value. At t = 3 (one full doubling period): 500 × 2^(3/3) = 500 × 2^1 = 1,000. That is double the starting population ✓. At t = 6: 500 × 2^(6/3) = 500 × 4 = 2,000 (doubled twice) ✓.

Why A is wrong: 500 × 2^t would mean the population doubles every 1 hour, not every 3 hours.`,
  },
  {
    id: 'b793b40a-f736-4eb9-8b4b-1030d4b6027e',
    explanation: `Concept: Solving a system of nonlinear equations — substitute one equation into the other to reduce to a single equation.

The two equations are: y = x² and y = x + 6.

Step 1 — Substitute. Since both expressions equal y, set them equal to each other: x² = x + 6.

Step 2 — Rearrange into standard quadratic form. Move everything to one side: x² − x − 6 = 0.

Step 3 — Factor. Find two numbers that multiply to −6 and add to −1: those are −3 and +2. So: (x − 3)(x + 2) = 0.

Step 4 — Solve. x − 3 = 0 gives x = 3. x + 2 = 0 gives x = −2.

Step 5 — Verify both solutions. For x = 3: y = 9 (from y = x²) and y = 3 + 6 = 9 ✓. For x = −2: y = 4 (from y = x²) and y = −2 + 6 = 4 ✓.

Key concept: Substitution is the most reliable method for nonlinear systems. Always rearrange into ax² + bx + c = 0 form before factoring.`,
  },

  // ── MATH: Geometry & Trig ─────────────────────────────────────────────────
  {
    id: '705fff69-5990-47a9-8f7e-7431fc45f452',
    explanation: `Concept: SOH-CAH-TOA — the three main trigonometric ratios for a right triangle.

• SOH: sin(θ) = Opposite ÷ Hypotenuse
• CAH: cos(θ) = Adjacent ÷ Hypotenuse
• TOA: tan(θ) = Opposite ÷ Adjacent

Step 1 — Use the given information. sin(θ) = 3/5, so the Opposite side = 3 and the Hypotenuse = 5.

Step 2 — Find the Adjacent side using the Pythagorean theorem. Opposite² + Adjacent² = Hypotenuse². So: 3² + Adjacent² = 5². That gives: 9 + Adjacent² = 25. Adjacent² = 16. Adjacent = 4.

Step 3 — Calculate cos(θ). cos(θ) = Adjacent ÷ Hypotenuse = 4 ÷ 5 = 4/5.

Shortcut to recognise: The numbers 3, 4, 5 form a Pythagorean triple. Any time you see sin = 3/5 in a right triangle problem, you know the triangle is a 3-4-5 triangle, so cos = 4/5 immediately.`,
  },
  {
    id: '633877ab-8e62-4049-9de2-d25cd50d5171',
    explanation: `Concept: Standard form of a circle equation — (x − h)² + (y − k)² = r², where (h, k) is the centre and r is the radius.

Step 1 — Match the equation to the standard form. The given equation is (x − 3)² + (y + 2)² = 25.

Step 2 — Find the centre. Compare (x − 3)² with (x − h)²: we get h = 3. Compare (y + 2)² with (y − k)²: note that y + 2 = y − (−2), so k = −2. Centre = (3, −2).

Step 3 — Find the radius. r² = 25, so r = √25 = 5.

Step 4 — Eliminate wrong answers:
• B: Centre (−3, 2) — flips the signs incorrectly. The h and k values come from the subtraction inside the brackets.
• C and D: Radius = 25 — these forget to take the square root of 25. The equation gives r², not r.

Common trap: The signs of h and k are opposite to what appears in the equation. (x − 3) means h = +3 (not −3). (y + 2) means k = −2 (not +2). Think of it as: what value of x makes the bracket equal zero? x − 3 = 0 → x = 3.`,
  },
  {
    id: '2112cb38-0381-4275-a887-5db3c6ad281a',
    explanation: `Concept: Area of a rectangle with algebraic expressions — set up the equation and solve the quadratic.

Step 1 — Write the area equation. Area = length × width = (x + 2)(x − 1) = 18.

Step 2 — Expand the left side. Use FOIL (First, Outer, Inner, Last): (x + 2)(x − 1) = x² − x + 2x − 2 = x² + x − 2.

Step 3 — Set equal to 18 and rearrange. x² + x − 2 = 18 → x² + x − 20 = 0.

Step 4 — Factor. Find two numbers that multiply to −20 and add to +1: those are +5 and −4. So: (x + 5)(x − 4) = 0.

Step 5 — Solve. x = −5 or x = 4.

Step 6 — Reject the negative solution. A side length cannot be negative. If x = −5, then the width would be x − 1 = −6, which is impossible. So x = 4.

Step 7 — Verify. Length = 4 + 2 = 6, Width = 4 − 1 = 3. Area = 6 × 3 = 18 ✓.`,
  },

  // ── MATH: PSDA ────────────────────────────────────────────────────────────
  {
    id: '83c0e06b-5308-4ce4-89f3-9ab0ae595824',
    explanation: `Concept: Slope — measuring how steep a line is, calculated as the change in y divided by the change in x.

Formula: slope = (y₂ − y₁) ÷ (x₂ − x₁), also written as "rise over run."

Step 1 — Label your points. Point 1 is (0, 4): x₁ = 0, y₁ = 4. Point 2 is (5, 9): x₂ = 5, y₂ = 9.

Step 2 — Calculate the change in y (rise). y₂ − y₁ = 9 − 4 = 5.

Step 3 — Calculate the change in x (run). x₂ − x₁ = 5 − 0 = 5.

Step 4 — Divide. Slope = 5 ÷ 5 = 1.

Interpretation: A slope of 1 means for every 1 unit you move to the right along the x-axis, the line goes up by 1 unit. On a scatterplot, the slope of the line of best fit tells you the average rate of change — in this case, whatever the x-variable represents increases by 1 unit, the y-variable increases by 1 unit as well.`,
  },
  {
    id: '14fd8492-9ff5-4395-8b78-665222b9c6d9',
    explanation: `Concept: Mean (average) — the sum of all values divided by the number of values. Adding a new value changes both the sum and the count.

Formula: Mean = Sum of all values ÷ Number of values.

Step 1 — Find the original sum. The mean is 20 and there are 5 values, so: Sum = Mean × Number of values = 20 × 5 = 100.

Step 2 — Add the new value to the sum. The new value is 50. New sum = 100 + 50 = 150.

Step 3 — Update the count. There are now 6 values (the original 5 plus the new one).

Step 4 — Calculate the new mean. New mean = 150 ÷ 6 = 25.

Key insight: Adding 50 to a dataset with a mean of 20 pulls the mean upward because 50 is above the original mean. The mean moved from 20 to 25. Notice that 50 is far above the mean, so even adding one value has a noticeable effect. This is why outliers (extreme values) can heavily influence the mean.`,
  },
  {
    id: '49045723-c51e-4d2f-9c57-bbc2265273a3',
    explanation: `Concept: Probability = Favourable outcomes ÷ Total outcomes.

Step 1 — Count the total marbles. 4 red + 5 blue + 3 green = 12 marbles in total.

Step 2 — Count the favourable outcomes. We want marbles that are NOT blue. That means red or green: 4 + 3 = 7 marbles.

Step 3 — Write the probability. P(not blue) = 7 ÷ 12 = 7/12.

Alternative method — Complement Rule: Instead of counting non-blue directly, calculate the probability of blue and subtract from 1. P(blue) = 5/12. P(not blue) = 1 − 5/12 = 7/12. Same answer.

Why the other choices are wrong:
• 5/12 — this is the probability of picking a blue marble, not "not blue."
• 5/7 — this incorrectly uses the number of non-blue marbles as the denominator instead of the total.
• 1/3 — equals 4/12, which is just the probability of picking a red marble.`,
  },
  {
    id: '3c237fe0-6196-4b81-8598-86c6eec98b60',
    explanation: `Concept: Percent chains — applying multiple percentages in sequence by converting each to a decimal multiplier.

Key rule: "A is 80% of B" means A = 0.80 × B. Work through the chain one step at a time.

Step 1 — Find Store B. Store B is 125% of Store C, and Store C = $200,000. Store B = 1.25 × 200,000 = $250,000.

Step 2 — Find Store A. Store A is 80% of Store B. Store A = 0.80 × 250,000 = $200,000.

Step 3 — Verify with reasoning. Store B is 25% larger than C (125% = 1.25×). Store A is 20% smaller than B (80% = 0.80×). Going up 25% then down 20% almost cancels out, giving Store A roughly the same value as Store C. $200,000 matches Store C's value, which makes sense mathematically: 1.25 × 0.80 = 1.00.

Tip: Always convert percentages to decimals before multiplying. 80% → 0.80, 125% → 1.25. Never add percentages directly across different bases — the bases change at each step.`,
  },
]

async function update(id, explanation) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/questions?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ explanation }),
  })
  if (!res.ok) throw new Error(await res.text())
}

;(async () => {
  console.log(`Updating ${updates.length} explanations...\n`)
  let ok = 0, fail = 0
  for (const u of updates) {
    try {
      await update(u.id, u.explanation)
      console.log(`✓ ${u.id.substring(0, 8)}…`)
      ok++
    } catch (e) {
      console.error(`✗ ${u.id.substring(0, 8)}: ${e.message}`)
      fail++
    }
  }
  console.log(`\nDone — ${ok} updated, ${fail} failed.`)
})()
