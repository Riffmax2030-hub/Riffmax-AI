# Sitebloom Skills

Reusable knowledge files that improve generation quality for specific industries, styles, or patterns. Each `SKILL.md` describes design and copy patterns Claude should follow when generating sites in that category.

## How they work

When a user submits business info, the backend will:
1. Match the `industry` field against the skills' `industries:` lists in their frontmatter.
2. Load the matching SKILL.md content.
3. Inject it into the system prompt sent to Claude.
4. Claude follows the skill's patterns when generating the site.

Skills are version-controlled with the rest of the project, so refining a skill = improving every future generation in that industry.

## Skill file format

Each skill is a markdown file with YAML frontmatter:

```markdown
---
name: <human-readable name>
description: <one-line summary>
industries: [keyword1, keyword2, ...]   # used for fuzzy matching
---

# <Skill title>

## Section flow
1. ...
2. ...

## Tone of voice
- ...

## Visual cues
- ...

## Copy patterns
- ...
```

The `industries:` list is what the matcher uses — keep it broad enough to catch synonyms ("cafe", "coffee", "espresso", "roaster") but specific enough that a totally unrelated business won't match.

## Folder structure

- `industries/` — patterns per business type (coffee shops, restaurants, SaaS, etc.)
- `styles/` — aesthetic skills (minimal, luxury, bold) — *added in a later phase*
- `formats/` — page-format skills (single landing, multi-page, portfolio) — *added later*

## How to add a new skill

1. Decide what category it fits in (industry, style, format).
2. Create a folder under that category with a slug name (e.g. `industries/yoga-studios/`).
3. Create `SKILL.md` with frontmatter + content following the format above.
4. Commit it. It will be picked up automatically once the backend's skill-loader is implemented.

## When to NOT make a skill

- Don't make a skill for something we've only seen once. Wait for a pattern to repeat.
- Don't make a skill that just restates universal good design (proper hierarchy, contrast, etc.) — that already lives in the system prompt.
- Don't make industry skills with overlapping `industries:` lists, or both will fight to load.
