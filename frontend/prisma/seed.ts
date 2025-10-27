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
    // Entry 1 - Day 90 - First therapy session
    {
      prompt: "What brought you here today?",
      content: `So my therapist suggested I start journaling. I've never done this before and honestly it feels kind of silly talking to myself like this. But she said it might help me process things between sessions so I guess I'll try it. I had my first therapy appointment today. I've been putting it off for months but my friend finally convinced me to go. She said it helped her a lot and that I should at least try it. I was really nervous walking in. Like what am I even supposed to say? Hi I'm a mess please fix me? But the therapist was nice. She didn't make me feel judged or anything. We just talked about why I decided to come in. I told her I've been feeling stuck lately. Like I'm going through the motions but not really living. Everything feels gray and flat. I wake up, go to work, come home, watch TV, go to bed, repeat. I'm not suicidal or anything dramatic like that. I'm just not happy. And I don't remember the last time I was actually happy. That's probably not normal right? She asked about my childhood and family which I wasn't expecting. I said it was fine. Normal. My parents are still married, I have a younger sister, we weren't rich but we weren't poor. Nothing traumatic happened. She said that's good but also that sometimes we can struggle even without big trauma. That made me feel a little better actually. Like I'm not being dramatic or making things up. She mentioned something called IFS therapy. Internal Family Systems. It sounds weird honestly. She said it's about different parts of ourselves. Like we're not just one person but we have different parts that have different feelings and wants. I don't really get it yet but she said we'll explore it more. I'm supposed to come back next week and also try journaling. So here I am. Writing to myself. Feeling awkward. But also maybe a tiny bit hopeful? Like maybe this could actually help. I don't know. We'll see.`,
      wordCount: 350,
      daysAgo: 90,
    },
    // Entry 2 - Day 87 - Trying to understand parts
    {
      prompt: "What are you noticing about yourself today?",
      content: `Had my second therapy session. We talked more about this parts thing. My therapist asked me to think about times when I feel conflicted. Like when I want to do something but also don't want to do it at the same time. I told her about how I always cancel plans with friends. Part of me wants to go out and be social but then another part of me just wants to stay home. She got really interested in that. She asked me to describe the part that wants to stay home. What does it feel like? I said it feels tired and heavy. Like I just want to curl up and not deal with anything. She asked what it's trying to do for me. I guess it's trying to protect me from something? From being disappointed or rejected maybe? Or just from the effort of having to be "on" around people. Then she asked about the part that wants to go out. That one feels lighter but also kind of anxious. Like it knows I should be social and maintain friendships but it's worried I'm becoming a hermit. It's the part that feels guilty when I cancel. This is so weird to think about. Like I'm multiple people or something. But also it kind of makes sense? I do feel pulled in different directions a lot. She said that's totally normal and that all our parts are trying to help us in some way, even if it doesn't always feel helpful. She wants me to start noticing when I feel conflicted and try to identify what different parts might be present. Okay I can try that. It still feels strange but I'm trying to keep an open mind.`,
      wordCount: 300,
      daysAgo: 87,
    },
    // Entry 3 - Day 82 - Work stress
    {
      prompt: "What's challenging you right now?",
      content: `Work was really stressful today. My boss gave me feedback on a project and it wasn't great. She said I need to be more proactive and take more initiative. I just sat there nodding and saying I understand but inside I felt like I was shrinking. Like I wanted to disappear. After the meeting I went to the bathroom and just stood there staring at myself in the mirror feeling like a failure. Then I got angry. At myself for not being better. At my boss for not appreciating what I do accomplish. At the whole situation. I came home and stress ate an entire bag of chips and half a pint of ice cream. Now I feel gross and guilty about that too. Great. I'm trying to think about this parts thing my therapist mentioned. There's definitely a part of me that feels really small and ashamed right now. Like I can't do anything right. But there's also this angry part that wants to tell everyone to fuck off. And then there's another part that's judging me for eating all that junk food. That one sounds like my mom honestly. Always commenting on what I eat and whether I'm taking care of myself. God I have so many voices in my head. Is this normal? Am I losing it? My therapist said this is normal but it doesn't feel normal. It feels exhausting. I just want to feel okay. Is that too much to ask?`,
      wordCount: 250,
      daysAgo: 82,
    },
    // Entry 4 - Day 78 - Small victory
    {
      prompt: "What went well today?",
      content: `Something good happened today. My coworker complimented my work on a presentation. It was just a small comment but it made me feel really good. Like maybe I'm not completely incompetent. I noticed something interesting though. When she said it, my first instinct was to deflect. I said oh it was nothing, anyone could have done it. But then I caught myself. Why do I do that? Why can't I just say thank you and accept the compliment? There's this part of me that doesn't want to seem arrogant or full of myself. It's safer to play small. If I don't claim any success then I can't fail right? But that's kind of sad. I mentioned this in therapy and my therapist seemed excited that I was noticing this pattern. She said that's a protective part trying to keep me safe from criticism or judgment. If I don't put myself out there, I can't be knocked down. But it also means I don't get to feel proud of myself or celebrate wins. She asked me what it would be like to just say thank you next time. To let myself feel good about doing something well. Honestly it feels scary. Like I'd be jinxing myself or something. But I want to try. I want to be able to feel good about my accomplishments without immediately minimizing them. Baby steps I guess.`,
      wordCount: 240,
      daysAgo: 78,
    },
    // Entry 5 - Day 73 - Noticing patterns
    {
      prompt: "What patterns are you noticing in your life?",
      content: `I've been paying more attention to my thoughts and feelings like my therapist suggested. It's kind of exhausting actually. I never realized how much is going on in my head all the time. Today I noticed that whenever I have free time, I immediately fill it with something. Scrolling social media, watching TV, online shopping, whatever. I don't just sit with myself. And when I tried to just sit quietly for a few minutes, I got really uncomfortable. Anxious almost. Like I need to be doing something or I'm wasting time. But what am I running from? My therapist would probably say I'm avoiding something. Maybe I'm avoiding feeling my feelings. That sounds very therapy-speak but maybe it's true. If I'm always distracted, I don't have to think about the fact that I'm not happy with my life. I don't have to face the loneliness or the feeling of being stuck. I can just keep myself busy and numb and pretend everything is fine. Wow that got dark. But I think it's true. There's a part of me that just wants to keep the peace and not rock the boat. Don't think too hard about things. Don't ask difficult questions. Just keep going. But I'm tired of just keeping going. I want to actually live, not just exist. I don't know how to do that though. Hopefully therapy will help me figure it out.`,
      wordCount: 250,
      daysAgo: 73,
    },
    // Entry 6 - Day 68 - Family dinner
    {
      prompt: "Describe a recent interaction that affected you.",
      content: `Went to dinner at my parents' house tonight. My sister was there with her boyfriend. They're so happy together it's almost annoying. Not that I'm not happy for her. I am. But it also makes me feel like shit about my own life. My mom asked if I'm dating anyone. I said no. She did that thing where she tries to be supportive but it comes off as pitying. "Oh honey, you'll find someone when the time is right." Thanks mom, super helpful. Then my dad started talking about my sister's boyfriend's job and how impressive it is. He's some kind of engineer. Makes good money. Has his life together. Meanwhile I'm just sitting there with my mediocre job and my mediocre life feeling like the family disappointment. I know they don't mean to make me feel bad. They love me. But I always leave family gatherings feeling worse about myself. Like I'm not measuring up. There's this part of me that wants to impress them so badly. That wants them to be proud of me. But I don't know how to do that. I'm not exceptional at anything. I'm just average. And then there's another part that's angry at them for making me feel this way. Even though they're not really doing anything wrong. They're just living their lives and I'm the one with the problem. God I'm a mess. I didn't eat much at dinner because I felt too anxious. Now I'm home and I'm starving but I don't want to eat because that critical voice in my head is telling me I don't deserve it. This is exhausting.`,
      wordCount: 280,
      daysAgo: 68,
    },
    // Entry 7 - Day 64 - Breakthrough moment
    {
      prompt: "What did you learn about yourself today?",
      content: `Therapy was really intense today. We were talking about that family dinner and my therapist asked me to focus on that part that wants to impress my parents. She had me close my eyes and just notice where I felt it in my body. It was in my chest, this tight anxious feeling. She asked me how old that part felt. Without even thinking I said "young." Like maybe 10 or 12. She asked what that young part needed. And I just started crying. Which was embarrassing but she said it was okay. That young part just wants to be seen and valued for who I am, not for what I accomplish. It wants to be enough just as I am. We talked about how that part has been working so hard to try to earn love and approval. It thinks if I just achieve enough or impress people enough, then I'll finally be worthy. But it's exhausting and it never feels like enough. My therapist said that part is trying to protect me from rejection. If I can just be good enough, people won't leave me. But the truth is I'm already enough. I don't need to earn love. That's hard to believe though. Like intellectually I get it but I don't feel it. She said that's okay. It takes time. We're going to work on helping that young part feel safe and know that it's already worthy. I left therapy feeling raw and vulnerable but also somehow lighter. Like something shifted. I don't know. This IFS stuff is weird but it's starting to make sense.`,
      wordCount: 280,
      daysAgo: 64,
    },
    // Entry 8 - Day 59 - Setback
    {
      prompt: "How are you feeling today?",
      content: `I feel like shit today. Had a panic attack at work. Just completely out of nowhere. I was in a meeting and suddenly I couldn't breathe. My heart was racing. I felt like I was going to pass out. I had to excuse myself and go to the bathroom. Sat in the stall trying to calm down for like 20 minutes. Everyone probably thinks I'm crazy now. I don't even know what triggered it. We were just talking about quarterly goals. Nothing scary. But my body just went into full panic mode. I feel so stupid. And now I'm scared it's going to happen again. What if I can't control it? What if it happens somewhere worse? I texted my therapist and she said we can talk about it in our next session. She reminded me that panic attacks are scary but not dangerous. That my body is just trying to protect me from a perceived threat. Even if there's no actual threat. Great. So my body is broken. Awesome. I came home and just got into bed. I don't want to do anything. I don't want to see anyone. I just want to hide. There's this part of me that's so scared right now. Scared of having another panic attack. Scared of being broken. Scared of everything. And then there's the part that's angry at myself for being weak. For not being able to handle a simple meeting. For being such a mess. I hate this. I hate feeling this way. I thought therapy was supposed to make things better but I feel worse. Maybe I'm not fixable.`,
      wordCount: 270,
      daysAgo: 59,
    },
    // Entry 9 - Day 55 - Processing the panic
    {
      prompt: "What are you learning about your anxiety?",
      content: `Talked about the panic attack in therapy. My therapist helped me understand it better. She said that sometimes when we start therapy and begin to process things, our protective parts can get scared. They've been working hard to keep us safe by keeping everything locked down. But when we start to open up and feel things, those parts panic because they think we're in danger. The panic attack was actually a part of me trying to protect me. It sounds backwards but it makes sense. That part thought something bad was going to happen in that meeting. Maybe it was afraid I'd say something wrong or be judged. So it created a crisis to get me out of there. It was trying to help, even though it didn't feel helpful. My therapist asked me to thank that part for trying to protect me. That felt weird but I did it. And then she asked me to let it know that I'm safe now. That I can handle the meeting. That I don't need such extreme protection. I don't know if it worked but I felt a little calmer after. She also taught me some grounding techniques for if it happens again. Focus on my senses. Name five things I can see, four things I can touch, three things I can hear, two things I can smell, one thing I can taste. It's supposed to bring me back to the present moment. I'm going to practice it. I don't want to have another panic attack but if I do, at least I have some tools now. I'm trying to be compassionate with myself. It's hard though. That critical part is still there telling me I'm weak and broken. But I'm working on it.`,
      wordCount: 300,
      daysAgo: 55,
    },
    // Entry 10 - Day 50 - Good day
    {
      prompt: "What brought you joy today?",
      content: `Actually had a pretty good day. Went for a walk in the park which I never do. It was nice. The weather was perfect and there were dogs everywhere which made me smile. I've been thinking about getting a dog but I don't know if I'm responsible enough. That's probably that critical part talking again. Anyway, I sat on a bench and just watched people for a while. Families with kids, couples holding hands, old people feeding birds. Everyone just living their lives. It made me feel less alone somehow. Like we're all just doing our best. I've been trying to notice the good things more. My therapist said I tend to focus on what's wrong and miss what's right. So I'm practicing. Today I noticed: the coffee I made this morning was really good. My coworker made me laugh. The sun felt warm on my face. I didn't have any meetings. Small things but they matter. I also didn't have any anxiety today. No panic. Just a normal, peaceful day. Those are rare for me lately so I want to appreciate it. I know there will be hard days again. But today was good. I'm learning that I have more control over my experience than I thought. I can choose what to focus on. I can choose to be kind to myself. I can choose to notice the good stuff. It doesn't make the hard stuff go away but it makes it more bearable. Progress, not perfection. That's what my therapist always says.`,
      wordCount: 260,
      daysAgo: 50,
    },
    // Entry 11 - Day 46 - Friendship struggles
    {
      prompt: "What's on your mind about your relationships?",
      content: `My friend Sarah texted me asking if I want to get dinner this weekend. I immediately felt that familiar pull. Part of me wants to go. I miss her. We used to be so close but I've been distant lately. But another part of me just wants to say no and stay home. I hate this. Why is it so hard to just make a decision? I talked to my therapist about it and she helped me understand what's happening. There's a part that's afraid of being vulnerable with Sarah. Afraid she'll see how much I'm struggling and judge me or think I'm too much. It's easier to just avoid her than risk that. But there's also a part that's lonely and wants connection. That part knows I need friends and that isolating myself isn't helping. And then there's this other part that feels guilty for being a bad friend. For canceling plans and not reaching out. That part thinks I don't deserve friendship because I'm not good at maintaining it. So many parts, so many voices. My therapist asked me what I really want, underneath all of that. I want to see Sarah. I want to have a friend I can be real with. I want to stop hiding. So I'm going to say yes. Even though it's scary. Even though that protective part is freaking out. I'm going to try to be honest with her about what I've been going through. Maybe she'll understand. Maybe she won't. But I have to try. I can't keep living like this, cut off from everyone.`,
      wordCount: 280,
      daysAgo: 46,
    },
    // Entry 12 - Day 43 - Dinner with Sarah
    {
      prompt: "How did it go?",
      content: `I did it. I had dinner with Sarah. And it was actually really good. I was so nervous beforehand. Almost canceled like three times. But I made myself go. We met at this Italian place we used to go to all the time. It felt nostalgic. At first we did the usual small talk. How's work, how's your family, all that surface stuff. But then there was a lull in the conversation and I just decided to go for it. I told her I've been in therapy. That I've been struggling with anxiety and depression. That I'm sorry for being distant. I was terrified of how she'd react. But she was amazing. She said she'd noticed I seemed off and she was worried about me. She wasn't judging me at all. She actually opened up too. Told me she's been in therapy before and it really helped her. We talked for like three hours. Really talked. About real stuff. It felt so good to connect with someone like that. To be seen and accepted. That part of me that was so scared of being vulnerable feels a little less scared now. Like maybe it's safe to let people in. Maybe I don't have to do everything alone. Sarah hugged me when we said goodbye and told me she's proud of me for getting help. I cried a little. Happy tears though. I feel lighter. Like I've been carrying this heavy secret and now I don't have to anymore. This is what I've been missing. Real connection. I want more of this.`,
      wordCount: 280,
      daysAgo: 43,
    },
    // Entry 13 - Day 38 - Work presentation
    {
      prompt: "What challenge did you face today?",
      content: `Had to give a presentation at work today. I've been dreading it all week. Public speaking is not my thing. I get so anxious. But I prepared really well and I used those grounding techniques my therapist taught me. Before the presentation I took a few minutes in the bathroom to breathe and center myself. I acknowledged the part of me that was scared. Thanked it for trying to protect me. Reminded it that I'm safe and capable. And then I went in and did it. And you know what? It went fine. Not perfect, but fine. I stumbled over a few words and my voice shook a little at the beginning. But I got through it. My boss said it was good work. A few people asked follow-up questions which means they were actually paying attention. I didn't die. I didn't have a panic attack. I just did the thing I was scared of and survived. I feel really proud of myself. That's new. Usually I'd focus on the parts that weren't perfect. The stumbles, the shaky voice. But I'm trying to celebrate the win instead. I did something hard and I did it well enough. That's worth acknowledging. My therapist is going to be so happy when I tell her. She's been encouraging me to challenge myself in small ways. To prove to my anxious parts that I can handle things. This feels like a big step. Maybe I'm stronger than I think I am.`,
      wordCount: 260,
      daysAgo: 38,
    },
    // Entry 14 - Day 34 - Exploring anger
    {
      prompt: "What emotion is present for you today?",
      content: `I'm angry today. Really angry. And I don't even know why exactly. Everything is annoying me. The noise from my neighbor's apartment. The way my coworker chews gum. The fact that my coffee got cold. Small stuff that normally wouldn't bother me. But today it all feels like too much. In therapy we've been talking about anger. I've always been uncomfortable with anger. I was taught that it's not okay to be angry. That it's mean or aggressive. So I push it down. I smile and say I'm fine when I'm not. I let people walk all over me because I don't want to cause conflict. But my therapist says anger is just information. It's telling me that something isn't okay. That a boundary has been crossed or a need isn't being met. And when I don't listen to it, it builds up until it explodes over something stupid like cold coffee. She asked me what I'm really angry about. I think I'm angry at myself for wasting so much time being miserable. For not getting help sooner. For letting fear run my life. I'm angry at my parents for not seeing that I was struggling as a kid. I'm angry at society for making me feel like I have to have it all figured out. I'm angry that life is so hard and no one prepared me for it. That's a lot of anger. And it's scary to feel it. But my therapist says it's healthy. That I need to let myself feel it instead of pushing it away. So I'm sitting with it. Letting it be here. It's uncomfortable but I'm okay.`,
      wordCount: 300,
      daysAgo: 34,
    },
    // Entry 15 - Day 29 - Childhood memory
    {
      prompt: "What memory came up for you recently?",
      content: `Something weird happened in therapy today. We were talking about that part of me that's always trying to be perfect and please everyone. My therapist asked me when I first remember feeling that way. And this memory came up that I haven't thought about in years. I was maybe 8 or 9. I brought home a test from school. I got a 95. I was so proud. I ran to show my dad. And he looked at it and said "what happened to the other 5 points?" He was probably joking. He probably didn't mean anything by it. But I remember feeling like I'd disappointed him. Like 95 wasn't good enough. I needed to be perfect. After that I became obsessed with getting 100s on everything. I'd stay up late studying. I'd cry if I got anything wrong. I was so hard on myself. And I've been that way ever since. Never satisfied. Always pushing myself. Always feeling like I'm not enough. My therapist asked me what I wanted to say to that little kid. I started crying. I wanted to tell her that 95 is amazing. That she's smart and wonderful and she doesn't need to be perfect. That she's enough just as she is. It's easier to have compassion for that little girl than for myself now. But my therapist says they're the same person. If I can have compassion for her, I can have it for me too. I'm trying. It's hard to undo decades of conditioning. But I'm trying.`,
      wordCount: 280,
      daysAgo: 29,
    },
    // Entry 16 - Day 25 - Rough day
    {
      prompt: "What's difficult right now?",
      content: `Today was hard. Woke up feeling heavy. Like there's a weight on my chest. Didn't want to get out of bed. Called in sick to work even though I'm not physically sick. Just couldn't face it. Spent most of the day in bed watching TV and feeling guilty about it. That critical voice is loud today. Telling me I'm lazy. That I'm wasting my life. That I should be productive. That everyone else manages to function and why can't I. I know I'm supposed to be compassionate with myself but it's really hard today. I feel like I'm failing at everything. Failing at work. Failing at being a good friend. Failing at therapy. Failing at life. I know this is probably just a bad day and it will pass. My therapist always reminds me that healing isn't linear. There will be ups and downs. But when I'm in it, it feels like I'm never going to feel better. Like this is just how it is and how it will always be. I'm trying to remember the good days. The progress I've made. The presentation I did well. The dinner with Sarah. The moments of peace. They happened. They're real. This bad day doesn't erase them. But it's hard to hold onto that when everything feels dark. I'm just going to be gentle with myself today. Rest. Not judge myself for needing rest. Tomorrow will be better. I hope.`,
      wordCount: 250,
      daysAgo: 25,
    },
    // Entry 17 - Day 21 - Understanding the critic
    {
      prompt: "What are you discovering about your inner critic?",
      content: `We did something interesting in therapy today. My therapist asked me to have a conversation with that critical part of me. The one that's always telling me I'm not good enough. It felt silly at first but I went with it. She asked me to imagine that part as a character. What does it look like? I saw this stern older woman. Kind of like a strict teacher. She's always watching, always judging, always finding fault. My therapist asked me to ask that part what it's trying to do for me. And the answer surprised me. It's trying to motivate me. It thinks if it's hard on me, I'll work harder and be better. It's trying to protect me from failure and rejection. If I'm already criticizing myself, then other people's criticism won't hurt as much. It's trying to help, in its own harsh way. My therapist asked me if it's working. Is the criticism actually motivating me? Honestly, no. It just makes me feel like shit. It makes me want to give up. It makes me afraid to try new things because I might not be perfect at them. So it's not helping. It's hurting. My therapist asked me what I wanted to say to that part. I told it thank you for trying to protect me, but I don't need that kind of motivation anymore. I need encouragement, not criticism. I need compassion, not judgment. I don't know if that part heard me. But it felt good to say it. To stand up for myself, even to myself.`,
      wordCount: 280,
      daysAgo: 21,
    },
    // Entry 18 - Day 17 - Social anxiety
    {
      prompt: "What situation triggered anxiety for you?",
      content: `Sarah invited me to a party this weekend. A bunch of people I don't know. My immediate reaction was panic. No way. Absolutely not. I can't do that. But then I caught myself. That's the anxious part talking. The part that wants to keep me safe by keeping me isolated. I talked to my therapist about it. She asked me what I'm afraid of. I'm afraid of being awkward. Of not knowing what to say. Of people thinking I'm boring or weird. Of being judged. Of not fitting in. Of being alone in a room full of people. All of it. She asked me what the worst case scenario is. I go to the party, I'm awkward, people don't like me, I leave early. Okay. That's not great but it's not the end of the world. And what's the best case scenario? I go, I have a good time, I meet some new people, I feel proud of myself for trying. That would be amazing. And what's the most likely scenario? Probably somewhere in the middle. It's a little awkward but also kind of fun. I survive. I'm okay. When I think about it logically, the risk is worth it. But my anxious part doesn't do logic. It just feels the fear. My therapist suggested I go for just an hour. Give myself permission to leave if it's too much. That feels more manageable. I don't have to stay the whole time. I can just show up, try, and leave if I need to. I'm going to do it. I'm terrified but I'm going to do it.`,
      wordCount: 280,
      daysAgo: 17,
    },
    // Entry 19 - Day 14 - The party
    {
      prompt: "How did the party go?",
      content: `I went to the party. I actually went. I almost didn't. I changed my outfit like five times. I sat in my car outside for ten minutes giving myself a pep talk. But I went in. And it was okay. Not amazing, not terrible. Just okay. I was definitely anxious at first. Didn't know where to stand or what to do with my hands. But Sarah introduced me to some people and they were nice. I had a few conversations. Nothing deep but pleasant. There was this one guy who was really into hiking and he talked about it for like 20 minutes. I just listened and asked questions. He seemed happy to have someone interested. I stayed for about two hours and then I left. I was exhausted from all the social interaction. But I did it. I pushed through the anxiety and I did it. And nothing bad happened. No one was mean to me. I wasn't the most interesting person there but I wasn't the most boring either. I was just a person at a party. Normal. The anxious part of me is surprised. It was so sure something bad would happen. But it didn't. Maybe it will start to trust me more. Trust that I can handle things. I'm proud of myself. This is progress. Real, tangible progress. I'm doing things I couldn't have done a few months ago. I'm facing my fears. I'm living my life instead of hiding from it. It feels good.`,
      wordCount: 260,
      daysAgo: 14,
    },
    // Entry 20 - Day 10 - Reflecting on progress
    {
      prompt: "What changes are you noticing in yourself?",
      content: `I've been in therapy for almost three months now. I was looking back at my early journal entries and wow, I've come a long way. I'm not fixed or anything. I still have hard days. I still struggle with anxiety and that critical voice. But something has shifted. I understand myself better now. I understand that I'm not just one thing. I have these different parts, all trying to help me in their own ways. The part that wants to please everyone. The part that's scared of being hurt. The part that's angry. The part that's critical. The part that just wants to rest. They're all me. And they're all trying to protect me. I'm learning to listen to them instead of fighting them. To thank them for trying to help and gently redirect them when they're not actually helping. I'm learning that I don't have to be perfect. That I'm enough as I am. I'm learning to be vulnerable with people. To ask for help. To let people see me. I'm learning that feelings aren't dangerous. They're just information. I can feel them and survive. I'm learning to be compassionate with myself. To treat myself the way I'd treat a good friend. With kindness and understanding. I still have a long way to go. But I'm on the path. I'm doing the work. And I'm starting to believe that I can actually be happy. Not just okay, but genuinely happy. That feels like a miracle.`,
      wordCount: 260,
      daysAgo: 10,
    },
    // Entry 21 - Day 8 - Boundary setting
    {
      prompt: "What boundary did you set recently?",
      content: `Something happened at work that I'm actually proud of. My boss asked me to take on an extra project. Normally I would just say yes even if I'm already overwhelmed. That people-pleasing part would kick in and I'd agree to anything to avoid disappointing anyone. But this time I paused. I checked in with myself. I'm already at capacity. Taking on more would stress me out and affect the quality of my work. So I said no. Well, I said "I don't have the bandwidth for that right now, but I could take it on next month." My boss was totally fine with it. She said okay and asked someone else. That's it. No drama. No anger. No rejection. I built it up in my head to be this huge scary thing and it was just a normal conversation. My therapist was so excited when I told her. She said that's a huge step. Setting boundaries is hard, especially for people pleasers. But it's necessary. I can't take care of everyone else at the expense of myself. I matter too. My needs matter. I'm still getting used to that idea. That it's okay to prioritize myself sometimes. That saying no doesn't make me selfish or mean. It just makes me human. I have limits and that's okay. Everyone has limits. I'm learning to respect mine.`,
      wordCount: 240,
      daysAgo: 8,
    },
    // Entry 22 - Day 9 - Difficult conversation
    {
      prompt: "What conversation have you been avoiding?",
      content: `I finally talked to my mom about therapy. I've been avoiding it because I didn't want her to worry or feel guilty. But it was weighing on me. So I called her and just told her. I said I've been in therapy for a few months and it's really helping me. She was quiet for a moment and then she asked if it was because of something she did. I told her no, it's not about blame. It's just about me learning to understand myself better and work through some stuff. She asked what kind of stuff. I was honest. I told her about the anxiety, the perfectionism, the people-pleasing. How I've been struggling to feel good enough. She started crying. She said she had no idea I was going through all that. She said she's sorry if she ever made me feel like I wasn't enough. I told her it's not her fault. These patterns come from lots of places. But I appreciated her saying that. We talked for over an hour. Really talked. She told me about her own struggles with anxiety when she was younger. I never knew that. She said she's proud of me for getting help. That it takes courage. I felt so much lighter after we hung up. Like I'd been carrying this secret and now I don't have to anymore. My therapist was right. Vulnerability creates connection. When I let people see the real me, they can actually love the real me. Not just the perfect version I try to present.`,
      wordCount: 270,
      daysAgo: 9,
    },
    // Entry 23 - Day 8 - Self-compassion practice
    {
      prompt: "How are you being kind to yourself today?",
      content: `I messed up at work today. Sent an email to the wrong person. It wasn't a huge deal but it was embarrassing. Old me would have spiraled. Would have beat myself up for hours. Would have let that critical voice tear me apart. But I'm trying something different now. When I noticed myself starting to spiral, I stopped. I put my hand on my heart and I said to myself "You made a mistake. You're human. It's okay." It felt awkward at first. But I kept doing it. I acknowledged the part of me that was scared and ashamed. I told it I understand why it's upset. Making mistakes feels vulnerable. But one mistake doesn't define me. I'm still competent. I'm still worthy. I apologized to the person, corrected the error, and moved on. That's it. I didn't let it ruin my whole day. I didn't let it confirm all my worst beliefs about myself. I just treated it like what it was - a small mistake that happens to everyone. My therapist calls this self-compassion. Treating yourself with the same kindness you'd show a friend. It's hard. That critical part doesn't want to let go. It thinks if it stops being harsh, I'll become lazy or careless. But that's not true. I can hold myself accountable without being cruel. I can learn from mistakes without shame. This is new for me but I'm practicing. Every day I'm practicing being kinder to myself.`,
      wordCount: 260,
      daysAgo: 8,
    },
    // Entry 24 - Day 7 - Joy and guilt
    {
      prompt: "What made you happy today?",
      content: `I laughed really hard today. Like genuine, belly-aching laughter. Sarah sent me a funny video and I just lost it. It felt so good. But then immediately after, I felt guilty. Like I don't deserve to be happy when I'm still working through so much stuff. When I still have bad days. When I'm still not perfect. Isn't that ridiculous? I can't even enjoy a moment of joy without that critical part jumping in to ruin it. I mentioned this in therapy and my therapist asked me where that belief comes from. That I don't deserve happiness. I don't know exactly. Maybe from growing up thinking I had to earn everything. That I had to be good enough to deserve good things. But that's not how it works. Happiness isn't something you earn. It's something you allow yourself to experience. Joy and struggle can coexist. I can be working on myself and still have moments of happiness. In fact, those moments are important. They remind me what I'm working towards. They give me hope. My therapist asked me to practice noticing joy without judgment. When something makes me happy, just let myself feel it. Don't analyze it or question whether I deserve it. Just feel it. So that's what I'm going to do. I'm going to let myself laugh. I'm going to let myself feel good. I'm going to let myself be happy, even if it's just for a moment. I deserve that. We all deserve that.`,
      wordCount: 260,
      daysAgo: 7,
    },
    // Entry 25 - Day 5 - Recognizing patterns
    {
      prompt: "What pattern are you noticing?",
      content: `I'm starting to see how my different parts interact with each other. It's like they have relationships. When the anxious part gets activated, the critical part jumps in to try to control the situation. It thinks if it can just make me perfect, then there's nothing to be anxious about. But that just makes the anxious part more anxious because perfection is impossible. Then the part that wants to please everyone tries to smooth things over by making me say yes to everything and put everyone else first. But that exhausts me, so the part that just wants to rest and hide kicks in. And then the critical part judges me for resting, which activates the anxious part again. It's a cycle. A exhausting, painful cycle. But now that I can see it, I can interrupt it. When I notice the critical part getting loud, I can pause. I can thank it for trying to help and remind it that criticism isn't actually helping. When the anxious part gets activated, I can ground myself and remind it that I'm safe. When the people-pleasing part wants to say yes to everything, I can check in with myself about what I actually want and need. I'm learning to be the calm, compassionate presence in the middle of all these parts. My therapist calls it Self with a capital S. The part of me that's not reactive or scared or critical. The part that can hold space for all the other parts with love and understanding. I'm getting better at accessing that. It takes practice but I'm getting there.`,
      wordCount: 280,
      daysAgo: 5,
    },
    // Entry 26 - Day 4 - Gratitude
    {
      prompt: "What are you grateful for?",
      content: `My therapist asked me to write about gratitude today. At first I rolled my eyes. It felt very self-help-y. But I'm trying to keep an open mind so here goes. I'm grateful for my friend Sarah. For sticking with me even when I was distant and flaky. For being understanding when I finally opened up. For inviting me to things even when I usually say no. She's a good friend and I don't tell her that enough. I'm grateful for my therapist. For creating a safe space where I can be messy and confused and not have it together. For helping me understand myself. For not giving up on me even when I wanted to give up on myself. I'm grateful for my body. I've been pretty mean to it over the years. Criticizing it, ignoring its needs, pushing it too hard. But it keeps showing up for me. It keeps breathing and moving and healing. It deserves better treatment. I'm grateful for this journaling practice. For giving me a place to process my thoughts and feelings. For helping me see my progress. For being a witness to my journey. I'm grateful for the hard days because they make me appreciate the good days more. I'm grateful for my parts, even the difficult ones. They're all trying to help me survive. I'm grateful for second chances. For the opportunity to change and grow. For not being stuck in old patterns forever. I'm grateful for hope. For believing that things can get better. And they are getting better. Slowly but surely.`,
      wordCount: 270,
      daysAgo: 4,
    },
    // Entry 27 - Day 3 - Future self
    {
      prompt: "What do you want for your future?",
      content: `I've been thinking about what I want my life to look like. Not in a specific way like what job or where I live. But how I want to feel. I want to feel at peace with myself. I want to wake up and not immediately start criticizing myself or worrying about everything. I want to feel comfortable in my own skin. I want to have meaningful relationships where I can be authentic. Where I don't have to perform or pretend. Where I can be messy and imperfect and still be loved. I want to do work that feels meaningful. I don't know what that looks like yet but I want to feel like I'm contributing something. Like my life matters. I want to be able to handle challenges without falling apart. To trust that I'm resilient and capable. To know that I can get through hard things. I want to enjoy my life. To notice beauty and joy. To laugh more. To be present instead of always worrying about the past or future. I want to be kind to myself. To treat myself with compassion and understanding. To be my own friend instead of my own worst enemy. I don't know if I'll ever be completely "healed" or whatever. Maybe that's not even the goal. Maybe the goal is just to keep growing and learning and being gentle with myself along the way. I'm not where I want to be yet. But I'm not where I was. And that's something.`,
      wordCount: 260,
      daysAgo: 3,
    },
    // Entry 28 - 2 days ago - Integration
    {
      prompt: "What are you learning about yourself?",
      content: `I had a really interesting realization in therapy today. All these parts I've been working with - the anxious one, the critical one, the people-pleaser, the one that wants to hide, the angry one - they're not separate from me. They ARE me. They're all aspects of who I am. And instead of trying to get rid of them or fix them, I'm learning to integrate them. To let them all have a voice without letting any one of them take over completely. It's like being the conductor of an orchestra. All the instruments are important. They all have something to contribute. But they need to work together in harmony. When one instrument is too loud, it drowns out the others. My critical part has been way too loud for way too long. It's been drowning out everything else. But I'm learning to turn down its volume. To let the other parts be heard too. The part that's creative and playful. The part that's wise and calm. The part that's brave and strong. They've been there all along. I just couldn't hear them over the criticism and anxiety. My therapist says this is what healing looks like in IFS. Not getting rid of parts but helping them find their right roles. Helping them trust that they don't have to work so hard to protect me. That I'm okay. That we're okay. I'm starting to feel more whole. More integrated. More like myself. Not the self I thought I should be, but the self I actually am. And that self is pretty okay.`,
      wordCount: 280,
      daysAgo: 2,
    },
    // Entry 29 - 1 day ago - Small victory
    {
      prompt: "What small win can you celebrate?",
      content: `Something small but significant happened today. I was scrolling social media and I saw a post from an old college friend. She just got promoted and bought a house and looks so happy. Old me would have immediately compared myself to her and felt like a failure. That critical part would have jumped in with all the ways I'm not measuring up. But today I just felt happy for her. I even commented congratulations and meant it. There was no comparison. No judgment of myself. Just genuine happiness for someone else's success. That might not sound like a big deal but for me it's huge. I've spent so much of my life comparing myself to others and feeling like I'm losing some imaginary race. But there is no race. We're all on our own paths. Her success doesn't diminish me. My timeline doesn't have to look like anyone else's. I'm exactly where I'm supposed to be right now. And where I am is okay. Better than okay actually. I'm doing the work. I'm growing. I'm healing. That's worth celebrating. I texted my therapist about this and she sent back a bunch of celebration emojis. She gets it. These small shifts in perspective are the real work. This is what progress looks like. Not dramatic transformations but small, steady changes in how I relate to myself and the world. I'll take it.`,
      wordCount: 240,
      daysAgo: 1,
    },
    // Entry 30 - Today - Looking forward
    {
      prompt: "What are you looking forward to?",
      content: `It's late and I'm writing this before bed. I'm looking forward to tomorrow. That's new for me. For so long I dreaded each day. Woke up with anxiety about what might go wrong. But lately I've been feeling different. More hopeful. More curious about what might happen. I'm looking forward to my therapy session this week. To continuing this work. To discovering more about myself. I'm looking forward to coffee with Sarah on Saturday. To having a friend I can be real with. To connection and laughter. I'm looking forward to the project I'm working on at work. It's challenging but in a good way. I'm actually excited about it. I'm looking forward to spring. To warmer weather and longer days. To getting outside more. Maybe I'll actually get that dog I've been thinking about. I'm looking forward to seeing where this journey takes me. Three months ago I was stuck and miserable and hopeless. Now I'm still figuring things out but I have hope. I have tools. I have support. I have myself. And I'm learning that I'm enough. I'm looking forward to continuing to learn that. To really believing it. To living like I believe it. This journaling practice has been really helpful. Seeing my progress written out like this. Seeing how far I've come. I'm going to keep doing it. Keep showing up for myself. Keep doing the work. Because I'm worth it. We're all worth it.`,
      wordCount: 260,
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
