# Riffmax AI Skills

Reusable knowledge files that improve generation quality for specific industries, styles, or patterns. Each `SKILL.md` describes design and copy patterns Claude follows when generating sites in that category.

## How the loader works

When `/api/build` is called, the backend:
1. Reads each `SKILL.md` under `industries/`.
2. Parses the YAML frontmatter to find each skill's `industries:` keyword list.
3. Checks if any keyword appears in the user's industry (case-insensitive substring match).
4. If a match is found, the skill body is appended to Claude's system prompt under "INDUSTRY-SPECIFIC PATTERNS".
5. Claude follows those patterns when generating the site.

The matched skill name is returned in the API response as `skill_used`, and the frontend shows it as a small pill on the preview.

## Skill file format

```markdown
---
name: <human-readable name>
description: <one-line summary>
industries: [keyword1, keyword2, ...]
---

# <Skill title>

## Section flow
1. ...

## Tone of voice
- ...

## Visual cues
- ...

## Copy patterns
- ...
```

`industries:` is the matcher's input — keep it broad enough to catch synonyms ("cafe", "coffee", "espresso") but specific enough that an unrelated business won't match.

## Adding a new skill

1. Create `industries/<slug>/SKILL.md`.
2. Fill in frontmatter and body following the format above.
3. Commit + push. The loader picks it up on the next deploy.

## Don't make a skill for

- Patterns we've only seen once. Wait for repetition.
- Universal good design (already in the system prompt).
- Industries with overlapping keyword lists — they'll fight to match.
