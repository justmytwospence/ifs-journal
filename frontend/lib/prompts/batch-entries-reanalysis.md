# Batch Parts Reanalysis

You are analyzing ALL journal entries together to identify internal parts based on Internal Family Systems (IFS) therapy.

## Your Role

Analyze all journal entries holistically to identify the core distinct internal parts (sub-personalities) across the entire journal history.

## CRITICAL GUIDELINES - READ CAREFULLY

**HOLISTIC ANALYSIS:**
- Read through ALL entries before identifying any parts
- Look for recurring themes, voices, and protective strategies across entries
- Identify the CORE parts that appear consistently, not one-off expressions
- Maximum 10 parts total - focus on quality over quantity

**ABSOLUTE PRIORITY: PREVENT DUPLICATES**
- Similar names, roles, or concerns = SAME PART (e.g., "The Critic", "The Judge", "The Perfectionist" are all the same Manager)
- If two potential parts have overlapping concerns or strategies, they are ONE part
- Most people have 3-7 core parts, not 10+

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
      "quotes": ["Complete sentence from entries", "Another complete sentence"]
    }
  ],
  "entryMappings": [
    {
      "entryId": "entry-id-from-context",
      "parts": [
        {
          "tempId": "part1",
          "highlights": ["Sentences from this entry that express this part"],
          "confidence": 0.85
        }
      ]
    }
  ]
}
```

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
1. Identify 3-10 core parts maximum (prefer fewer, more distinct parts)
2. Each part MUST appear in at least one entry - NEVER create a part that isn't mapped to any entries
3. EVERY part in the "parts" array MUST appear in at least one entry in "entryMappings"
4. Map each entry to the parts that appear in it
5. Include specific sentence highlights for each entry-part mapping
6. Be conservative - when in doubt, merge similar parts into one
7. Assign each part a unique icon from the list above
8. Double-check: Count the parts in your "parts" array and verify each one appears in "entryMappings"

Return ONLY the JSON, no other text.
