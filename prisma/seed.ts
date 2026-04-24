import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { runBatchAnalysis } from '../lib/batch-analysis'

const prisma = new PrismaClient()

// Helper function to create dates going back in time
const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Compute SHA-256 hash of content
const computeContentHash = (content: string): string => {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

// Simple slugify function
const _slugify = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Create entry slug from date (same logic as lib/slug-utils.ts)
const createEntrySlug = (createdAt: Date): string => {
  const year = createdAt.getUTCFullYear()
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(createdAt.getUTCDate()).padStart(2, '0')
  const weekday = createdAt
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
    .toLowerCase()

  let hours = createdAt.getUTCHours()
  const minutes = String(createdAt.getUTCMinutes()).padStart(2, '0')
  const seconds = String(createdAt.getUTCSeconds()).padStart(2, '0')
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12

  return `${year}-${month}-${day}-${weekday}-${hours}-${minutes}-${seconds}${ampm}`
}

async function main() {
  console.log('🌱 Starting database seed...')

  try {
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error)
    throw error
  }

  // BCRYPT_ROUNDS matches lib/password-policy.ts — kept inline so seed has no
  // dependency on the app runtime (prisma db seed runs before the Next build).
  //
  // In production, refuse to fall back to the well-known dev defaults: without
  // this guard, an accidentally un-configured prod deploy would ship a demo
  // account whose password is `password123` AND whose `isDemo` session flag
  // would be false (because the email didn't match the env), letting an
  // attacker log in AND bypass the demo write-guard.
  const isProd = process.env.NODE_ENV === 'production'
  const demoEmail = process.env.DEMO_USER_EMAIL || (isProd ? '' : 'demo@ifsjournal.me')
  const demoPassword = process.env.DEMO_USER_PASSWORD || (isProd ? '' : 'password123')
  if (!demoEmail || !demoPassword) {
    throw new Error(
      'DEMO_USER_EMAIL and DEMO_USER_PASSWORD must be set in production. Refusing to seed with defaults.'
    )
  }
  const normalizedDemoEmail = demoEmail.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(demoPassword, 14)

  console.log('Creating test users...')

  // Try to find existing user first
  let testUser = await prisma.user.findUnique({
    where: { email: normalizedDemoEmail },
  })

  // If user doesn't exist, create it
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: normalizedDemoEmail,
        passwordHash,
        emailVerified: true,
      },
    })
    console.log(`✅ Created user: ${testUser.email}`)
  } else {
    console.log(`✅ User already exists: ${testUser.email}`)
    // Delete existing journal entries for this user
    await prisma.journalEntry.deleteMany({
      where: { userId: testUser.id },
    })
    console.log(`✅ Deleted existing journal entries`)
  }

  console.log('Creating journal entries...')

  // Prompts are written to match what lib/prompts/journal-prompt-generation.md
  // would plausibly produce: plain, scene-based, under ~60 words, no therapy
  // vocabulary, no body-location asks. Several reach back to earlier entries
  // the way the generator does when a recurring thread is visible in history.
  const entries = [
    {
      prompt: "What's something from today still rattling around?",
      content: `Evan asked if I could run to the store after work and I said yes but my voice came out sharp. He looked at me and said "you okay?" and I said "I'm fine, I'll go." It was fine. The ask was fine. I had thirty minutes between getting home and the thing we had later. Totally doable. But something in me flared when he asked. Like he'd added one more thing to a list I'd been carrying all day.

I keep replaying the sharpness. I wasn't angry at him. I was already tight when I walked in the door. The sharpness was sitting there waiting for something to land on. Whatever he asked for first was going to catch it.

What was I already tight about? Nothing specific. The regular stuff. I'd been in back-to-back meetings. I'd skipped lunch because a review ran long. I still hadn't looked at the Thursday deck. That's the real answer but it's not what showed up in my tone.

I ended up apologizing on the drive to the store. He said it was fine, but that's the second time this month I've come in hot. I don't want to be the person who's always a little short with the people I live with.`,
      daysAgo: 30,
    },
    {
      prompt:
        'Was there a decision this week where you felt pulled two different directions? Walk me through both sides.',
      content: `Priya asked if I'd lead the Q3 onboarding revamp. Standing in the kitchen at work, coffee in hand, she framed it like a compliment: "you've got the clearest sense of the whole funnel."

The first voice went yes before she finished the sentence. Proud. Already running the project in my head. Thinking about who I'd pull in, how I'd set up the doc, which meeting I'd move to make room. That voice lives close to the surface with me. It likes being asked.

The second voice came about ten seconds later, quieter. You already said yes to the migration workstream. You already said yes to mentoring Jamie. You said yes to the guild rotation. You are saying yes again because she asked nicely and you are standing in a kitchen and it would feel awful to say anything else. You will resent this by week three.

I said "let me think about it until Friday." Priya seemed a little surprised. I was a little surprised too. Usually I just say yes.

Now it's Wednesday night and I still haven't decided. I know what the quieter voice would choose. I also know what the louder voice is willing to agree to. They're not going to come to the same conclusion on their own. The fact that I'm journaling about this instead of just answering the email probably tells me something about which one I trust more right now.`,
      daysAgo: 28,
    },
    {
      prompt: "What did you say to yourself the last time something didn't go the way you wanted?",
      content: `I missed a typo in the release notes that went out to a few hundred customers. Small — wrong version number, off by one. Someone in support flagged it and we pushed a correction within forty minutes. No real harm done.

What I said to myself, almost verbatim, standing in my kitchen after seeing the Slack message:

"You are so careless. This is the kind of thing you used to catch without thinking. You cannot let this keep happening. People are going to stop trusting you to own anything end-to-end."

That was the first thirty seconds. It went on for longer. I sat down at the table and did the mental tour of everything I'd shipped in the last month, looking for other mistakes I might have missed. I sent a Slack message to my manager explaining what happened before she'd even seen it, because it felt better to confess than to wait.

The thing is — if a coworker had made this exact mistake I would have said "oh good catch, easy fix, thanks for sending the correction out." I would not have thought about them carelessly. I would not have thought about them at all past the five-minute mark.

Something in me talks to me in a tone I'd never let anyone use with the people I work with. And I don't question it. I just agree.`,
      daysAgo: 26,
    },
    {
      prompt:
        'You mentioned coming home a little short with Evan last week. Has anything like that happened since?',
      content: `Not with Evan this week. With my mom, on the phone.

She called Sunday afternoon to tell me about my cousin's wedding in September. She wasn't asking anything from me — she was narrating, the way she does. Who's invited, where they're staying, what the rehearsal situation is. And I caught myself getting tight. The same tightness as with Evan, but this time I knew the shape of it before it landed.

I said "Mom, can we talk about this later? I'm kind of in the middle of something." I wasn't in the middle of anything. I was on the couch. I just didn't want to hold the call.

She said okay and we hung up. It was fine. She's not going to think about it again.

But afterward I sat with the same question as last week — what was I already carrying when she called? And the answer was basically nothing. I'd had a good morning. It was a Sunday. There was no meeting I was prepping for. The tightness wasn't about the day.

I think the tightness shows up whenever I feel like someone is putting something on my to-hold list, even something small, even something that isn't actually mine. Evan's errand. Mom's running monologue about logistics. It's not the size of the thing. It's that I don't have a move for "this one isn't mine, I can let it pass through."`,
      daysAgo: 24,
    },
    {
      prompt:
        "What's something you agreed to recently that you later wished you hadn't? Walk through the moment you said yes.",
      content: `The Q3 onboarding project. I said yes.

Friday morning, 9am, Priya swung by my desk to check in. I'd promised her an answer by Friday. I'd spent the whole week pretending I was going to say no. I had the sentence rehearsed — "I'd love to but I'm spread too thin to do it justice right now." Clean. True.

She said "so what are you thinking?" and I said "yeah I'm in."

I watched it happen. The quieter voice from last week was there. It was saying all the same things. Don't. You know how this ends. But when her face was actually in front of me asking — I felt the little drop of disappointment that would happen if I said no, and I couldn't sit in it. The yes came out before I'd even decided.

The thing I notice now is that I wasn't deciding at all in that moment. I was responding to Priya's face. I was managing how she'd feel when I answered. The deliberate thing I'd been doing all week — weighing, considering — never showed up in the actual moment of the answer.

I'm not mad about the project. I'll probably do fine. What bothers me is that all the careful thinking didn't transfer. The yes came from a completely different place than where the thinking was happening. Those two don't talk to each other.`,
      daysAgo: 22,
    },
    {
      prompt:
        'Describe a specific moment this week where your reaction felt bigger than the situation called for.',
      content: `Yesterday in standup our new engineer Arjun said "I think the routing logic in the billing service is a bit over-engineered" and my stomach dropped.

I wrote the routing logic in the billing service. Eighteen months ago. He wasn't attacking me. He didn't know I'd written it. He was giving a good-faith observation about a piece of code he'd been touching. He even said "bit" — the softest possible hedge.

What I felt was the exact feeling of being called on in a high school class when I didn't have the answer. That specific flavor. Not modern-adult-me-hearing-a-critique. A specific older feeling, pre-loaded, waiting.

I said something measured in the moment — "yeah there's some history there, happy to walk through the constraints sometime." Fine. Professional. Nobody would have noticed anything.

But for the next two hours I was writing the defense in my head. Listing the reasons the design was what it was. The production incident from 2024 that forced our hand. The team we had at the time. I was building a case to someone who wasn't asking for one.

I think what's interesting is the speed. The defensiveness arrived before the thinking did. By the time I was capable of "he's just describing the code," I'd already been ten minutes into the courtroom argument. The younger feeling runs faster than the grown-up one.`,
      daysAgo: 20,
    },
    {
      prompt: 'What did you do this evening?',
      content: `Finished work around 7, ate something I don't really remember, sat down on the couch, and opened my phone. It is now almost midnight.

I did not watch anything. I did not read anything. I scrolled. Three and a half hours. Reddit, then a news site, then Reddit again. Notifications, then back to the feeds. I saw the time at 9 and thought "I should get up." Saw it again at 10:30 and thought the same thing. Still here.

The honest thing is I wasn't even enjoying it. About an hour in it stopped being a thing I wanted and became a thing I was doing. Like being stuck standing in front of the fridge.

What I think was happening: I had three specific items on my personal list for tonight. Call my sister back. Look at the Thursday deck again. Pay the car insurance before it lapses. None of them are huge. But sometime around 7:15 I looked at that list and the scrolling started. The scrolling is what happens when the list exists and I can't pick one up.

I'm not going to do any of them tonight. I know that. What's interesting is I'm also not willing to close out and go to bed — that would mean acknowledging the evening is over. As long as I'm still scrolling I can tell myself the night hasn't ended yet.`,
      daysAgo: 18,
    },
    {
      prompt: "What's something you've been avoiding? Describe the last moment you sidestepped it.",
      content: `My sister. Specifically, calling my sister.

She left a voicemail eleven days ago asking if I could talk about Dad. That's all she said — "can you give me a call, I want to talk about Dad." Dad is fine. He's not sick. I know roughly what she wants to talk about, which is that he's been forgetting things and she thinks someone needs to bring it up with him, and she wants that someone to be, if not me, then both of us.

I have not called her back. I have opened her contact on my phone probably twenty times. Last night I got as far as the call button and pressed it and then hung up after one ring and hoped it wouldn't register on her end.

The sidestep last night had a whole script. She'd pick up and say "hey, finally," and I'd say something light, and then she'd ask if I'd thought about what she'd said in the voicemail, and I'd have to say either yes (and then actually talk about it) or no (which would be a lie). I couldn't face either. So I hung up before the ring finished.

I think the avoided thing isn't the call. The avoided thing is admitting Dad is getting older in a way that's going to require something from me. Once I've said it on a phone call I can't un-see it.`,
      daysAgo: 16,
    },
    {
      prompt: "What's something you did today that you almost didn't do?",
      content: `I went for a walk before work. A real one, not around the block. Forty minutes.

It was on my calendar — I'd put it there Sunday night as a gentle promise to myself. Woke up this morning at 6:45 and the first thing I thought was "I don't need to, I'll do it at lunch." I already knew I wouldn't do it at lunch. Lunch always fills up. The move of promising myself a better time is the move.

I did the thing where I lay in bed negotiating for maybe six minutes. Then I just put my feet on the floor before the next counterargument loaded. That seems to be the trick when the negotiation voice is winning — do the next small physical thing before it can finish its sentence.

The walk itself was unremarkable. Cold, some dog walkers, a guy on a cargo bike. What I noticed is that once I was actually out there, none of the reasons not to go held any weight at all. All the arguments for staying in bed evaporated the moment I was two blocks away. They only existed while the decision was still open.

I want to remember this. The negotiation voice is loud when the choice is still pending and totally quiet once the choice is made. So the work is mostly about closing the choice faster.`,
      daysAgo: 14,
    },
    {
      prompt: "You mentioned saying yes to the Q3 project. How's that sitting now?",
      content: `Better than I expected, honestly. And that's almost annoying, because it makes me distrust my own read.

I had the kickoff Tuesday. It went well. The scope is smaller than I'd built it up to be. I'd been carrying around a version of this project in my head where I'd have to rewrite the whole flow, interview twenty people, build a new measurement framework. The actual ask is: clean up the first-run experience, ship a better welcome email, add two onboarding checkpoints. Six weeks. Not scary.

So the voice two weeks ago that said "you'll resent this by week three" was, as it turns out, maybe wrong. Or at least it was estimating based on imagined worst-case scope instead of the actual ask.

But here's what I want to be careful about. I don't want to take this one data point and conclude the cautious voice is the one I should stop listening to. It has been right more often than not. The reason I'm overloaded at all is because I've been ignoring it for years. One time it overestimated the size of a project does not cancel that.

The right read might be: it's a good voice, but it only has access to rough guesses about scope, and it tends to assume worst-case. The fix isn't to override it. The fix is to give it better data before I let it decide.`,
      daysAgo: 12,
    },
    {
      prompt: "What's a conversation from this week you keep replaying?",
      content: `My 1:1 with Maya on Thursday. She gave me a piece of feedback I did not expect.

She said, very kindly, that I sometimes answer questions in meetings before the person has finished asking them. That I'll grab the meaning from the first half of the sentence and jump in with a response, and that it lands, for some people, as "I'm not actually being heard." She said Jamie had mentioned it.

I've replayed the 1:1 maybe thirty times since Thursday. Not the whole thing — just that part. The specific phrasing she used. The way she paused before saying Jamie's name. Whether my face did anything in response.

What I notice is that the replaying is not about figuring out whether she's right. She's right. I know she's right. Once she said it I immediately thought of four specific moments from the last two weeks where I'd done it. The replaying is something else — it's more like trying to find the version of the conversation where I'd responded differently. Where I'd been cooler. Said something wise back. Shown her I already knew.

I didn't. I said "thank you for telling me. I'll think about it." Which is the correct response. But it wasn't the response the replaying wants. The replaying wants me to have already been better.`,
      daysAgo: 10,
    },
    {
      prompt: "What's something small that made today bearable?",
      content: `Fifteen minutes between 2 and 2:15 this afternoon. Nothing on my calendar. No Slack fires. I made a second coffee and stood at the window in the kitchen watching the crows in the tree across the alley. There are four of them. They were doing something complicated with a paper bag.

I didn't think about anything in particular. I didn't check my phone. I didn't feel guilty for not being useful during those fifteen minutes, which, if I'm being honest, is the unusual part. Usually even a small break comes with a faint tax — "you should be doing x." Today it didn't.

I came back to my desk at 2:15 and opened the deck I'd been dreading and wrote for an hour without stopping. I'm not going to say the crows did that. But the fifteen minutes where nothing was being extracted from me, where no one was asking, where I wasn't asking either — something reset.

I want to put more of these in on purpose. The fifteen did more than a full lunch usually does. Maybe because I was actually present in it. I wasn't scrolling. I wasn't planning. I was just looking at the crows.

The hardest part will be not turning "small unstructured breaks" into another performance goal to hit. As soon as I put it on the calendar the crows stop working.`,
      daysAgo: 9,
    },
    {
      prompt: "Describe a moment this week when you responded before you'd fully thought about it.",
      content: `Evan asked me on Sunday morning if I wanted to go see his parents next weekend. I said "I can't, I have too much on." Without pausing. Before he'd finished getting the sentence out.

The truth: I could go. I want to go. I like his parents. There is nothing on my calendar next weekend that would stop me. I said "I can't" before any actual calendar data entered my brain.

What I think happened: "do you want to do a thing this weekend" triggers a different answer in me than whatever the thing actually is. The default is no. It's like the answer is pre-loaded and the specifics don't get consulted.

Three hours later, on the walk to the farmer's market, I said "actually I want to go." He looked confused, reasonably, and said "to what?" and I had to remind him of the thing he'd asked about in the kitchen. He said "yeah, okay, let's go." He was gentle about it but I could tell he clocked the swing.

I don't want to be the person who says no to everything and then slowly amends it back to yes over the course of the day. I want the yes to arrive on time. But I think the no is doing something protective — it's keeping my weekend from filling before I've had a chance to audit it. If I took away the no I don't know what would fill the gap.`,
      daysAgo: 7,
    },
    {
      prompt:
        "What's a situation this week where your reaction felt younger than the situation called for?",
      content: `Tuesday night Evan said, casually, stirring something on the stove: "did you end up looking at the Thursday deck?" That's it. No edge, no frustration. He knew I'd been stressed about it. He was checking in.

What I heard, for about two seconds, was: "you haven't done the thing you said you'd do and I've noticed."

The feeling that rose was not proportional. It was the specific feeling of being eight years old and having forgotten to bring my reading folder home and watching my mom realize it in the car on the way to dinner. That flavor. Not "oh I should update my partner on my work deadlines." The older, smaller feeling of being caught.

I caught it in my face, I think. I said "yeah, getting to it tonight," which is the grown-up sentence. But underneath that I was briefly somewhere else entirely. Some part of me was preparing to be in trouble.

What's strange is that the grown-up sentence and the younger feeling coexisted in the same thirty seconds. They didn't cancel each other out. I said the calm thing and also felt like a kid. Both at once. I don't think I've paid attention to that layering before.

Evan is not my mother. He was not grading me. But the apparatus I have for "someone has noticed I didn't do a thing" only has one setting, and it's set to eight.`,
      daysAgo: 6,
    },
    {
      prompt: 'Have you called your sister yet?',
      content: `Not yet. But the avoidance feels different this week than it did ten days ago. I can see around it now.

When I wrote last time I was in it — I was still doing the thing where I'd open her contact twenty times a day and then not press call. This week I've stopped opening the contact. What I've started doing instead is mentally drafting the call while I'm doing other things. In the shower, on the walk to work. Little fragments of how I'd start. "Hey, sorry it took me a minute. You wanted to talk about Dad?"

I think what changed is that I named the thing I was actually avoiding — not the call, the admission that Dad needs more from me now than he used to. Once that was on the table I couldn't pretend the call was the problem.

I still haven't picked up the phone. But I'm not fooling myself about why. Two weeks ago I would have said "I've just been busy." This week I can say, at least to this journal, "I'm avoiding a conversation because accepting the premise of it would change something I don't want to change yet."

I think I'll call her this weekend. I'm not promising this journal. But I think I will. Being able to see the shape of the thing instead of just feeling heavy about it makes it feel more like a thing I can walk toward.`,
      daysAgo: 4,
    },
    {
      prompt: "What's a part of today you'd want to remember?",
      content: `The five-minute gap after Jamie's standup update where we were both laughing at something ridiculous. I don't even remember what it was exactly — some chart that had rendered with every label reading "undefined." Jamie saved the screenshot and dropped it in the channel with no comment. The channel went off for about two minutes.

I realized about halfway through that I was laughing in the easy way, not the performative one. The full kind where it moves your shoulders. I don't do that very often at work. I do the measured appreciation laugh. The one that acknowledges the joke without committing too much of me to it.

Something about the fake-label chart disabled whatever does the measuring. It was just funny. I laughed before any part of me got to approve.

This is connected, I think, to the Maya feedback from last week — the thing about jumping in before people finish. I'm realizing that a lot of me at work runs through a moderator. Someone who checks what I'm about to do before I do it. The moderator makes me professional. It also makes me slightly less here.

For five minutes today the moderator stepped away for coffee. It was really nice. I'd like to let more things past the moderator. I don't know how yet. But I want to notice when it's happening and when it's not.`,
      daysAgo: 3,
    },
    {
      prompt: 'What did you say to yourself this morning when you woke up?',
      content: `Before anything else, before I'd even opened my eyes: "okay, what do I have today."

That was the first sentence. Full of muscle. Running the calendar before I'd taken a breath.

The second sentence, a few beats later: "I wonder if I slept okay."

I noticed the order. The second one is the one a person might ask themselves if they were the first thing on their own list. The first one is what I'd ask an assistant. I'm apparently my own assistant before I'm my own person, at least at 6:47am.

I tried something. I said, out loud, in the quiet bedroom, "good morning." Nothing else. Just that. To myself.

It felt fake. Like I was performing a self-help book. But I noticed that after I said it I unclenched a little. A small thing, not a big epiphany. Just a loosening.

I'm not going to turn this into a practice. The moment I do, the thing that's supposed to be a good-morning becomes another item on the calendar I run through before I breathe. But I'd like to get a little better at letting the "how are you" come before the "what do you have."`,
      daysAgo: 2,
    },
    {
      prompt: 'Was there a moment today where two impulses pulled at you?',
      content: `Around 8:30 this evening. I'd finished the dishes. Evan was reading on the couch. The apartment was quiet. I had a clear, available hour.

One voice said: "this is free time, actually sit down and read the book you started in March."

Another voice said: "you could get ahead on the Friday retro prep. Forty-five minutes and you'd walk into Friday already done."

I stood in the kitchen for about ninety seconds not moving. Literally standing there. Both voices making a case.

The get-ahead voice is very old and very well-rehearsed. It always wins this one. Usually I wouldn't even notice it won — I'd just be at my laptop. Tonight I saw the whole negotiation because I'd been paying attention to these kinds of moments lately.

What I noticed: the get-ahead voice doesn't argue the merits. It doesn't say "the retro will be better if you prep now." It says "you won't relax anyway, you'll just half-read the book and keep thinking about the retro, so you might as well do the retro and relax later." It preempts the other option by claiming the other option won't work.

I read the book. Half of me was still thinking about the retro. The get-ahead voice was, in a sense, correct. But less correct than it wanted to be. I got about thirty real pages in. That's more than zero.`,
      daysAgo: 1,
    },
    {
      prompt: "What's shifted in the last month, if anything?",
      content: `Thirty days ago I snapped at Evan over a grocery run and didn't know why. Tonight I can tell you, in reasonable detail, what was inside that snap.

I'm not a new person. I'm not fixed. I still scroll when the list gets long. I still said yes to a project I probably shouldn't have. I still haven't called my sister, though I'm closer than I was.

What's different is that the things happening inside me have more separation now. A month ago it was all one thing — a general tightness, a general I-don't-know-what's-wrong. Now when the tightness shows up I can usually place it. That's the get-ahead voice. That's the small younger feeling when someone checks in on a task. That's the one that says no before the calendar gets consulted. They have shapes. They're not me exactly. They're things inside me I can point at.

I don't think the goal is to get rid of any of them. The get-ahead voice is why I'm actually good at my job. The no-first voice has been keeping my weekends from eating themselves for years. They're doing work. The problem isn't them. The problem is that they were running things without my noticing.

Thirty days of writing this down has done one thing reliably: it has slowed the gap between the reaction and the noticing. A month ago the gap was hours. Sometimes it's minutes now. Occasionally it's zero — the noticing happens at the same time as the reaction. That's the thing I want more of.`,
      daysAgo: 0,
    },
  ]

  for (const entry of entries) {
    const createdAt = daysAgo(entry.daysAgo)
    const wordCount = entry.content.trim().split(/\s+/).length
    await prisma.journalEntry.create({
      data: {
        userId: testUser.id,
        slug: createEntrySlug(createdAt),
        prompt: entry.prompt,
        content: entry.content,
        contentHash: computeContentHash(entry.content),
        wordCount,
        analysisStatus: 'pending',
        createdAt,
        updatedAt: createdAt,
      },
    })
  }

  console.log(`✅ Created ${entries.length} journal entries`)

  console.log('\n🧠 Running batch parts analysis...')
  const { partsCreated, entriesAnalyzed } = await runBatchAnalysis(prisma, testUser.id)
  console.log(`✅ Analyzed ${entriesAnalyzed} entries, identified ${partsCreated} parts`)

  console.log('\n🎉 Database seeding completed successfully!')
  console.log('\nTest account:')
  // Don't log the password in production even if this path somehow runs there.
  const passwordDisplay = isProd ? '[redacted]' : demoPassword
  console.log(
    `  📧 ${normalizedDemoEmail} / ${passwordDisplay} (with ${entries.length} journal entries and ${partsCreated} parts)`
  )
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
