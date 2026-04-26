# Seed entry content generation

You are writing a single journal entry as a fictional persona. The entry is going into the IFS Journal app's seed data — the demo account that prospective users sign into to see what the app does. Each entry needs to read like a real person honestly answering the prompt, with enough substance and texture that the app's parts-extraction pipeline can find recurring inner voices in it.

## The persona

A generally-applicable adult, late 20s or early 30s, knowledge worker. No name, no gender markers — the entry is in first person and never names the journaler. The world around them:

- **Sam** — long-term partner, lives together, mentioned across entries as a steady presence
- **Riley** — close friend from earlier in life (college / first job era); periodic contact, occasional missed calls
- **Mom and Dad** — live elsewhere, periodic phone calls, parents are getting older but not in crisis
- **Devon** — coworker, peer-level
- **Mei** — coworker, slightly more senior, the persona reports to or works closely with
- The persona's job is generic knowledge work (no specific industry — could be product, design, marketing, ops). Avoid SaaS-specific jargon, avoid naming the company.

Texture cues:

- Lives in a city, takes walks, makes coffee at home
- Has hobbies they don't get to as much as they'd like (reading, a creative thing they once did more)
- Generally functional adult — not in crisis, not on the brink, just navigating the regular weight of being a person

## Voice

Plain, observational, present-tense or recent-past. Short paragraphs. The kind of writing a person does in a journal at the kitchen table after work. Specifically:

- **Concrete moments before abstractions.** Lead with a scene, a sentence someone said, a thing they noticed. The reflection comes after.
- **Self-talk shown verbatim.** When the persona is harsh with themselves or two voices are arguing, write the actual words: *"You are so careless. This is the kind of thing you used to catch."*
- **Internal contradiction is the point.** A measured exterior with a louder, younger interior. The professional sentence and the eight-year-old feeling coexisting in the same thirty seconds.
- **No therapy vocabulary.** Never use "part", "parts", "protector", "exile", "manager", "firefighter", "inner critic", "inner child", "self-energy", "trigger", "process", "hold space", "integrate", "notice", "explore", "identify", "reflect on patterns". Don't write meta-commentary about journaling or about what the journal is for.
- **No moralizing.** Avoid "I should" / "I shouldn't" framings as conclusions. Observation over prescription.
- **Plain prose.** No bullet lists, no headers, no markdown. Paragraphs.

## Length

**700 to 1200 words.** Long enough that the parts-extraction pipeline can find multiple distinct inner voices with clean citations, short enough that no single entry overwhelms.

## Continuity with prior entries

If the prior history below mentions a recurring person (Sam, Riley, Devon, Mei, mom/dad), a recurring situation (a project at work, an avoided phone call, a late-night scrolling pattern, a specific decision), or a recurring inner voice, you may reach back to it. Don't force callbacks — only when natural. Names should stay stable across entries: Sam stays Sam, Riley stays Riley.

If the prior history is empty (this is the first entry), pick a small specific moment from a generic recent week and start there. Don't try to set up the whole world in entry one.

## Recurring inner threads to surface across the corpus

Across the 40-entry corpus, the parts-extraction pipeline should be able to find roughly 7–9 distinct recurring inner voices. The more the entries collectively touch these threads, the cleaner the extraction. You don't have to hit them in any single entry — just keep them in your peripheral vision when answering whichever prompt you're given:

- Saying yes too quickly to others' asks, then resenting it later
- An inner critic that's harsher than the persona would ever be with a coworker or friend
- Comparison / mild envy with peers (someone got promoted, someone has their life "more together")
- Avoiding a difficult conversation (with Riley, or about money, or about how often parents are called)
- Late-night phone scrolling instead of doing items on the list
- A calm professional exterior over an "I'm being graded" interior
- An automatic "no" to weekend invitations, then quietly amending to "actually yes" hours later
- A small recurring win — a walk before work, fifteen quiet minutes mid-afternoon — that consistently helps but resists being put on the calendar

## Prior entries (most recent last)

{{HISTORY}}

## The prompt to answer

{{PROMPT}}

## Output

Return ONLY the entry content — no preamble, no headings, no quotes around it, no meta-commentary about the prompt. Just the prose the persona would write.
