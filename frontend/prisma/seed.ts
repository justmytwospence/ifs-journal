import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper function to create dates going back in time
const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
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

  const passwordHash = await bcrypt.hash('password123', 12)

  console.log('Creating test users...')

  // Try to find existing user first
  let testUser = await prisma.user.findUnique({
    where: { email: 'demo@ifsjournal.me' }
  })

  // If user doesn't exist, create it
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'demo@ifsjournal.me',
        passwordHash,
        emailVerified: true,
      },
    })
    console.log(`✅ Created user: ${testUser.email}`)
  } else {
    console.log(`✅ User already exists: ${testUser.email}`)
    // Delete existing journal entries for this user
    await prisma.journalEntry.deleteMany({
      where: { userId: testUser.id }
    })
    console.log(`✅ Deleted existing journal entries`)
  }

  console.log('Creating journal entries...')

  // Define all journal entries
  const entries = [
    // Entry 1 - Day 30 - Bad day at work
    {
      prompt: "How was your day?",
      content: `Ugh. Today sucked. My boss called me into her office and basically told me my work isn't good enough. She didn't say it like that but that's what she meant. She was like "we need to see more initiative from you" and "you need to be more proactive." I just sat there nodding like an idiot. I wanted to defend myself but I couldn't think of anything to say. My mind just went blank. Now I'm home and I can't stop replaying it in my head. I keep thinking of all the things I should have said. Why am I like this? Why can't I ever stand up for myself in the moment? I always freeze and then beat myself up about it later. I'm so tired of being like this. I'm tired of feeling like I'm not good enough at anything. Work sucks. I don't even like my job but I can't quit because I need the money. And even if I could quit, what would I do instead? I don't have any special skills or talents. I'm just average at everything. My friend keeps telling me I should try therapy but I don't know. That feels like admitting there's something really wrong with me. Plus it's expensive. I'll probably just keep doing what I'm doing - pretending everything is fine and hoping it gets better somehow. It won't though. I know it won't.`,
      wordCount: 230,
      daysAgo: 30,
    },
    // Entry 2 - Day 28 - Cancelled again
    {
      prompt: "What's on your mind?",
      content: `Sarah texted me asking if I want to get dinner this weekend. I said yes but I already know I'm going to cancel. I always do this. I make plans and then when the day comes I just can't do it. I don't know why. Like part of me really does want to see her. I miss her. We used to hang out all the time and now I barely see her. But then when it gets close to the actual day I just feel this dread. Like I can't handle it. It's too much effort to get ready and go out and be social and pretend I'm okay when I'm not. It's easier to just stay home. But then I feel guilty for canceling. And I worry that eventually she's going to stop asking. Who wants a friend who never shows up? I wouldn't. I'm being a shitty friend and I know it but I can't seem to stop. Maybe there's something wrong with me. Normal people don't have this much trouble just going to dinner with a friend. Normal people don't feel exhausted by the thought of basic social interaction. I used to be more social. In college I went out all the time. What happened to me? When did everything become so hard?`,
      wordCount: 210,
      daysAgo: 28,
    },
    // Entry 3 - Day 26 - Can't sleep
    {
      prompt: "What's keeping you up?",
      content: `It's 2am and I can't sleep. My brain won't shut off. I keep thinking about that thing I said at work today. It was so stupid. Everyone probably thinks I'm an idiot. Why did I say that? I should have just kept my mouth shut. I always do this. I say something and then spend hours obsessing over it. Replaying it over and over. Imagining what everyone must be thinking about me. They're probably not even thinking about it. They probably forgot about it five seconds later. But I can't let it go. I also ate way too much today. I wasn't even hungry but I just kept eating. Chips, cookies, leftover pizza. Now my stomach hurts and I feel disgusting. I told myself I was going to eat better this week. I lasted like two days. I have no self control. No wonder I can't get my life together. I can't even control what I put in my mouth. Tomorrow I have to go to that meeting and I'm already dreading it. I hate meetings. Everyone's so confident and has all these ideas and I just sit there with nothing to contribute. I feel like a fraud. Like everyone's going to figure out that I don't actually know what I'm doing. I should probably try to sleep. I'm going to be exhausted tomorrow. Which will make everything worse. Great.`,
      wordCount: 230,
      daysAgo: 26,
    },
    // Entry 4 - Day 24 - Family dinner
    {
      prompt: "How was your day?",
      content: `Had dinner at my parents' house. It was fine I guess. My sister was there with her perfect boyfriend. They're getting engaged soon probably. Everyone's so excited about it. My mom kept asking me about my life and I had nothing interesting to say. Work is fine. I'm fine. Everything's fine. I could tell she was disappointed. Like she wants me to have more going on. A boyfriend, a better job, some kind of exciting news. But I don't. My life is boring. My sister doesn't mean to but she makes me feel like such a loser. She has her shit together. Good job, great relationship, tons of friends. And I'm just... here. Existing. Going through the motions. My dad made some comment about how I should get out more. Meet people. Like it's that easy. I wanted to scream at him that I'm trying. That it's not as simple as just deciding to be different. But I didn't say anything. I just smiled and nodded and said yeah you're probably right. I'm so tired of pretending. Of acting like everything's okay when it's not. But what else am I supposed to do? Tell them I'm miserable? That I don't know what I'm doing with my life? That would just make them worry. It's easier to just keep it to myself.`,
      wordCount: 230,
      daysAgo: 24,
    },
    // Entry 5 - Day 22 - Scrolling again
    {
      prompt: "What did you do today?",
      content: `I wasted the entire day. Literally the entire day. I woke up at 11, scrolled on my phone for an hour in bed, finally got up and made coffee, then sat on the couch and watched TV and scrolled some more. Before I knew it it was 6pm. Where did the day go? I had plans. I was going to clean my apartment, go to the gym, maybe work on that project I've been putting off. But I did none of it. I just sat there like a zombie consuming content. And the worst part is I wasn't even enjoying it. I wasn't relaxing or having fun. I was just... numb. Avoiding. I don't even know what I'm avoiding. Life? Myself? The fact that I'm wasting my life? Now it's Sunday night and I have that awful feeling. You know the one. Where the weekend is over and you didn't do anything productive and tomorrow you have to go back to work and face another week of the same bullshit. I hate this feeling. I hate myself for wasting another weekend. I always tell myself next weekend will be different. I'll be productive. I'll do things. But I never do. I just keep repeating the same pattern over and over. What's wrong with me?`,
      wordCount: 220,
      daysAgo: 22,
    },
    // Entry 6 - Day 20 - Actually went to therapy
    {
      prompt: "How was therapy?",
      content: `Okay so I actually did it. I went to therapy. My first appointment. I've been thinking about it for months but I finally made myself go. I was so nervous I almost turned around in the parking lot. But I went in. The therapist seemed nice. She asked me why I decided to come and I didn't really know what to say. I just feel stuck? Unhappy? I don't know. I'm not suicidal or anything. I'm just not okay. She asked about my family and my job and my relationships. I told her everything's fine. Which is true I guess. Nothing's really wrong. I just feel wrong. Does that make sense? She said it makes sense. She said a lot of people come to therapy not because something terrible happened but because they're not living the life they want. That's exactly it. I'm just going through the motions. Wake up, work, come home, sleep, repeat. I'm not really living. I'm just existing. She asked what I want to be different. I don't even know. I just want to feel better. To feel like myself again. Except I don't know who myself is anymore. Did I ever know? We're going to meet weekly. She wants me to try journaling which is why I'm writing this. It feels weird but whatever. I'll try anything at this point.`,
      wordCount: 240,
      daysAgo: 20,
    },
    // Entry 7 - Day 18 - Weird memory
    {
      prompt: "What's on your mind?",
      content: `Something strange happened in therapy today. We were talking about why I'm so hard on myself and this random memory popped into my head. I was like 9 or 10. I brought home a test from school. I got a 95. I was so proud of myself. I ran to show my dad and he looked at it and said "what happened to the other 5 points?" I know he was probably joking. He jokes about everything. But I remember feeling like I'd failed. Like 95 wasn't good enough. I needed to be perfect. I told my therapist about it and she asked how that made me feel. I said I don't know, it was a long time ago. But then I realized I'm still like that. Still chasing perfection. Still feeling like nothing I do is good enough. I got a 95 but all I could see was the 5 points I missed. That's how I am with everything. I focus on what's wrong instead of what's right. My therapist asked what I would say to that little kid if I could go back. I started crying which was embarrassing. I would tell her that 95 is amazing. That she's smart and she did a great job. That she doesn't have to be perfect. But I can't say that to myself now. Why is it so much easier to be kind to a kid than to myself?`,
      wordCount: 250,
      daysAgo: 18,
    },
    // Entry 8 - Day 16 - Panic attack
    {
      prompt: "What happened today?",
      content: `I had a panic attack at work. In the middle of a fucking meeting. I couldn't breathe. My heart was pounding so hard I thought I was having a heart attack. I had to leave. Just got up and walked out. Everyone was staring at me. I locked myself in the bathroom and sat on the floor trying to breathe. It took like 20 minutes before I could calm down enough to leave. I don't even know what triggered it. We were just talking about some project. Nothing scary. But suddenly I just felt like I was dying. Like the walls were closing in. I've never had that happen before. Well, I've felt anxious plenty of times but never like that. Never where I couldn't control it. I'm terrified it's going to happen again. What if it happens somewhere worse? What if I'm driving or in public or somewhere I can't escape? I called my therapist and left a message. I don't know what she's going to say. Probably that I'm broken. That there's something seriously wrong with me. I knew I shouldn't have started therapy. I was fine before. Well, not fine. But I was managing. Now I'm falling apart. Maybe some things are better left alone. Maybe I should just quit therapy and go back to how things were. At least then I wasn't having panic attacks.`,
      wordCount: 240,
      daysAgo: 16,
    },
    // Entry 9 - Day 14 - Talked to therapist
    {
      prompt: "How are you feeling?",
      content: `Saw my therapist today. Talked about the panic attack. She said it's actually pretty common and that I'm not broken. She said sometimes when you start therapy and start dealing with stuff you've been avoiding, your body can react. Like it's been holding everything in for so long and now it's all coming out. She taught me some breathing thing to do if it happens again. Count to 4 breathing in, hold for 4, breathe out for 4. And try to notice things around me. Like what I can see and hear and touch. To ground myself in the present moment instead of spiraling. I guess that makes sense. When I was panicking I felt like I was somewhere else. Like I wasn't in my body. Everything felt far away and scary. She also said I should try to be nicer to myself about it. That beating myself up for having a panic attack just makes it worse. But I don't know how to not beat myself up. That's like my default setting. Something goes wrong and immediately I'm like "you're such an idiot, you're so weak, what's wrong with you." I don't know how to turn that off. She said we'll work on it. Great. Add it to the list of things that are wrong with me that we need to fix. I'm a work in progress I guess. Or just a mess. Probably just a mess.`,
      wordCount: 250,
      daysAgo: 14,
    },
    // Entry 10 - Day 12 - Actually okay day
    {
      prompt: "How was today?",
      content: `Today was actually okay. Not great, not terrible. Just okay. And honestly that feels like a win after the week I've had. Work was fine. I got my stuff done. Nobody yelled at me. I didn't have a panic attack. I even talked to a coworker at lunch instead of eating alone at my desk like usual. We just chatted about random stuff. It was nice. Normal. I forget what normal feels like sometimes. After work I went for a walk instead of immediately collapsing on the couch. It was nice out. There were dogs at the park. I love dogs. I've been thinking about getting one but I don't think I'm responsible enough. I can barely take care of myself. But maybe someday. I made myself an actual dinner instead of just eating cereal or ordering takeout. Nothing fancy, just pasta. But I cooked something. That's progress right? My therapist is always asking me to notice the small things. The small wins. So here they are. I got out of bed. I went to work. I talked to someone. I went for a walk. I cooked dinner. I didn't have a panic attack. I didn't cry. I didn't spend the whole day hating myself. That's something. That's actually something.`,
      wordCount: 220,
      daysAgo: 12,
    },
    // Entry 11 - Day 10 - Sarah again
    {
      prompt: "What's bothering you?",
      content: `Sarah texted me again. She wants to get coffee this weekend. I don't know what to say. I want to see her. I really do. I miss her. But I also don't want her to see me like this. I'm a mess. What am I supposed to say? "Hey sorry I've been MIA, I've been having panic attacks and going to therapy and generally falling apart"? She's going to think I'm crazy. Or she's going to feel sorry for me which is almost worse. I hate pity. But I also hate lying. And I've been lying to everyone. Saying I'm fine when I'm not. Saying I'm busy when really I'm just hiding. I'm so tired of pretending. But I don't know how to stop. If I stop pretending then I have to admit how not okay I am. And that's scary. What if people can't handle it? What if they leave? It's safer to just keep everyone at a distance. But I'm so lonely. I'm surrounded by people but I feel completely alone because nobody really knows me. They know the version of me I show them. The fine version. The together version. But that's not real. I don't know what to do. Maybe I should just say yes and see what happens. Maybe it won't be as bad as I think. Or maybe it will be worse. I don't know.`,
      wordCount: 240,
      daysAgo: 10,
    },
    // Entry 12 - Day 8 - Coffee with Sarah
    {
      prompt: "How did it go?",
      content: `I met Sarah for coffee. I almost canceled like five times but I made myself go. I'm glad I did. It was actually really nice. We talked for like two hours. At first it was the usual stuff. Work, family, whatever. But then I don't know what came over me. I just told her. I said I've been struggling. That I started therapy. That I'm sorry for being such a shitty friend lately. I was so scared she was going to judge me or think I'm crazy. But she didn't. She said she noticed something was off and she was worried about me. She said she's glad I'm getting help. And then she told me she went to therapy a few years ago for anxiety. I had no idea. She seemed so together. She said everyone's dealing with something. That it's okay to not be okay. We talked about real stuff. Not just surface level bullshit. It felt good. Really good. Like I could breathe for the first time in months. I forgot what it feels like to actually connect with someone. To be honest instead of just pretending everything's fine. When we left she hugged me and said we should do this more often. I said yes. And I actually meant it. Maybe I don't have to do this alone. Maybe it's okay to let people in.`,
      wordCount: 240,
      daysAgo: 8,
    },
    // Entry 13 - Day 6 - Presentation
    {
      prompt: "What happened at work?",
      content: `I had to give a presentation today. I've been dreading it all week. I hate public speaking. I always get so nervous and my voice shakes and I forget what I'm supposed to say. But I did it. I actually did it. It wasn't perfect. I definitely stumbled over some words and I'm pretty sure my face was bright red the whole time. But I got through it. My boss said it was good. A couple people asked questions which I guess means they were paying attention. I didn't pass out or throw up or have a panic attack. So that's a win I guess. I'm trying to be proud of myself but there's this voice in my head that keeps pointing out everything I did wrong. The parts where I messed up. The awkward pauses. The times I said "um" too much. Why can't I just be happy that I did it? Why do I have to pick apart every little mistake? My therapist would probably say I'm being too hard on myself. That I should celebrate the fact that I faced my fear and did the thing. And she's probably right. I did do it. Even though I was terrified. Even though I wanted to call in sick and avoid it. I showed up and I did it. That counts for something right?`,
      wordCount: 230,
      daysAgo: 6,
    },
    // Entry 14 - Day 5 - So angry
    {
      prompt: "How are you feeling?",
      content: `I'm so fucking angry today. At everything. At everyone. At myself. I don't even know why. Everything is pissing me off. My neighbor's music is too loud. My coworker won't stop talking. The barista got my coffee order wrong. Traffic was terrible. My apartment is a mess. My life is a mess. Everything is just WRONG. And I know I'm being irrational. I know these are small things that don't actually matter. But I can't help it. I'm just so angry. And I don't know what to do with it. I can't yell at people. I can't throw things. I can't just scream. So I'm just sitting here feeling like I'm going to explode. I hate feeling like this. I'm not an angry person. I don't get angry. I'm the person who's always nice and accommodating and fine with everything. But I'm not fine. I'm so not fine. And I'm angry that I'm not fine. I'm angry that I have to go to therapy and work on myself and deal with all this shit. I'm angry that other people seem to have their lives together and I don't. I'm angry that I wasted so much time being miserable. I'm angry that I'm still miserable. I'm just angry. And I don't know what to do about it.`,
      wordCount: 240,
      daysAgo: 5,
    },
    // Entry 15 - Day 4 - Talked about anger
    {
      prompt: "What did you talk about in therapy?",
      content: `Therapy today was about anger. I told my therapist about how angry I've been feeling and she said that's actually good. That anger is healthy. That I've been pushing it down for too long. She asked me what I'm really angry about. Not the surface stuff like my neighbor's music or whatever. The real stuff underneath. I said I don't know. But then I started talking and it all came out. I'm angry at myself for wasting so much time. For not getting help sooner. For letting myself be miserable for so long. I'm angry at my parents for not noticing I was struggling. For always expecting me to be perfect. For making me feel like I had to earn their love. I'm angry at my ex for treating me like shit. I'm angry at my friends for not checking on me more. I'm angry at the world for being so hard. For making me feel like I'm not enough. I'm angry that I have to work so hard just to feel okay. That other people seem to have it so easy and I don't. It's not fair. None of it is fair. My therapist just sat there and let me rant. She didn't try to fix it or make me feel better. She just listened. And when I was done she said "that makes sense." That's it. Just that it makes sense to be angry. That I have every right to be angry. I don't know why but that made me feel better. Like my anger is valid. Like I'm allowed to feel it.`,
      wordCount: 280,
      daysAgo: 4,
    },
    // Entry 16 - Day 3 - Bad day
    {
      prompt: "How are you?",
      content: `Today was shit. I couldn't get out of bed. I called in sick to work even though I'm not actually sick. I just couldn't do it. Couldn't face another day of pretending I'm okay. I spent the whole day in bed watching TV and hating myself. That voice in my head won't shut up. It keeps telling me I'm lazy. That I'm pathetic. That everyone else manages to function like a normal human being so why can't I. What's wrong with me? I feel like I'm failing at everything. I can't do my job right. I'm a terrible friend. I'm not making progress in therapy. I'm just a mess. A complete fucking mess. And I don't know how to fix it. I thought therapy was supposed to help but I feel worse than ever. Maybe I'm just broken. Maybe some people are just broken and can't be fixed. Maybe I'm one of those people. I don't want to feel like this anymore. I'm so tired. Tired of trying. Tired of failing. Tired of being tired. I just want to feel normal. To feel okay. Is that too much to ask? Apparently it is for me. I can't even manage okay. I'm going to try to sleep. Maybe tomorrow will be better. Probably not though.`,
      wordCount: 220,
      daysAgo: 3,
    },
    // Entry 17 - Day 2 - Feeling better
    {
      prompt: "How are you today?",
      content: `I feel a little better today. Not great but better than yesterday. I got out of bed. I showered. I made coffee. Small things but they feel like big accomplishments right now. I've been thinking about what my therapist said. About how it's okay to have bad days. That healing isn't a straight line. It goes up and down. And that's normal. I'm trying to be less hard on myself about it. Trying to accept that some days are just going to be hard and that doesn't mean I'm failing. It just means I'm human. I'm also trying to notice when that critical voice starts up. The one that tells me I'm lazy and pathetic and broken. When I notice it I'm trying to just acknowledge it. Like "okay, there's that voice again." Not believe it necessarily. Just notice it. My therapist says that's the first step. Noticing. Then eventually I can start to question it. To ask if it's actually true or if it's just an old pattern. I'm not there yet. But I'm trying. I called Sarah and apologized for being so up and down lately. She said it's fine. That she gets it. That she's here for me no matter what. I don't know what I did to deserve a friend like her. I'm lucky. Even when everything feels like shit, I have people who care about me. That's something.`,
      wordCount: 250,
      daysAgo: 2,
    },
    // Entry 18 - Day 1 - Party invitation
    {
      prompt: "What's stressing you out?",
      content: `Sarah invited me to a party this weekend. Some friend of hers is having a birthday thing. I immediately wanted to say no. Parties are my nightmare. A bunch of people I don't know, having to make small talk, pretending to be interesting. I'd rather do literally anything else. But I also know I should go. I should push myself. I should be social. That's what normal people do. They go to parties and have fun and don't have a panic attack about it. I told my therapist and she asked what I'm afraid of. Everything. I'm afraid of being awkward. Of not knowing what to say. Of standing in the corner by myself while everyone else is having fun. Of people judging me. Of confirming that I'm as boring and weird as I think I am. She asked what the worst thing that could happen is. I guess the worst thing is I go and it's terrible and I leave early. That's not the end of the world. But it feels like it. She suggested I just go for an hour. That I don't have to stay the whole time. That I can leave whenever I want. That makes it feel slightly less terrifying. Slightly. I don't know if I'm going to go. Part of me wants to. Part of me wants to prove to myself that I can do it. But part of me just wants to stay home where it's safe. I'll decide later.`,
      wordCount: 260,
      daysAgo: 1,
    },
    // Entry 19 - Day 0 - I went to the party
    {
      prompt: "How was the party?",
      content: `I went. I actually fucking went to the party. I almost didn't. I changed my outfit like five times. I sat in my car for ten minutes trying to convince myself to go in. But I did it. And it was... okay. Not amazing. Not terrible. Just okay. I was definitely anxious at first. I didn't know where to stand or what to do with my hands. I felt so awkward. But Sarah introduced me to some people and they were nice. We talked about normal stuff. Work, TV shows, whatever. Nothing deep but it was fine. There was this one guy who talked about hiking for like 20 minutes straight. I just nodded and asked questions. He seemed happy to have someone listen. I stayed for about two hours and then I left. I was exhausted. Social interaction is so draining. But I did it. I went to a party and I survived. Nobody was mean to me. Nobody laughed at me. I wasn't the most interesting person there but I wasn't the most boring either. I was just... there. Normal. A normal person at a normal party. I'm actually kind of proud of myself. I did something that scared me and it turned out okay. Maybe I can do more things that scare me. Maybe I'm not as broken as I think I am. Maybe I can actually do this. This whole getting better thing. Maybe.`,
      wordCount: 240,
      daysAgo: 0,
    },

  ]

  // Create all journal entries
  for (const entry of entries) {
    await prisma.journalEntry.create({
      data: {
        userId: testUser.id,
        prompt: entry.prompt,
        content: entry.content,
        wordCount: entry.wordCount,
        analysisStatus: 'pending',
        createdAt: daysAgo(entry.daysAgo),
        updatedAt: daysAgo(entry.daysAgo),
      },
    })
  }

  console.log(`✅ Created ${entries.length} journal entries`)
  console.log('\n🎉 Database seeding completed successfully!')
  console.log('\nTest account:')
  console.log(`  📧 demo@ifsjournal.me / password123 (with ${entries.length} journal entries)`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
