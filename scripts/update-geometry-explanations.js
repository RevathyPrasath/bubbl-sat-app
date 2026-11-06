// Update geometry question explanations with detailed, student-friendly content
// Run: node scripts/update-geometry-explanations.js

const SUPABASE_URL = 'https://hdvyfeolbxgepneavuiv.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkdnlmZW9sYnhnZXBuZWF2dWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzIzODQ0MiwiZXhwIjoyMTA4ODE0NDQyfQ.sFN5XeS65w5n3zrtji762VrSNfFhoW7O-KN4MiVhqxU'

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const updates = [
  {
    cb_skill_code: 'GEO-1',
    explanation: `Formula to know: The Pythagorean Theorem — a² + b² = c², where a and b are the two legs (the shorter sides that form the right angle) and c is the hypotenuse (the longest side, always opposite the right angle).

Step 1 — Identify the sides. The two legs are 9 and 12. The hypotenuse is what we are solving for.

Step 2 — Plug into the formula. a² + b² = c² becomes 9² + 12² = c².

Step 3 — Compute the squares. 9² = 81 and 12² = 144. So 81 + 144 = 225.

Step 4 — Take the square root. c = √225 = 15.

Key insight: The numbers 9, 12, 15 form a Pythagorean triple — they are a scaled version of the classic 3-4-5 triangle (multiply each by 3). Recognising these triples on test day saves you calculation time.`,
  },
  {
    cb_skill_code: 'GEO-2',
    explanation: `Formula to know: Area of a circle = πr², where r is the radius (the distance from the centre to the edge). π ≈ 3.14159, but on the SAT leave your answer in terms of π unless told otherwise.

Step 1 — Read the radius from the diagram. r = 7.

Step 2 — Square the radius. r² = 7² = 49.

Step 3 — Multiply by π. Area = π × 49 = 49π.

Common mistake to avoid: Many students confuse radius and diameter. The diameter is the full width of the circle (d = 2r). If the problem gives you the diameter, divide by 2 first to get the radius before using the formula. Here the radius is given directly, so no conversion is needed.`,
  },
  {
    cb_skill_code: 'GEO-3',
    explanation: `Formula to know: When two parallel lines are cut by a transversal, co-interior angles (also called same-side interior angles or consecutive interior angles) are supplementary — they add up to 180°.

Step 1 — Identify the angle relationship. The 118° angle and x° are on the same side of the transversal, between the two parallel lines. This makes them co-interior angles.

Step 2 — Apply the supplementary rule. Co-interior angles sum to 180°, so: x + 118 = 180.

Step 3 — Solve for x. x = 180 − 118 = 62.

Key relationships to remember for parallel line problems:
• Alternate interior angles → equal (Z-shape)
• Corresponding angles → equal (F-shape)
• Co-interior angles → add to 180° (C-shape)`,
  },
  {
    cb_skill_code: 'GEO-4',
    explanation: `Formulas to know:
• Area of a rectangle = length × width (A = l × w)
• Perimeter of a rectangle = 2 × (length + width) (P = 2(l + w))

Step 1 — Find the missing side. You know the area (60) and the length (12). Use the area formula to find the width: w = A ÷ l = 60 ÷ 12 = 5.

Step 2 — Calculate the perimeter. P = 2(l + w) = 2(12 + 5) = 2 × 17 = 34.

Why this works: Perimeter is the total distance around the outside of the shape. A rectangle has two pairs of equal sides, so you add all four sides: 12 + 5 + 12 + 5 = 34. The formula 2(l + w) is simply a shortcut for this addition.`,
  },
  {
    cb_skill_code: 'GEO-5',
    explanation: `Formula to know: For similar triangles, corresponding sides are proportional. This means the ratio of any two corresponding sides is the same across both triangles: side₁/side₂ = corresponding side₁/corresponding side₂.

Step 1 — Set up the proportion. The bases are corresponding sides (6 and 3), and the heights are corresponding sides (8 and x). Write the proportion: 8/x = 6/3.

Step 2 — Simplify. 6/3 = 2, so 8/x = 2.

Step 3 — Solve for x. x = 8 ÷ 2 = 4.

Alternatively, find the scale factor first: the smaller triangle is half the size of the larger (3/6 = 0.5). Multiply every side of the larger triangle by 0.5: height = 8 × 0.5 = 4. Both approaches give the same answer.`,
  },
  {
    cb_skill_code: 'GEO-6',
    explanation: `Formula to know: Distance Formula — d = √((x₂ − x₁)² + (y₂ − y₁)²). This comes from the Pythagorean theorem applied to a coordinate grid: the horizontal and vertical gaps between two points are the two legs of a right triangle, and the distance is the hypotenuse.

Step 1 — Label the coordinates. A = (−3, 3) so x₁ = −3, y₁ = 3. B = (5, −2) so x₂ = 5, y₂ = −2.

Step 2 — Find the horizontal gap. x₂ − x₁ = 5 − (−3) = 5 + 3 = 8. Square it: 8² = 64.

Step 3 — Find the vertical gap. y₂ − y₁ = −2 − 3 = −5. Square it: (−5)² = 25.

Step 4 — Add and square root. d = √(64 + 25) = √89.

Note: √89 cannot be simplified further since 89 is a prime number. Leave it as √89.`,
  },
  {
    cb_skill_code: 'GEO-7',
    explanation: `Rule to know: The interior angles of any triangle always add up to exactly 180°. This is one of the most fundamental facts in geometry and applies to every triangle regardless of its shape or size.

Step 1 — Write the equation. If the three angles are 65°, 48°, and x°, then: 65 + 48 + x = 180.

Step 2 — Add the known angles. 65 + 48 = 113.

Step 3 — Solve for x. x = 180 − 113 = 67.

Check your answer: 65 + 48 + 67 = 180 ✓

Extension tip: If the triangle were a right triangle, one angle would be 90°, and the other two would sum to 90° (they are called complementary angles). Always check your answer by verifying all three angles add to 180°.`,
  },
  {
    cb_skill_code: 'GEO-8',
    explanation: `Formula to know: Area of a trapezoid = ½ × (b₁ + b₂) × h, where b₁ and b₂ are the two parallel sides (called bases) and h is the perpendicular height between them.

Why this formula works: A trapezoid is like an average of two rectangles. If you average the two bases and multiply by the height, you get the area. The ½ in the formula comes from that averaging step.

Step 1 — Identify the values. b₁ = 10, b₂ = 16, h = 8.

Step 2 — Add the two bases. b₁ + b₂ = 10 + 16 = 26.

Step 3 — Multiply by the height. 26 × 8 = 208.

Step 4 — Multiply by ½. ½ × 208 = 104.

Common mistake: Students sometimes forget the ½ and get 208. Always remember: the trapezoid formula has that ½ factor, just like the triangle area formula (½ × base × height).`,
  },
  {
    cb_skill_code: 'GEO-9',
    explanation: `Formulas to know:
• Full circle area = πr²
• Sector area = (central angle ÷ 360°) × πr²

A sector is a "pie slice" of a circle. Its area is a fraction of the full circle area, and that fraction equals the central angle divided by 360° (the full rotation).

Step 1 — Identify the central angle and radius. The sector is a quarter-circle, so the central angle = 90°. Radius r = 6.

Step 2 — Find what fraction of the circle this is. 90° ÷ 360° = ¼. So the sector is one-quarter of the full circle.

Step 3 — Calculate the full circle area. πr² = π × 6² = 36π.

Step 4 — Take the fraction. Sector area = ¼ × 36π = 9π.

Memory trick: Quarter-circle = ¼ of the area. Half-circle = ½ of the area. The fraction always matches the angle divided by 360.`,
  },
  {
    cb_skill_code: 'GEO-10',
    explanation: `Formula to know: Volume of a rectangular prism (a box shape) = length × width × height (V = l × w × h). Volume measures the amount of three-dimensional space inside a shape, and is always expressed in cubic units.

Step 1 — Identify the three dimensions from the diagram. Length = 10, width = 4, height = 5.

Step 2 — Multiply all three together. V = 10 × 4 × 5.

Step 3 — Calculate step by step. 10 × 4 = 40. Then 40 × 5 = 200.

Step 4 — State the units. V = 200 cubic units.

Why multiplication works: Think of the prism as layers. One layer is 10 × 4 = 40 square units. Stack 5 of those layers on top of each other: 40 × 5 = 200 cubic units. This is why volume = area of base × height is a general principle for all prisms and cylinders.`,
  },
]

async function updateExplanation(cb_skill_code, explanation) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/questions?cb_skill_code=eq.${cb_skill_code}`,
    {
      method: 'PATCH',
      headers: { ...HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify({ explanation }),
    }
  )
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.length
}

;(async () => {
  console.log('Updating geometry explanations...\n')
  for (const u of updates) {
    try {
      const count = await updateExplanation(u.cb_skill_code, u.explanation)
      console.log(`✓ ${u.cb_skill_code} — updated ${count} row(s)`)
    } catch (err) {
      console.error(`✗ ${u.cb_skill_code}: ${err.message}`)
    }
  }
  console.log('\nDone!')
})()
