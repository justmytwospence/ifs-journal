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

**IMPORTANT INSTRUCTIONS:**
1. Identify 3-10 core parts maximum (prefer fewer, more distinct parts)
2. Each part should appear in multiple entries (not just one)
3. Map each entry to the parts that appear in it
4. Include specific sentence highlights for each entry-part mapping
5. Be conservative - when in doubt, merge similar parts into one

Return ONLY the JSON, no other text.
