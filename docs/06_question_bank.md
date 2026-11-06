# 06 — Question Bank

App: **Bubbl**

---

## Bank Size Target

| Subject | Domain | Easy | Medium | Hard | Hardest | Total |
|---------|--------|------|--------|------|---------|-------|
| Math | Algebra | 80 | 200 | 150 | 70 | 500 |
| Math | Advanced Math | 60 | 180 | 160 | 100 | 500 |
| Math | PSDA | 80 | 220 | 150 | 50 | 500 |
| Math | Geometry & Trig | 80 | 200 | 150 | 70 | 500 |
| English | Craft & Structure | 60 | 180 | 180 | 80 | 500 |
| English | Information & Ideas | 60 | 200 | 160 | 80 | 500 |
| English | SEC | 80 | 220 | 150 | 50 | 500 |
| English | Expression of Ideas | 60 | 190 | 170 | 80 | 500 |
| **TOTAL** | | **560** | **1,590** | **1,270** | **580** | **4,000** |

Target: 4,000 questions initially, expanding to 5,000 with community feedback.

---

## Question JSON Structure

Each question stored in Supabase matches this structure:

```json
{
  "id": "auto-generated-uuid",
  "subject": "math",
  "domain": "PSDA",
  "skill": "Scatterplot interpretation",
  "cb_skill_code": "PSA-01",
  "difficulty": "Medium",
  "difficulty_rating": 500,
  "passage": null,
  "stem": "The scatterplot above shows the relationship between the number of hours a group of students studied for a test and their scores. A line of best fit is also shown. Which of the following is closest to the slope of this line of best fit?",
  "choices": {
    "A": "0.25",
    "B": "0.75",
    "C": "1.50",
    "D": "2.00"
  },
  "grid_in": false,
  "correct": "B",
  "explanation": "The slope is calculated as rise/run. Reading two clear points from the line of best fit — (2, 4) and (6, 7) — the slope = (7−4)/(6−2) = 3/4 = 0.75.",
  "trap_choice": "A",
  "strategy": "On the digital SAT, use Desmos: enter any two points on the line and compute slope directly. Avoid estimating from the graph by eye.",
  "times_seen": 0,
  "times_correct": 0,
  "pass_rate": null,
  "created_at": "2026-10-27T00:00:00Z"
}
```

For English questions with a passage:
```json
{
  "subject": "english",
  "domain": "Craft & Structure",
  "skill": "Vocabulary in context",
  "cb_skill_code": "CS-02",
  "difficulty": "Hard",
  "difficulty_rating": 650,
  "passage": "Archaeologist Dr. Lena Marsh described the discovery as ______, noting that while the site confirmed several long-held theories, it also raised questions that the field had not previously considered.",
  "stem": "Which word most logically and precisely completes the text?",
  "choices": {
    "A": "significant",
    "B": "revelatory",
    "C": "unexpected",
    "D": "controversial"
  },
  "grid_in": false,
  "correct": "B",
  "explanation": "'Revelatory' means something that reveals or discloses new understanding. The passage says it confirmed theories but also raised new questions — something that both validates and opens up new territory. 'Significant' is too generic. 'Unexpected' contradicts 'confirmed theories.' 'Controversial' implies disagreement, which isn't mentioned.",
  "trap_choice": "A",
  "strategy": "For vocabulary-in-context, eliminate choices that are too broad ('significant') or import meanings from outside the passage. The correct word must fit the specific context — here, the dual nature of confirming AND raising questions."
}
```

---

## College Board Skill Codes

These map directly to real CB skill descriptors and ensure difficulty labels are accurate.

### Math Skill Codes

```
ALGEBRA
  ALG-01  Linear equations — one variable, direct solve           Easy
  ALG-02  Linear equations — equivalent forms                     Easy/Medium
  ALG-03  Linear equations — word problem setup                   Medium
  ALG-04  Linear functions — slope from table                     Medium
  ALG-05  Linear functions — interpret slope/intercept in context Medium
  ALG-06  Systems of two equations — solve by elimination         Medium
  ALG-07  Systems of two equations — word problem                 Medium
  ALG-08  Linear inequalities — single variable                   Medium
  ALG-09  Linear inequalities — two variables (graph)             Medium/Hard
  ALG-10  Systems — no solution / infinite solutions              Hard
  ALG-11  Absolute value equations                                Hard
  ALG-12  Literal equations — isolate a variable                  Hard
  ALG-13  Systems — expression value (not individual variables)   Hard
  ALG-14  Linear models — multi-step interpretation               Hardest

ADVANCED MATH
  ADV-01  Evaluate a function at a value                          Easy
  ADV-02  Quadratic — factor and find roots                       Medium
  ADV-03  Quadratic — vertex form, read vertex                    Medium
  ADV-04  Exponential — identify growth/decay from graph          Medium
  ADV-05  Composite functions f(g(x))                             Medium
  ADV-06  Quadratic — discriminant (number of solutions)          Hard
  ADV-07  Quadratic — find equation from table of values          Hard
  ADV-08  Exponential models — equivalent form                    Hard
  ADV-09  Polynomial — manipulate and collect like terms          Hard
  ADV-10  Rational expressions — simplify                         Hard
  ADV-11  Exponential — rational exponents and radicals           Hard
  ADV-12  Nonlinear systems — solve algebraically                 Hard
  ADV-13  Polynomial roots from graph (with horizontal shift)     Hardest
  ADV-14  Rational functions — find constants given points/zeros  Hardest
  ADV-15  Polynomial — count distinct real solutions              Hardest

PROBLEM SOLVING & DATA ANALYSIS
  PSA-01  Scatterplot — read slope of line of best fit            Easy/Medium
  PSA-02  Scatterplot — interpret a labeled point                 Medium
  PSA-03  Scatterplot — interpret y-intercept in context          Medium
  PSA-04  Data table — compute mean                               Easy
  PSA-05  Data table — compute median                             Medium
  PSA-06  Statistics — effect of adding/removing a value          Medium/Hard
  PSA-07  Statistics — compare mean and median from histogram     Hard
  PSA-08  Probability — simple (favorable/total)                  Medium
  PSA-09  Probability — even/odd conditions from defined set      Medium/Hard
  PSA-10  Unit conversion — single step                           Easy/Medium
  PSA-11  Unit conversion — multi-step chain                      Hard
  PSA-12  Percent — single calculation                            Medium
  PSA-13  Percent chain — A is X% of B, B is Y% of C             Hard
  PSA-14  Linear vs. exponential model identification             Medium
  PSA-15  Graph interpretation — linear system context            Hard

GEOMETRY & TRIG
  GEO-01  Circle equation — standard form (center + radius)       Medium
  GEO-02  Circle equation — radius change, find new constant      Medium
  GEO-03  Right triangle — SOH-CAH-TOA apply                     Medium
  GEO-04  Right triangle — express hypotenuse using trig          Hard
  GEO-05  Similar triangles — proportional sides                  Medium/Hard
  GEO-06  Angle relationships — intersecting lines                Hard
  GEO-07  Congruent triangles — find unknown angle                Medium
  GEO-08  Area of composite shapes with algebra                   Hard
  GEO-09  3D surface area with algebraic dimensions               Hard
  GEO-10  Arc length and sector area                              Hard
  GEO-11  Angle in inscribed figures                              Hardest
  GEO-12  Special right triangles (30-60-90, 45-45-90)            Hard
```

### English Skill Codes

```
CRAFT & STRUCTURE
  CS-01   Vocabulary in context — common/clear word               Easy
  CS-02   Vocabulary in context — nuanced synonyms                Hard
  CS-03   Vocabulary in context — formal vs. informal register    Hard
  CS-04   Text structure — overall purpose                        Medium
  CS-05   Text structure — function of specific detail            Medium/Hard
  CS-06   Paired passage — identify relationship between texts    Hard
  CS-07   Paired passage — how one strengthens/challenges other   Hard
  CS-08   Author point of view / rhetorical choice                Hard

INFORMATION & IDEAS
  II-01   Main idea — explicit                                    Easy
  II-02   Main idea — implied                                     Medium
  II-03   Inference — character or narrator                       Medium/Hard
  II-04   Textual evidence — which quote best supports claim      Medium
  II-05   Textual evidence — poetry                               Hard
  II-06   Logical completion — which sentence logically follows   Medium
  II-07   Quantitative — data table supports which claim          Hard
  II-08   Quantitative — bar/grouped chart interpretation         Hard
  II-09   Cross-text synthesis — what both passages share         Hard

STANDARD ENGLISH CONVENTIONS
  SEC-01  Verb tense — simple past/present/future                 Easy
  SEC-02  Verb tense — past perfect vs. simple past               Medium
  SEC-03  Comma — introductory phrase                             Easy/Medium
  SEC-04  Comma — coordinate adjectives                           Medium
  SEC-05  Comma — unnecessary comma removal                       Medium
  SEC-06  Subject-verb agreement — inverted sentence              Hard
  SEC-07  Subject-verb agreement — collective noun                Hard
  SEC-08  Sentence boundary — run-on correction                   Medium
  SEC-09  Sentence boundary — fragment correction                 Medium
  SEC-10  Semicolon — join independent clauses                    Medium
  SEC-11  Colon — introduce a list or explanation                 Medium
  SEC-12  Dangling modifier — identify and correct                Hard
  SEC-13  Appositive punctuation — set off correctly              Hard
  SEC-14  Participial phrase — punctuation                        Hard
  SEC-15  Pronoun — ambiguous reference                           Hard
  SEC-16  Verb form — infinitive vs. gerund                       Hard

EXPRESSION OF IDEAS
  EXP-01  Transition — add / however / therefore                  Easy/Medium
  EXP-02  Transition — logical relationship trap                  Hard
  EXP-03  Research synthesis — introduce with evidence            Hard
  EXP-04  Research synthesis — compare two findings               Hard
  EXP-05  Research synthesis — emphasize contrast                 Hard
  EXP-06  Concision — remove redundant words                      Medium
  EXP-07  Effective lead sentence                                 Hard
```

---

## Generation Batches

Use the `/sat-paper` skill (in Claude Code sessions, no API cost) to generate questions in batches. Each batch exports to a JSON seed file.

### Batch Plan

```
Batch 01: Math Algebra        — 500 questions → seed/math_algebra.json
Batch 02: Math Advanced Math  — 500 questions → seed/math_advanced.json
Batch 03: Math PSDA           — 500 questions → seed/math_psda.json
Batch 04: Math Geometry       — 500 questions → seed/math_geometry.json
Batch 05: English Craft       — 500 questions → seed/english_craft.json
Batch 06: English Info        — 500 questions → seed/english_info.json
Batch 07: English SEC         — 500 questions → seed/english_sec.json
Batch 08: English Expression  — 500 questions → seed/english_expression.json
```

Each batch session: generate 100 questions at a time (Claude context limit), export JSON, repeat 5 times per batch.

### Generation Prompt Template

When invoking `/sat-paper` for bank generation (not a student paper), use this instruction:

```
Generate 100 SAT <SUBJECT> questions for the <DOMAIN> domain.
Export as a JSON array matching the question schema in docs/06_question_bank.md.
Include cb_skill_code for each question.
Mix of Easy/Medium/Hard/Hardest per the target ratio for this domain.
Do NOT include id or timestamps — those are added on insert.
```

---

## Seeding into Supabase

### Method 1 — Supabase Dashboard (small batches)
1. Go to Table Editor → questions
2. Click "Insert rows" → paste JSON array
3. Max ~500 rows per paste

### Method 2 — Supabase CLI (bulk)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Bulk insert from JSON file
supabase db execute --project-ref <your-ref> \
  "COPY questions FROM STDIN WITH (FORMAT json);" \
  < schema/seed/math_psda.json
```

### Method 3 — Python script (recommended for 4,000+ rows)
```python
import json
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

with open('schema/seed/math_psda.json') as f:
    questions = json.load(f)

# Insert in batches of 500
batch_size = 500
for i in range(0, len(questions), batch_size):
    batch = questions[i:i+batch_size]
    result = supabase.table('questions').insert(batch).execute()
    print(f"Inserted {i}–{i+len(batch)}: {len(result.data)} rows")
```

---

## Quality Rules for Generated Questions

Every generated question MUST meet these standards before being added to the bank:

1. **Exactly one correct answer** — verified independently
2. **At least one trap answer** — catches a common student mistake, documented in `trap_choice`
3. **Difficulty rating is accurate** — Easy questions must be solvable in <30 seconds by a solid student
4. **No real SAT questions reproduced** — all content is original
5. **Passages are 2–6 sentences** (English) — matches real CB format
6. **Math questions don't require calculator** to be solvable — but don't assume no calculator either
7. **Grid-in answers are positive** where possible — matches real SAT constraint (no negative grid-ins on real SAT except specific cases)
8. **CB skill code matches the actual skill tested** — not just the domain
