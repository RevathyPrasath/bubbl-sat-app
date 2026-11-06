# Question Bank Seeding

## Files

Each file is a JSON array of question objects matching the questions table schema.
Generate these using the `/sat-paper` skill in Claude Code sessions (no API cost).

```
math_algebra.json      — 500 Algebra questions
math_advanced.json     — 500 Advanced Math questions
math_psda.json         — 500 PSDA questions
math_geometry.json     — 500 Geometry questions
english_craft.json     — 500 Craft & Structure questions
english_info.json      — 500 Information & Ideas questions
english_sec.json       — 500 SEC questions
english_expression.json — 500 Expression of Ideas questions
```

## How to Generate (Claude Code session)

In a Claude Code session (costs nothing — uses context, not API):

```
/sat-paper math psda
```

Then ask: "Export all 22 questions as a JSON array matching the
bubbl question schema at /Users/avanti.srihari/Documents/Claude/SAT-App/docs/06_question_bank.md
and append to /Users/avanti.srihari/Documents/Claude/SAT-App/schema/seed/math_psda.json"

Repeat until each file has 500 questions.

## How to Seed into Supabase

### Option A — Python script (recommended)

```bash
pip install supabase python-dotenv
python3 schema/seed/seed.py --file schema/seed/math_psda.json
```

### Option B — Supabase Dashboard

1. Open Supabase Dashboard → Table Editor → questions
2. Click "Insert rows" → paste JSON array (max 500 rows at a time)

## seed.py

```python
#!/usr/bin/env python3
import json, sys, os, argparse
from supabase import create_client

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True)
    args = parser.parse_args()

    url = os.environ['SUPABASE_URL']
    key = os.environ['SUPABASE_SERVICE_KEY']
    supabase = create_client(url, key)

    with open(args.file) as f:
        questions = json.load(f)

    print(f"Seeding {len(questions)} questions from {args.file}...")

    batch_size = 500
    for i in range(0, len(questions), batch_size):
        batch = questions[i:i+batch_size]
        result = supabase.table('questions').insert(batch).execute()
        print(f"  Inserted rows {i}–{i+len(batch)}")

    print(f"Done. Total: {len(questions)} questions inserted.")

if __name__ == '__main__':
    main()
```
