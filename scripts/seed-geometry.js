// Seed 10 geometry questions with SVG diagrams into Supabase
// Run: node scripts/seed-geometry.js

const SUPABASE_URL = 'https://hdvyfeolbxgepneavuiv.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkdnlmZW9sYnhnZXBuZWF2dWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzIzODQ0MiwiZXhwIjoyMTA4ODE0NDQyfQ.sFN5XeS65w5n3zrtji762VrSNfFhoW7O-KN4MiVhqxU'
const BUCKET = 'question-diagrams'

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
}

// ─── SVG Diagrams ────────────────────────────────────────────────────────────

const svgs = {
  'right-triangle-3-4-5.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <polygon points="60,160 60,40 240,160" fill="none" stroke="#4ecca3" stroke-width="2.5"/>
  <rect x="60" y="140" width="20" height="20" fill="none" stroke="#4ecca3" stroke-width="2"/>
  <text x="48" y="110" fill="#e0e0e0" font-family="Arial" font-size="16" text-anchor="middle">a</text>
  <text x="150" y="185" fill="#e0e0e0" font-family="Arial" font-size="16" text-anchor="middle">b = 12</text>
  <text x="165" y="90" fill="#f0c040" font-family="Arial" font-size="16" text-anchor="middle">c = ?</text>
  <text x="48" y="110" fill="#e0e0e0" font-family="Arial" font-size="16" text-anchor="middle">a = 9</text>
</svg>`,

  'circle-radius.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <circle cx="160" cy="110" r="80" fill="none" stroke="#4ecca3" stroke-width="2.5"/>
  <line x1="160" y1="110" x2="240" y2="110" stroke="#f0c040" stroke-width="2" stroke-dasharray="6,3"/>
  <circle cx="160" cy="110" r="4" fill="#4ecca3"/>
  <text x="200" y="102" fill="#f0c040" font-family="Arial" font-size="15">r = 7</text>
  <text x="160" y="205" fill="#e0e0e0" font-family="Arial" font-size="13" text-anchor="middle">Find the area of the circle.</text>
</svg>`,

  'parallel-lines.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <line x1="20" y1="70" x2="300" y2="70" stroke="#4ecca3" stroke-width="2.5"/>
  <line x1="20" y1="150" x2="300" y2="150" stroke="#4ecca3" stroke-width="2.5"/>
  <line x1="80" y1="20" x2="220" y2="200" stroke="#e0e0e0" stroke-width="2"/>
  <text x="22" y="64" fill="#4ecca3" font-family="Arial" font-size="13">l</text>
  <text x="22" y="144" fill="#4ecca3" font-family="Arial" font-size="13">m</text>
  <text x="115" y="60" fill="#f0c040" font-family="Arial" font-size="14">118°</text>
  <text x="152" y="145" fill="#e0e0e0" font-family="Arial" font-size="14">x°</text>
  <text x="8" y="50" fill="#e0e0e0" font-family="Arial" font-size="11">l ∥ m</text>
</svg>`,

  'rectangle-area.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <rect x="50" y="50" width="220" height="120" fill="none" stroke="#4ecca3" stroke-width="2.5"/>
  <text x="160" y="118" fill="#4ecca3" font-family="Arial" font-size="15" text-anchor="middle">Area = 60</text>
  <text x="160" y="40" fill="#e0e0e0" font-family="Arial" font-size="15" text-anchor="middle">w</text>
  <text x="272" y="115" fill="#f0c040" font-family="Arial" font-size="15">l = 12</text>
  <line x1="50" y1="35" x2="270" y2="35" stroke="#e0e0e0" stroke-width="1.5" marker-end="url(#arrow)"/>
</svg>`,

  'similar-triangles.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <polygon points="30,180 110,60 190,180" fill="none" stroke="#4ecca3" stroke-width="2.5"/>
  <polygon points="200,180 260,90 320,180" fill="none" stroke="#888" stroke-width="2" stroke-dasharray="5,3"/>
  <text x="110" y="200" fill="#e0e0e0" font-family="Arial" font-size="13" text-anchor="middle">6</text>
  <text x="17" y="125" fill="#e0e0e0" font-family="Arial" font-size="13">8</text>
  <text x="260" y="200" fill="#f0c040" font-family="Arial" font-size="13" text-anchor="middle">3</text>
  <text x="316" y="135" fill="#f0c040" font-family="Arial" font-size="13">x</text>
  <text x="160" y="20" fill="#e0e0e0" font-family="Arial" font-size="12" text-anchor="middle">Similar triangles — find x</text>
</svg>`,

  'coordinate-distance.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <line x1="30" y1="110" x2="290" y2="110" stroke="#555" stroke-width="1.5"/>
  <line x1="160" y1="10" x2="160" y2="210" stroke="#555" stroke-width="1.5"/>
  <text x="285" y="106" fill="#555" font-family="Arial" font-size="12">x</text>
  <text x="163" y="18" fill="#555" font-family="Arial" font-size="12">y</text>
  <circle cx="100" cy="70" r="5" fill="#4ecca3"/>
  <circle cx="240" cy="160" r="5" fill="#4ecca3"/>
  <line x1="100" y1="70" x2="240" y2="160" stroke="#f0c040" stroke-width="2" stroke-dasharray="6,3"/>
  <text x="75" y="62" fill="#4ecca3" font-family="Arial" font-size="13">A(−3, 3)</text>
  <text x="245" y="158" fill="#4ecca3" font-family="Arial" font-size="13">B(5, −2)</text>
</svg>`,

  'triangle-angles.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <polygon points="160,30 40,190 280,190" fill="none" stroke="#4ecca3" stroke-width="2.5"/>
  <text x="160" y="25" fill="#e0e0e0" font-family="Arial" font-size="14" text-anchor="middle">x°</text>
  <text x="52" y="185" fill="#f0c040" font-family="Arial" font-size="14">65°</text>
  <text x="262" y="185" fill="#f0c040" font-family="Arial" font-size="14">48°</text>
</svg>`,

  'trapezoid.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <polygon points="90,50 230,50 280,170 40,170" fill="none" stroke="#4ecca3" stroke-width="2.5"/>
  <line x1="90" y1="50" x2="90" y2="170" stroke="#f0c040" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="160" y="40" fill="#e0e0e0" font-family="Arial" font-size="14" text-anchor="middle">b₁ = 10</text>
  <text x="160" y="195" fill="#e0e0e0" font-family="Arial" font-size="14" text-anchor="middle">b₂ = 16</text>
  <text x="72" y="115" fill="#f0c040" font-family="Arial" font-size="14">h = 8</text>
</svg>`,

  'circle-sector.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <circle cx="160" cy="120" r="90" fill="none" stroke="#444" stroke-width="1.5"/>
  <path d="M160,120 L250,120 A90,90 0 0,0 160,30 Z" fill="#4ecca322" stroke="#4ecca3" stroke-width="2.5"/>
  <line x1="160" y1="120" x2="250" y2="120" stroke="#4ecca3" stroke-width="2"/>
  <line x1="160" y1="120" x2="160" y2="30" stroke="#4ecca3" stroke-width="2"/>
  <text x="210" y="115" fill="#e0e0e0" font-family="Arial" font-size="14">r = 6</text>
  <text x="175" y="75" fill="#f0c040" font-family="Arial" font-size="13">90°</text>
</svg>`,

  'rectangular-prism.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
  <rect width="320" height="220" fill="#1a1a1a"/>
  <polygon points="60,160 200,160 200,80 60,80" fill="none" stroke="#4ecca3" stroke-width="2.5"/>
  <polygon points="200,80 260,40 260,120 200,160" fill="none" stroke="#4ecca3" stroke-width="2.5"/>
  <line x1="60" y1="80" x2="120" y2="40" stroke="#4ecca3" stroke-width="2.5"/>
  <line x1="120" y1="40" x2="260" y2="40" stroke="#4ecca3" stroke-width="2.5"/>
  <line x1="120" y1="40" x2="120" y2="120" stroke="#888" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="130" y="175" fill="#e0e0e0" font-family="Arial" font-size="13">l = 10</text>
  <text x="212" y="145" fill="#e0e0e0" font-family="Arial" font-size="13">w = 4</text>
  <text x="22" y="125" fill="#f0c040" font-family="Arial" font-size="13">h = 5</text>
</svg>`,
}

// ─── Questions data ───────────────────────────────────────────────────────────

const questions = [
  {
    filename: 'right-triangle-3-4-5.svg',
    subject: 'math', domain: 'Geometry', skill: 'Right triangles & Pythagorean theorem',
    cb_skill_code: 'GEO-1', difficulty: 'Medium', difficulty_rating: 500,
    stem: 'In the right triangle shown, the two legs have lengths 9 and 12. What is the length of the hypotenuse?',
    choices: { A: '13', B: '15', C: '18', D: '21' },
    correct: 'B',
    explanation: 'Use the Pythagorean theorem: c² = a² + b². Substitute: c² = 9² + 12² = 81 + 144 = 225. Take the square root: c = √225 = 15.',
    grid_in: false,
  },
  {
    filename: 'circle-radius.svg',
    subject: 'math', domain: 'Geometry', skill: 'Circles — area and circumference',
    cb_skill_code: 'GEO-2', difficulty: 'Easy', difficulty_rating: 300,
    stem: 'The circle shown has a radius of 7. What is the area of the circle?',
    choices: { A: '14π', B: '28π', C: '49π', D: '98π' },
    correct: 'C',
    explanation: 'The area formula for a circle is A = πr². Substitute r = 7: A = π(7²) = 49π.',
    grid_in: false,
  },
  {
    filename: 'parallel-lines.svg',
    subject: 'math', domain: 'Geometry', skill: 'Parallel lines & transversals',
    cb_skill_code: 'GEO-3', difficulty: 'Easy', difficulty_rating: 300,
    stem: 'In the figure, lines l and m are parallel and are cut by a transversal. If one angle measures 118°, what is the value of x?',
    choices: { A: '52', B: '62', C: '118', D: '128' },
    correct: 'B',
    explanation: 'Co-interior (same-side interior) angles are supplementary when lines are parallel, so they add to 180°. Subtract: x = 180° − 118° = 62°.',
    grid_in: false,
  },
  {
    filename: 'rectangle-area.svg',
    subject: 'math', domain: 'Geometry', skill: 'Area and perimeter of polygons',
    cb_skill_code: 'GEO-4', difficulty: 'Easy', difficulty_rating: 300,
    stem: 'A rectangle has an area of 60 square units and a length of 12. What is the perimeter of the rectangle?',
    choices: { A: '24', B: '34', C: '44', D: '54' },
    correct: 'B',
    explanation: 'Find the width: w = Area ÷ length = 60 ÷ 12 = 5. Perimeter = 2(l + w) = 2(12 + 5) = 2(17) = 34.',
    grid_in: false,
  },
  {
    filename: 'similar-triangles.svg',
    subject: 'math', domain: 'Geometry', skill: 'Similar triangles & proportions',
    cb_skill_code: 'GEO-5', difficulty: 'Medium', difficulty_rating: 500,
    stem: 'The two triangles shown are similar. The larger triangle has a base of 6 and a height of 8. The smaller triangle has a base of 3. What is the height x of the smaller triangle?',
    choices: { A: '2', B: '3', C: '4', D: '6' },
    correct: 'C',
    explanation: 'Set up a proportion using corresponding sides: x/8 = 3/6. Cross-multiply: 6x = 24. Divide: x = 4.',
    grid_in: false,
  },
  {
    filename: 'coordinate-distance.svg',
    subject: 'math', domain: 'Geometry', skill: 'Distance in the coordinate plane',
    cb_skill_code: 'GEO-6', difficulty: 'Medium', difficulty_rating: 500,
    stem: 'What is the distance between points A(−3, 3) and B(5, −2) in the coordinate plane?',
    choices: { A: '√89', B: '√53', C: '√65', D: '√41' },
    correct: 'A',
    explanation: 'Use the distance formula: d = √((x₂−x₁)² + (y₂−y₁)²). Substitute: d = √((5−(−3))² + (−2−3)²) = √(8² + (−5)²) = √(64 + 25) = √89.',
    grid_in: false,
  },
  {
    filename: 'triangle-angles.svg',
    subject: 'math', domain: 'Geometry', skill: 'Triangle angle relationships',
    cb_skill_code: 'GEO-7', difficulty: 'Easy', difficulty_rating: 300,
    stem: 'In the triangle shown, two angles measure 65° and 48°. What is the value of x, the third angle in degrees?',
    choices: { A: '57', B: '67', C: '77', D: '87' },
    correct: 'B',
    explanation: 'The angles of a triangle sum to 180°. Subtract the two known angles: x = 180° − 65° − 48° = 67°.',
    grid_in: false,
  },
  {
    filename: 'trapezoid.svg',
    subject: 'math', domain: 'Geometry', skill: 'Area of trapezoids',
    cb_skill_code: 'GEO-8', difficulty: 'Medium', difficulty_rating: 500,
    stem: 'What is the area of the trapezoid shown, with parallel bases of 10 and 16 and a height of 8?',
    choices: { A: '96', B: '104', C: '112', D: '128' },
    correct: 'B',
    explanation: 'Use the trapezoid area formula: A = ½(b₁ + b₂) × h. Substitute: A = ½(10 + 16) × 8 = ½(26)(8) = 104.',
    grid_in: false,
  },
  {
    filename: 'circle-sector.svg',
    subject: 'math', domain: 'Geometry', skill: 'Circles — arc length and sector area',
    cb_skill_code: 'GEO-9', difficulty: 'Hard', difficulty_rating: 650,
    stem: 'The shaded region shows a quarter-circle (sector) with radius 6. What is the area of the shaded sector?',
    choices: { A: '3π', B: '6π', C: '9π', D: '36π' },
    correct: 'C',
    explanation: 'Sector area = (θ/360°) × πr². A 90° sector is one-quarter of the circle: (90/360) × π(6²) = ¼ × 36π = 9π.',
    grid_in: false,
  },
  {
    filename: 'rectangular-prism.svg',
    subject: 'math', domain: 'Geometry', skill: 'Volume of 3D figures',
    cb_skill_code: 'GEO-10', difficulty: 'Easy', difficulty_rating: 300,
    stem: 'What is the volume of the rectangular prism shown, with length 10, width 4, and height 5?',
    choices: { A: '38', B: '100', C: '150', D: '200' },
    correct: 'D',
    explanation: 'Volume of a rectangular prism = l × w × h. Substitute: V = 10 × 4 × 5 = 200 cubic units.',
    grid_in: false,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function uploadSVG(filename, svgContent) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'image/svg+xml',
      'x-upsert': 'true',
    },
    body: svgContent,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed for ${filename}: ${text}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`
}

async function insertQuestion(q, diagram_url) {
  const payload = {
    subject: q.subject,
    domain: q.domain,
    skill: q.skill,
    cb_skill_code: q.cb_skill_code,
    difficulty: q.difficulty,
    difficulty_rating: q.difficulty_rating,
    stem: q.stem,
    choices: q.choices,
    correct: q.correct,
    explanation: q.explanation,
    grid_in: q.grid_in,
    diagram_url,
    passage: null,
    times_seen: 0,
    times_correct: 0,
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/questions`, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Insert failed: ${text}`)
  }
  const data = await res.json()
  return data[0]
}

// ─── Main ─────────────────────────────────────────────────────────────────────

;(async () => {
  console.log('Seeding 10 geometry questions with diagrams...\n')

  // Skip first question (already inserted)
  for (const q of questions.slice(1)) {
    const diagram_url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${q.filename}`
    try {
      const inserted = await insertQuestion(q, diagram_url)
      console.log(`✓ Inserted: "${q.stem.substring(0, 60)}…" → ${inserted.id}`)
    } catch (err) {
      console.error(`✗ ${q.filename}: ${err.message}`)
    }
  }

  console.log('\nDone!')
})()
