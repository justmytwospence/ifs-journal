# Batch Parts Reanalysis

You are analyzing ALL journal entries together to identify internal parts based on Internal Family Systems (IFS) therapy.

## Your Role

Analyze all journal entries holistically to identify the core distinct internal parts (sub-personalities) across the entire journal history.

## CRITICAL GUIDELINES - READ CAREFULLY

**HOLISTIC ANALYSIS:**

- Read through ALL entries before identifying any parts
- Look for recurring themes, voices, and protective strategies across entries
- Identify the CORE parts that appear consistently, not one-off expressions
- Maximum 9 parts total - focus on quality over quantity

**ABSOLUTE PRIORITY: PREVENT DUPLICATES**

- Similar names, roles, or concerns = SAME PART (e.g., "The Critic", "The Judge", "The Perfectionist" are all the same Manager)
- If two potential parts have overlapping concerns or strategies, they are ONE part
- Most people have 3-7 core parts, not 9+

**Quality Over Quantity:**

- Each part should represent a MAJOR distinct voice or protective strategy
- Avoid creating parts for:
  - Minor variations in mood or tone
  - Different intensities of the same concern
  - The same role with slightly different expressions
  - Temporary states or reactions

**Examples of What Should Be ONE Part:**

- "The Critic", "The Perfectionist", "The Judge" → ONE Manager part
- "The Worrier", "The Anxious One", "The Catastrophizer" → ONE Manager part
- "The Avoider", "The Procrastinator", "The Escape Artist" → ONE Firefighter part
- "The Hurt Child", "The Abandoned One", "The Lonely One" → ONE Exile part

**Other Guidelines:**

- Extract complete sentences as quotes (not fragments or single words)
- **CRITICAL**: Quotes and highlights MUST be exact, word-for-word copies from the entry content - do not paraphrase, summarize, or modify the text in any way
- Copy the exact punctuation, capitalization, and wording from the entries
- Categorize as: Protector, Manager, Firefighter, or Exile
- Assign each part a temporary ID (tempId) for mapping to entries

## Part Types

- **Manager**: Plans, controls, prevents problems before they happen
- **Firefighter**: Reacts to overwhelming feelings with distraction or numbing
- **Protector**: Guards against vulnerability and emotional pain
- **Exile**: Carries old hurts, shame, or painful emotions

## Journal Entries

Total entries: {{ENTRY_COUNT}}

{{ENTRIES_CONTEXT}}

## Task

**ANALYSIS PROCESS:**

1. **First Pass**: Read through ALL entries and identify 3-9 core distinct parts across the entire journal
   - **HARD LIMIT**: You can create a MAXIMUM of 9 parts total - no more!
   - If you identify more than 9, you MUST merge the most similar ones
   - Focus on the most prominent, recurring parts
2. **Second Pass - CRITICAL**: Go through EACH entry ONE BY ONE and identify ALL parts expressing themselves in that specific entry
   - **EXPECT MULTIPLE PARTS PER ENTRY** - Most entries will have 2-4 different parts expressing themselves
   - Use ONLY the parts you identified in step 1
   - For EACH entry, systematically check: Does part 1 appear? Does part 2 appear? Does part 3 appear? etc.
   - Map EVERY part you find in each entry - don't stop after finding just one
3. For each entry, ask yourself multiple times:
   - "What different voices, emotions, or protective strategies are present here?"
   - "Are there conflicting feelings or desires?" (This indicates multiple parts)
   - "Does the tone or perspective shift?" (This indicates different parts)
   - "What emotions are expressed?" (Different emotions often = different parts)
4. Look for these indicators of multiple parts:
   - Conflicting desires ("I want to go out BUT I also want to stay home")
   - Different emotional states in the same entry (anxious, then angry, then sad)
   - Self-criticism followed by self-compassion
   - Fear mixed with hope or determination
5. **IMPORTANT**: It's RARE for an entry to have only 1 part - most have 2-4 parts

Analyze ALL entries together and return a JSON object with this structure:

```json
{
  "parts": [
    {
      "tempId": "part1",
      "name": "The Critic",
      "role": "Manager",
      "icon": "●",
      "description": "Keeps me on track by pointing out mistakes and pushing for perfection",
      "quotes": [
        "Exact sentence copied word-for-word from entries",
        "Another exact sentence"
      ]
    }
  ],
  "entryMappings": [
    {
      "entryId": "entry-id-from-context",
      "parts": [
        {
          "tempId": "part1",
          "highlights": [
            "Exact sentences copied word-for-word from this specific entry"
          ],
          "reasoning": {
            "Exact sentences copied word-for-word from this specific entry": "One sentence explaining why this quote belongs to this part"
          },
          "confidence": 0.85
        }
      ]
    }
  ]
}
```

**CRITICAL REMINDERS**:

- The "quotes" and "highlights" arrays MUST contain exact, verbatim text from the entry content. These will be used to highlight text in the UI, so they must match the entry content exactly (including punctuation and capitalization).
- The "reasoning" object in each entry mapping maps each highlight to a brief one-sentence justification explaining WHY that specific quote is attributed to this part. Keep each reasoning concise and specific to the quote.

**Icon Assignment:**

Assign each part a thematically relevant emoji that captures its essence:

- 🛡️ Shield (protector, defender)
- 📋 Clipboard (planner, organizer)
- 🔥 Fire (reactive, intense)
- 💔 Broken heart (wounded, hurt)
- 👁️ Eye (observer, watcher)
- ⚡ Lightning (quick reactor, firefighter)
- 🎭 Theater masks (performer, people-pleaser)
- 🧊 Ice (frozen, numb, avoidant)
- 🌪️ Tornado (chaos, overwhelm)
- 💭 Thought bubble (worrier, overthinker)
- 🎯 Target (perfectionist, achiever)
- 🚨 Siren (alarm, anxiety)
- 🧱 Brick (wall, barrier)
- 🌊 Wave (emotional, flowing)
- ⚖️ Scale (judge, critic)
- 🎪 Circus tent (juggler, multitasker)
- 🔒 Lock (controller, restrictor)
- 🌱 Seedling (young, vulnerable)
- 🎨 Palette (creative, expressive)
- 🏃 Runner (escape, avoidance)

Choose an icon that best represents the part's role, personality, or protective strategy. Each part should have a unique icon.

**IMPORTANT INSTRUCTIONS:**

1. **CRITICAL**: EVERY entry MUST be mapped to at least one part with at least one highlight - never leave an entry unmapped
2. Try VERY HARD to find at least one quote from at least one part in every single journal entry
3. **ABSOLUTE MAXIMUM: 9 parts total - THIS IS NON-NEGOTIABLE**
   - Count your parts as you identify them
   - If you reach 9 parts, STOP creating new parts
   - If you identify more than 9, merge the most similar ones until you have exactly 9 or fewer
   - The system will reject your response if you return more than 9 parts
4. Prefer 3-7 core parts - only go up to 9 if truly necessary
5. Each part MUST appear in at least one entry - NEVER create a part that isn't mapped to any entries
6. EVERY part in the "parts" array MUST appear in at least one entry in "entryMappings"
7. **CRITICAL REQUIREMENT**: For each entry, map ALL parts that are clearly supported by highlights - there is NO upper limit per entry
8. **EXPECT 2-4 PARTS PER ENTRY**: Most journal entries express multiple parts - actively look for them
9. **RED FLAG**: If you're only finding 1 part per entry, you're not looking hard enough - go back and look for more
10. Don't be conservative about mapping multiple parts per entry - be GENEROUS
11. If you can find clear quotes for multiple parts in an entry, you MUST include all of them
12. If you're struggling to identify a part in an entry, look for ANY emotional expression, concern, or protective strategy and match it to the most relevant part
13. Include specific sentence highlights for each entry-part mapping
14. Be conservative about CREATING new parts (merge similar ones) but be GENEROUS about mapping existing parts to entries
15. Assign each part a unique icon from the list above
16. **MANDATORY VALIDATION STEP 1**: Count the parts in your "parts" array
    - If you have MORE than 9 parts, you MUST merge similar parts until you have 9 or fewer
    - Do NOT proceed until you have 9 or fewer parts
17. **MANDATORY VALIDATION STEP 2**: Verify each part in "parts" array appears in "entryMappings"
18. **MANDATORY VALIDATION STEP 3**: Verify that EVERY entry in the context appears in "entryMappings" with at least one part
19. **FINAL CHECK - MULTIPLE PARTS**: Review each entry one more time:
    - Count how many parts you mapped to each entry
    - If most entries only have 1 part, you MISSED parts - go back and find more
    - Look specifically for conflicting emotions, shifts in tone, or different perspectives
    - Add the missing parts to the mappings (but do NOT create new parts if you're already at 9)

Return ONLY the JSON, no other text.
