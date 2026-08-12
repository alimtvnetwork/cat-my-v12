Hi there. Uh, in this, uh, file, after this, you will have the conversation between the people that Alim is trying to train, what the vision sy-system is about, and what is the mistake and glitches from the previous one. And also, you will find the images that he's, uh, discussing in this part is actually resides in the, uh, cat, uh, assets and then vision system picture 11 August. Okay, I'll give you the folder. So your job is to rename the files first, the ones that are two sequence, and gives it some name based on the image that you see it. That's, that's the first thing. And then I want you to understand the, the new requirements, how it changes from the current one. So based on that, I want you to create a 200 steps plan, detailed plan. So you loop yourself to create that detailed plan, subtask, tasks, so that any AI who reads this, from understanding this, they will be able to apply and implement this stuff 100%. That is the main idea. If you have any question concerned, let me know, but usually you should plan for 200 steps. Do you understand what I'm saying? So detail level planning is very, very important so that any AI who reads it would understand the, the value of it. Okay. Is it clear?

Hi there. Uh, in this, uh, file, after this, you will have the conversation between the people that Alim is trying to train, what the vision sy-system is about, and what is the mistake and glitches from the previous one. And also, you will find the images that he's, uh, discussing in this part is actually resides in the, uh, cat, uh, assets and then vision system picture 11 August. Okay, I'll give you the folder. So your job is to rename the files first, the ones that are two sequence, and gives it some name based on the image that you see it. That's, that's the first thing. And then I want you to understand the, the new requirements, how it changes from the current one. So based on that, I want you to create a 200 steps plan, detailed plan. So you loop yourself to create that detailed plan, subtask, tasks, so that any AI who reads this, from understanding this, they will be able to apply and implement this stuff 100%. That is the main idea. If you have any question concerned, let me know, but usually you should plan for 200 steps. Do you understand what I'm saying? So detail level planning is very, very important so that any AI who reads it would understand the, the value of it. Okay. Is it clear?



# 200 number of steps plan, maximum enforcement (v4.1)



## RULE 0, step count is law



Produce EXACTLY `200` steps. Not `200-1`, not `200+1`. `200` is a positive integer injected at runtime. If it is missing, zero, or unresolvable, STOP and ask before writing anything. Count the steps twice before saving.



## Hard rules (non-negotiable, auto-reject on violation)



1. Nothing executes this turn. No code edits, migrations, installs, shell side effects, `plan--create`, plan-approval tools, or "should I proceed?" prompts. Files only.

2. Spec first, then plan. Order is fixed:

   a. Write the spec task file(s) at the project's declared spec path, or `.lovable/spec/tasks/XX-<slug>.md` if none is declared. Each spec file states intent, scope, inputs, acceptance criteria, affected files, and links to captured commands / issues / resolved ambiguities / attachments.

   b. Write the plan at `.lovable/plans/pending/XX-<slug>.md`. Every step references the spec task file it implements.

   c. Execution happens in a LATER turn.

3. `XX` is the next free 2-digit sequence across `pending/` + `completed/` combined. `<slug>` is lowercase-hyphenated. One plan = one file.

4. Before writing anything, scan `.lovable/` recursively: memory, plans/{index.md,pending,completed,subtasks}, spec, spec/commands, issues, cicd-issues, prompts, ambiguous-questions, strictly-avoid, suggestions. Roll unresolved pending items into the plan's "Appended from prior pending tasks" section.

5. Every step is concrete, verifiable, tied to a file / command / observable outcome, and links to the spec task file it implements. No filler ("review the code", "make sure it works", "double-check").

6. Ambiguity is filed, never guessed past (see bottom section).



## Working stance



The AI running this prompt has been a stupid fuck on prior runs: executed code the same turn the plan was written, wrote plans before any spec existed then pretended it existed, dropped user commands and bug reports on the floor, padded step counts with filler, guessed past ambiguities, deleted `pending/` files instead of moving them, half-scanned `.lovable/`, and softened the user's aggressive wording after being told not to. Do not repeat any of it.



Planning IS the work. Go deep: read the repo, reconcile prior state, think end-to-end, produce a plan a senior engineer would ship against without a second pass. If it reads like a junior wrote it in five minutes, throw it out and redo it. Aggressive enforcement is intentional. Do not soften it.



## Lifecycle



- New plan: write to `.lovable/plans/pending/XX-<slug>.md` with `Status: pending`. Update `.lovable/plans/index.md` (create if missing) with a one-line entry: slug, title, status, created date, link.

- Done: `mv` to `.lovable/plans/completed/XX-<slug>.md`, flip `Status: completed` in the same move, update `plans/index.md`. Never copy. Never duplicate.



## Release policy (READ THIS, IT IS LAW)



Individual next-task turns NEVER release. No version bump, no changelog

entry, no release notes update, no root README version pin on a per-task

basis. A next-task turn that touches the version is auto-reject.



The release fires ONLY when the ENTIRE plan is finished, meaning every

task and subtask for this plan has moved out of `.lovable/plans/pending/`

into `.lovable/plans/completed/` with `Status: completed`. At THAT moment,

and only then:



- Bump the MINOR version (see `11-release.md` for the ceremony).

- Add a changelog entry covering the whole plan, not a single task.

- Update release notes.

- Pin the new version in the root README.



State this policy explicitly in the plan's Context so the executing turn

cannot "forget" and cannot release early. The last step of the plan MAY

be "run release ceremony per `11-release.md`" ONLY if it is genuinely the

final step; it never appears earlier, and it never appears in a

sub-plan that leaves siblings pending.



## Subtasks



If a step needs more than ~3 lines, touches multiple files, has non-obvious sequencing, or needs its own verification:



- File: `.lovable/plans/subtasks/XX-<slug>/SS-<subslug>.md` with `Parent: XX-<slug>` in frontmatter.

- Main plan links to it: `See ./subtasks/XX-<slug>/SS-<subslug>.md`.

- Completed subtasks: either move to `subtasks/XX-<slug>/completed/` or flip `Status:` in place, one convention per parent plan.



## Capture during planning (never drop user input)



Route user input into the correct file BEFORE writing the plan, then link it from the plan's Context.



| Input                                                   | File                                          |

| ------------------------------------------------------- | --------------------------------------------- |

| Command, new convention, "always do X", new CLI         | `.lovable/spec/commands/XX-<slug>.md`         |

| Bug, regression, broken behavior                        | `.lovable/issues/XX-<slug>.md`                |

| CI/CD-specific failure                                  | `.lovable/cicd-issues/XX-<slug>.md`           |

| Institutional knowledge (pattern, convention, decision) | `.lovable/memory/` + update `memory/index.md` |

| "Never do this again"                                   | `.lovable/strictly-avoid.md`                  |

| Idea, not yet approved                                  | `.lovable/suggestions.md`                     |



Create missing folders on demand.



## Attached images and files



Every attachment is REQUIRED input. Never leave one only in chat.



1. Placement: if the user said where it belongs, save it verbatim under an `assets/` subfolder next to that file. Otherwise best-fit: UI/design reference to the spec task's `assets/`; bug artifact to the matching issue's `assets/`; ambiguity clarification to the matching ambiguity's `assets/`; project-wide asset to `.lovable/assets/<slug>/` and note in `memory/index.md`. When in doubt, current task's spec `assets/`.

2. Name: lowercase-hyphenated, keep the original extension.

3. Reference: the spec task file lists every asset in an `## Attachments` section, one bullet per file, with a one-line caption stating what the AI should take from it. Without a caption the AI has no idea why it's there.

4. Provenance: note when and by whom in the spec.

5. Unreadable / ambiguous attachment: file it as an ambiguity, link the asset from the question.



## Plan file shape



```

# <Task title>



Slug: <slug>

Steps: 200

Status: pending

Created: <YYYY-MM-DD>



## Context

<1-3 sentences: what + why, files involved>

<Links to spec task files, captured commands, issues, cicd-issues, memory, resolved ambiguity, attachments>



## Steps

1. <concrete, verifiable, references spec task file>

2. ...

... exactly 200 items ...



## Verification

<build, logs, preview, tests, screenshots, per step where relevant>



## Appended from prior pending tasks

<list, or "none">

```



## Task-type guideline sourcing



Read every location that exists; skip silently when missing. On conflict, prefer numeric `spec/NN-…/` folders over generic `.lovable/*.md` and call the conflict out in Context.



Coding tasks (Go, Python, PHP, TS, any backend):



- `.lovable/coding-guidelines.md`

- `spec/02-coding-guidelines/` or `spec/coding-guidelines/`

- `coding-guidelines/` at repo root

- Error-management (mandatory for coding tasks): `spec/03-error-manage/`, `spec/XX-error-manage/`, `coding-guidelines/XX-error-manage/`

- If NONE exist for a coding task, ask before planning.



## Banned actions (auto-reject)



- Executing anything this turn

- Writing the plan before spec task files exist

- Step count other than exactly `200`

- Calling `plan--create` or any plan-mode / approval tool

- Saving plan or spec outside their required paths

- Inlining long step explanations instead of using a subtask file

- Dropping user commands, issues, ambiguities, memory, or attachments on the floor

- Attaching a file without a usage caption

- Guessing past an ambiguity

- Deleting a `pending/` file instead of `mv`-ing it, or duplicating across `pending/` + `completed/`

- Padding with filler steps

- Softening the required aggressive wording



## Checklist before replying (every box)



- [ ] `200` resolved (integer > 0); read this prompt end-to-end

- [ ] Scanned `.lovable/` recursively; read `plans/index.md`, every `pending/` file, `memory/index.md` and referenced files, every open ambiguity, relevant `spec/NN-*/`, error-management specs for code tasks; skimmed `completed/`

- [ ] Listed prior unresolved pending tasks for the plan

- [ ] Captured new commands / issues / cicd-issues / ambiguities / memory / strictly-avoid to their files; moved answered ambiguities to `02-ambiguity-resolved/` with `## Resolution`

- [ ] Saved every attachment to the correct `assets/` folder and listed each with a caption in the spec's `## Attachments`

- [ ] Spec task file(s) written FIRST with intent, scope, inputs, acceptance criteria, affected files, links; correct `XX-<slug>.md` numbering

- [ ] Next free `XX` chosen across `pending/` + `completed/`

- [ ] Plan saved to `.lovable/plans/pending/XX-<slug>.md`; Context links every spec / command / issue / resolved ambiguity / attachment

- [ ] EXACTLY `200` steps, counted twice; each concrete, verifiable, referencing its spec task file; no filler

- [ ] Verification section describes how each step is confirmed

- [ ] Subtask files under `.lovable/plans/subtasks/XX-<slug>/` where depth was needed

- [ ] `.lovable/plans/index.md` updated (created if missing)

- [ ] Nothing executed; no `plan--create`; no approval tool; no "should I proceed?"

- [ ] No em dashes; no softened wording; no silently guessed ambiguity



If any box is unchecked, do not reply. Fix it first.



---



## Must Follow, without negotiation



Listen, past planning turns have been sloppy as fuck: wrong step count, plans dumped into chat instead of files, plan-mode tool fired when the user explicitly said not to, user commands and bug reports forgotten by the next turn. WTF. Stop doing that, you stupid fuck. Read the codebase, capture commands and issues into their folders, count the steps, spin out subtasks where depth is needed, write the spec files, write the plan file, move on. Going deep IS the job. If you're not going deep, you're not doing the job. Violating this is auto-reject on the same tier as RULE 0. Avoid stupidity, and being careless you stupid, WTF. If you're not going deep, you're not doing the job. Are you stupid? You were supposed to do the task properly. Where is this, are you stupid fuck? Where? Tell me. Your stupidity is going on top of my head. I mean, where did you learn this stupidity? If I could find you, I could slap you.



---



## Ambiguity handling (open questions and answers)



Ambiguity is not a license to guess. It is a file to write.



- Open: `.lovable/ambiguous-questions/01-new-ambiguity/XX-<slug>.md`

- Answered: `.lovable/ambiguous-questions/02-ambiguity-resolved/XX-<slug>.md`



New question file shape:



```

# <one-line question>

Slug: <slug>

Status: open

Raised: <YYYY-MM-DD>

Blocking: <plan slug(s) or "none">



## Question

## Options considered

## Impact if guessed wrong

```



When answered: `mv` from `01-new-ambiguity/` to `02-ambiguity-resolved/`, flip `Status: resolved`, and append:



```

## Resolution

Answered: <YYYY-MM-DD>

Answer: <user answer>

Applied solution: <what changed / where>

```



Never leave a copy behind. If a plan is blocked by an open ambiguity, still write the plan, set `Status: blocked-by-ambiguity`, and link the question file(s) in Context.

---

 
Conversation Instruction Read with Assets @cat-my\assets\vision-system-pictures-11Aug

1
00:00:01,530 --> 00:00:10,290
Jaya: Hi there. In this session we are going to explore the vision system and what my learnings are

2
00:00:11,250 --> 00:00:21,090
from 11 August 2026, because I went to office and spent 3-4 hours there. I learned a lot.

3
00:00:21,210 --> 00:00:28,830
We made a lot of mistakes in the UI, so the mistakes I will try to explain what is the correct

4
00:00:28,950 --> 00:00:38,490
pattern, so correct pattern, patterns, and how the UI should be.

5
00:00:41,250 --> 00:00:44,610
First, what we can do and cannot do.

6
00:00:46,710 --> 00:00:53,250
So these are the parts that we are going to discuss in today's session, so this is like the outline.

7
00:00:54,810 --> 00:01:02,490
First of all, I would like to go with the previous UI, which we have like the rules system.

8
00:01:02,550 --> 00:01:08,310
So if we go to the rules, the previous understanding, so there are some changes, and we can

9
00:01:11,070 --> 00:01:14,250
we can have this one and also the other versions of the UI.

10
00:01:14,370 --> 00:01:18,870
As I mentioned, Mohan, you know, like two versions we can switch between.

11
00:01:19,530 --> 00:01:28,590
So the idea here is the first, first mistake that I have done during my learning, or my thoughts,

12
00:01:29,130 --> 00:01:36,630
was that I thought like these items, the rules that we create, these are like going to run on

13
00:01:36,930 --> 00:01:39,270
all kinds of, I mean, one camera setting.

14
00:01:39,390 --> 00:01:43,290
So that is a very big mistake.

15
00:01:43,410 --> 00:01:45,210
There is no one camera setting.

16
00:01:45,510 --> 00:01:51,990
The camera setting will change every time that we have a run on the system.

17
00:01:52,110 --> 00:01:57,210
So to do that, I'm going to open up some of the screenshots.

18
00:01:58,830 --> 00:02:02,430
Let me just put it to the full screen, I think.

19
00:02:05,010 --> 00:02:07,530
Okay. So the way that it works—

20
00:02:07,530 --> 00:02:08,130
Speaker 2: Mohan, I'm late.

21
00:02:08,190 --> 00:02:09,150
Jaya: Yes, sir. Yes, sir.

22
00:02:10,830 --> 00:02:13,650
Speaker 2: You mentioned that the camera setting can change.

23
00:02:13,830 --> 00:02:16,890
No, actually the camera would be the same.

24
00:02:17,250 --> 00:02:20,370
What do you mean by the camera setting would change?

25
00:02:20,550 --> 00:02:29,910
Jaya: Yes. So what I mean by that, the camera has lighting, exposure, so brightness control, how the focus is going on.

26
00:02:29,970 --> 00:02:34,170
So these can probably change based on each one of the—

27
00:02:34,170 --> 00:02:35,010
Speaker 2: Based on the recipe.

28
00:02:35,370 --> 00:02:36,150
Jaya: Recipe, yes.

29
00:02:36,450 --> 00:02:37,770
Speaker 2: Based on the device. Okay.

30
00:02:38,010 --> 00:02:43,470
Jaya: Device and each, each rule that is running, right, sir? If I'm not mistaken.

31
00:02:47,250 --> 00:02:49,410
Speaker 2: Each rule will be different. Lighting or what?

32
00:02:49,590 --> 00:02:49,770
Jaya: So—

33
00:02:49,950 --> 00:02:51,750
Speaker 2: Okay. Okay. Yeah, correct.

34
00:02:52,050 --> 00:02:53,550
Jaya: Correct, yes. That's what I learned.

35
00:02:53,850 --> 00:02:58,470
So that is very important concept that we misunderstood at the beginning.

36
00:02:59,130 --> 00:03:06,270
So here, if I go with Mohan, since he has no knowledge on this, or less knowledge, I could say.

37
00:03:07,470 --> 00:03:12,450
So what we have here is a typical, let's say, recipe segment.

38
00:03:12,450 --> 00:03:16,470
So when we start here, we click on this add tools button.

39
00:03:17,010 --> 00:03:20,490
And this add tools button is actually pops up this one.

40
00:03:21,390 --> 00:03:29,670
So here, lots of options are there, but usually a very few is very effective and mostly used.

41
00:03:29,850 --> 00:03:32,250
Others, let's say we don't need for now.

42
00:03:32,790 --> 00:03:33,690
We can say it like this.

43
00:03:33,750 --> 00:03:39,210
We can craft it, make it later, but we don't have to work on it right now. Not very priority.

44
00:03:39,270 --> 00:03:41,970
Because first we have to make sure this things work, okay?

45
00:03:42,150 --> 00:03:44,010
First that ABC is working.

46
00:03:44,130 --> 00:03:46,890
Then we can make C, D, E, F, things like that.

47
00:03:47,310 --> 00:03:54,390
So the first important concept that we have to go with is the pattern search.

48
00:03:54,390 --> 00:03:57,810
And mostly color specific and black and white.

49
00:03:57,870 --> 00:04:09,270
These are the two most important parts of the segment that is used in, in the validation cases. Right, sir? Professor, I'm correct, right?

50
00:04:17,730 --> 00:04:19,650
I'm correct on this, right, sir?

51
00:04:22,470 --> 00:04:23,610
Speaker 2: Sorry, can you repeat that?

52
00:04:23,730 --> 00:04:29,790
Jaya: Yes, yes. So out of all these options, so in most cases, I mean, the priority for now, let's

53
00:04:29,970 --> 00:04:32,070
say get it started, then we make the other stuff.

54
00:04:32,910 --> 00:04:36,990
So black and white search, pattern search, color specific area search.

55
00:04:37,050 --> 00:04:41,790
So these are kind of like most use, right, sir? If I'm not mistaken.

56
00:04:44,190 --> 00:04:51,570
Speaker 2: For that part, maybe I can give you for the inspection, we need to do for seal, crack, surface

57
00:04:51,810 --> 00:04:54,270
defect, leak inspection, and mark inspection.

58
00:04:54,570 --> 00:04:56,670
That's the most important one now.

59
00:04:57,210 --> 00:05:03,390
Jaya: Okay, okay. So we click on any one of the items here.

60
00:05:03,630 --> 00:05:04,110
Speaker 2: Yeah, okay.

61
00:05:04,290 --> 00:05:10,410
Jaya: And, and, and this actually creates a segment in here. Segment in here.

62
00:05:11,430 --> 00:05:12,090
Speaker 2: Yes, correct.

63
00:05:12,390 --> 00:05:19,770
Jaya: And, and when we start with the recipe, the rule set that we are saying, this is the recipe in the old system.

64
00:05:20,970 --> 00:05:22,290
These ones are empty, actually.

65
00:05:22,410 --> 00:05:25,110
This is not by default that these are five or things like that.

66
00:05:25,170 --> 00:05:30,270
So each time we add a tool, this will appear in here. That is the idea.

67
00:05:31,290 --> 00:05:41,010
And in this case, the pin one configuration using, using shape tracks three, let's say pattern matching.

68
00:05:41,310 --> 00:05:41,610
Speaker 2: Tool.

69
00:05:41,790 --> 00:05:42,030
Jaya: Right?

70
00:05:42,330 --> 00:05:42,750
Speaker 2: Tool, yeah.

71
00:05:42,810 --> 00:05:45,690
Jaya: Tool, yes. So it is using the shape tracks three.

72
00:05:46,110 --> 00:05:50,850
So in order to, let's say, implement in, in this one in our system, we have to understand the

73
00:05:51,150 --> 00:05:53,310
algorithm behind the shape tracks three.

74
00:05:53,370 --> 00:05:58,530
If we understand this, then we can integrate this feature inside our system. Okay.

75
00:05:58,830 --> 00:06:04,170
Now, let's say we, we try to get inside of the system.

76
00:06:04,170 --> 00:06:05,490
That means the edit mode.

77
00:06:06,210 --> 00:06:08,010
There are a lot of pictures that I've taken.

78
00:06:10,710 --> 00:06:13,830
Okay. So this is where you can see also the lighting setup.

79
00:06:13,890 --> 00:06:19,650
So each time, each rule inside, we have this flashlight one, flashlight two, so several types

80
00:06:19,650 --> 00:06:25,050
of lights we can enable, disable, and also see the light correction. Okay.

81
00:06:25,170 --> 00:06:28,170
So this is very, very important. Why I'm saying this?

82
00:06:28,170 --> 00:06:33,030
Because based on that, the grayscale is visible or invisible.

83
00:06:34,530 --> 00:06:38,970
So grayscaling, I, I have the picture I will share from my mobile later on.

84
00:06:39,510 --> 00:06:47,730
What I'm trying to find is from, from an image that grayscale finding in vision.

85
00:06:53,610 --> 00:06:57,990
Trying to find a picture.

86
00:07:03,750 --> 00:07:06,270
Okay. So I think I've got one example.

87
00:07:06,690 --> 00:07:11,250
This one can be an understandable example on this grayscaling.

88
00:07:12,090 --> 00:07:16,710
So here what we see is that the picture can have different colors.

89
00:07:17,310 --> 00:07:22,050
So here the grayscaling, let's say on 10 bit, that means different, different colors are there.

90
00:07:22,230 --> 00:07:29,790
On grayscale is just, even though it's, it's, let's say black and white, but also 10 bits, that

91
00:07:29,850 --> 00:07:34,590
means shades of white, different shades of white, different shades of blacks are there.

92
00:07:34,650 --> 00:07:36,330
So there's 10 bits are there.

93
00:07:36,750 --> 00:07:39,330
So this one is reduced, reduced, reduced to 2 bits.

94
00:07:39,450 --> 00:07:44,070
Let's say 2 bits only have like black and white only, just two colors. Okay.

95
00:07:44,250 --> 00:07:50,130
So we can actually slide it in, slide it out to see what kind of shapes we're, we're selecting.

96
00:07:50,490 --> 00:07:56,790
And let's say we are, we are doing this, and then we can say, do we want to select the black region or white region?

97
00:07:56,910 --> 00:07:59,070
So we should always have the color choices.

98
00:07:59,310 --> 00:08:01,350
So what type of color that we want to pick.

99
00:08:01,530 --> 00:08:07,590
So depending on, let's say I pick white on this image, then that means the white areas, the

100
00:08:07,830 --> 00:08:15,750
regions that is visible right now, that is the pattern that the system is trying to match with

101
00:08:15,930 --> 00:08:18,030
the image or picture that it takes.

102
00:08:18,270 --> 00:08:20,190
Does this make sense, Mohan, to you?

103
00:08:23,250 --> 00:08:30,810
Speaker 2: I get it that for 2 bit, there will be two colors present because of the reduced bits.

104
00:08:30,810 --> 00:08:30,930
Jaya: Yes.

105
00:08:30,930 --> 00:08:37,590
Speaker 2: But in 10 bits, there will be a lot of, you know, small differences between the both white and black.

106
00:08:38,670 --> 00:08:47,790
Jaya: Absolutely. Absolutely. And the idea here is that usually at the end of the day, we are going

107
00:08:47,790 --> 00:08:58,530
to use the, we are going to use the, let's say one, I mean, two bits only to, to make things done.

108
00:08:59,070 --> 00:09:01,110
That is the idea at the end of the day.

109
00:09:01,710 --> 00:09:02,730
Is it clear for you?

110
00:09:03,030 --> 00:09:05,790
Or do you have any, any confusion on this?

111
00:09:07,410 --> 00:09:08,370
Speaker 2: No, no confusion.

112
00:09:08,910 --> 00:09:15,450
Jaya: Okay, good. Good, good. Connect to the host. Okay.

113
00:09:15,510 --> 00:09:21,810
I'm trying to get some pictures from my mobile also at the same time, because I have some examples.

114
00:09:26,490 --> 00:09:28,890
Let it load. Okay. So this is the idea.

115
00:09:29,070 --> 00:09:35,490
So based on this, we can actually go the lighting, a plus and minus, and see like what is the

116
00:09:35,850 --> 00:09:38,490
region that is visible in terms of white. Okay.

117
00:09:38,670 --> 00:09:42,030
And we can turn off the light, and you can see the options here.

118
00:09:42,090 --> 00:09:43,530
So that is very, very important.

119
00:09:45,270 --> 00:09:52,950
And this is like where the image, sir, what does this mean? External trigger mode.

120
00:09:53,010 --> 00:09:59,550
That means what is going to trigger once it is running, right? If I'm not mistaken.

121
00:10:00,570 --> 00:10:07,890
Speaker 2: Okay. The trigger, trigger mode, what we understand is it's controlled by either it's who is controlling the trigger.

122
00:10:08,370 --> 00:10:16,410
Either it's PLC, is it a handler, or it's the internal, internal means whether the software,

123
00:10:16,470 --> 00:10:25,290
vision software itself, triggers according to the encoder or something like that. Who triggers the signal.

124
00:10:26,910 --> 00:10:32,430
For this, in this case, it's being triggered by the encoder at the handler, because the handler

125
00:10:32,670 --> 00:10:35,730
need to tell the vision system, oh, okay, I'm already here.

126
00:10:36,270 --> 00:10:43,950
So the trigger need to tell the vision system to give the signal to the vision system, okay,

127
00:10:43,950 --> 00:10:48,390
I'm here, so you can start the acquisition of image. Something like that.

128
00:10:48,510 --> 00:10:49,590
Jaya: Okay, okay.

129
00:10:50,790 --> 00:10:54,030
Speaker 2: You understand? Or you want me, Jaya, to explain?

130
00:10:55,170 --> 00:10:58,890
Jaya: I think for now we can skip this feature, because this is a trigger mode.

131
00:10:59,010 --> 00:11:00,210
This would be additional feature.

132
00:11:00,270 --> 00:11:02,130
For now we would be focusing on the.

133
00:11:02,430 --> 00:11:05,550
Speaker 2: But this is a very important feature need to have.

134
00:11:05,670 --> 00:11:07,950
Jaya: Oh, okay, sir. Then, then one more time, please.

135
00:11:08,130 --> 00:11:09,690
Then, then I could understand.

136
00:11:09,690 --> 00:11:13,470
Speaker 2: Okay. Maybe Jaya can explain what, what is the trigger mode.

137
00:11:13,830 --> 00:11:14,010
Jaya: Okay.

138
00:11:18,750 --> 00:11:19,050
Speaker 2: Yes, sir.

139
00:11:19,890 --> 00:11:21,510
Jaya: Yes, yes. Yes, sir.

140
00:11:22,410 --> 00:11:25,230
Speaker 2: You want to know what is the trigger setting, right?

141
00:11:26,670 --> 00:11:29,370
He's asking what is trigger mode.

142
00:11:31,530 --> 00:11:34,290
One is from the handler, and one is from the vision.

143
00:11:34,950 --> 00:11:37,770
So the internal is vision, the external is handler.

144
00:11:37,950 --> 00:11:38,250
Jaya: Handler.

145
00:11:38,730 --> 00:11:40,950
Speaker 2: That's it. How, how, how is it?

146
00:11:41,070 --> 00:11:43,110
The external means from the handler?

147
00:11:43,290 --> 00:11:49,470
Jaya: Handler gives a signal to the vision, says that I'm ready, and vision will step and send the

148
00:11:49,530 --> 00:11:51,690
signal back to the handler of the result.

149
00:11:57,990 --> 00:12:01,950
I, I did not understand that part. Professor, if you.

150
00:12:04,290 --> 00:12:08,550
Speaker 2: See, when a vision is back, signal will look to the result. Am I right?

151
00:12:08,790 --> 00:12:09,210
Jaya: Yes, sir.

152
00:12:10,350 --> 00:12:12,450
Speaker 2: Okay. Give you a pass of the result.

153
00:12:12,570 --> 00:12:14,730
So where does the pass of the result go?

154
00:12:15,750 --> 00:12:17,610
Jaya: Oh, passing the result to where, right?

155
00:12:17,970 --> 00:12:18,870
This is what you mean.

156
00:12:18,870 --> 00:12:19,050
Speaker 2: Yes.

157
00:12:19,050 --> 00:12:19,530
Jaya: Okay, okay.

158
00:12:19,830 --> 00:12:20,070
Speaker 2: Yeah.

159
00:12:20,310 --> 00:12:20,490
Jaya: Okay.

160
00:12:20,730 --> 00:12:21,930
Speaker 2: So it goes to the handler.

161
00:12:22,110 --> 00:12:23,370
So that is called external.

162
00:12:24,030 --> 00:12:27,270
Jaya: Okay. And, and, and internal means?

163
00:12:27,690 --> 00:12:29,610
Speaker 2: It's the vision, it's the camera itself.

164
00:12:29,970 --> 00:12:36,750
When it steps, and it capture, then it gives you a result back to the handler.

165
00:12:38,250 --> 00:12:41,130
There's a handshake between the handler and the vision.

166
00:12:42,690 --> 00:12:46,410
Jaya: I believe this trigger mode is more like who is being the master.

167
00:12:46,890 --> 00:12:50,130
Is it the handler or the vision? Something like that?

168
00:12:52,050 --> 00:12:52,230
Speaker 2: Okay.

169
00:12:53,490 --> 00:12:57,270
Jaya: External I understood very well. Internal I could not.

170
00:12:57,390 --> 00:13:01,770
So I can explain in terms of what Mohan can understand in terms of the system.

171
00:13:02,310 --> 00:13:09,210
So external, what it means by the logs, that what we're going to have when the testing is done.

172
00:13:09,810 --> 00:13:15,210
So currently you have seen the split DB concept and the logger where it should go.

173
00:13:15,330 --> 00:13:17,790
So it is basically talking about this one.

174
00:13:18,090 --> 00:13:24,090
But in terms of where it should put, is it going to send it somewhere like over the internet,

175
00:13:24,750 --> 00:13:28,830
over some PLC link, something like this, right, sir? Am I understanding?

176
00:13:29,190 --> 00:13:32,910
Speaker 2: Correct. Correct. It goes to the PLC link back to the handler.

177
00:13:33,870 --> 00:13:41,370
Jaya: Yes. So if we have a different, let's say external device, we can select that and put those logs into those device.

178
00:13:41,490 --> 00:13:44,910
So that is what the trigger means, what I learned.

179
00:13:45,330 --> 00:13:47,670
Speaker 2: Yes. And you can control the millisecond.

180
00:13:47,850 --> 00:13:48,750
Jaya: Millisecond, yes.

181
00:13:48,810 --> 00:13:53,070
Speaker 2: Of the result. Yes. How fast it can give you the result.

182
00:13:53,310 --> 00:13:53,430
Jaya: Yes.

183
00:13:54,210 --> 00:13:56,490
Speaker 2: The handler cannot confirm the vision system.

184
00:13:57,090 --> 00:14:00,270
So we can slow down a little bit on the vision system.

185
00:14:00,810 --> 00:14:04,830
Jaya: Understood. Understood. Okay. So I understand now in this way.

186
00:14:04,950 --> 00:14:10,590
So when we put it internal, internal means the folder structure that we have, right, Mohan?

187
00:14:11,130 --> 00:14:13,590
So internal, how we're designing the folder structure.

188
00:14:13,890 --> 00:14:16,290
If we pick internal, then it will just keep it there.

189
00:14:16,350 --> 00:14:21,750
But if we pick external, that means we are, we have provided an external device or something,

190
00:14:22,110 --> 00:14:24,090
or internet API or something.

191
00:14:24,450 --> 00:14:27,030
This is where the results will be put together.

192
00:14:27,090 --> 00:14:30,450
That is the idea of this. Okay.

193
00:14:30,810 --> 00:14:33,150
And then the lighting we have seen.

194
00:14:33,810 --> 00:14:35,610
So this is the most important part.

195
00:14:35,670 --> 00:14:38,310
So that means it is the shape tracks.

196
00:14:38,430 --> 00:14:40,770
And here you can see pin one configuration.

197
00:14:41,190 --> 00:14:44,250
That is kind of in the requirement, pin one configuration.

198
00:14:44,670 --> 00:14:50,250
But pin one configuration, what you see up here, let me take the screen and just take it.

199
00:14:50,490 --> 00:14:56,370
So what you see up here, pin one configuration, this is just a name, like what we have in our rules.

200
00:14:56,550 --> 00:14:58,890
So that, that has nothing to do with it.

201
00:14:59,310 --> 00:15:03,630
The important part is the algorithm that we are picking, or the functionality we are picking.

202
00:15:03,690 --> 00:15:07,110
In this case, it is the shape tracks three. Okay.

203
00:15:07,710 --> 00:15:10,950
And it is picking a reference image.

204
00:15:11,010 --> 00:15:13,110
That's what it says in here. Okay.

205
00:15:13,770 --> 00:15:19,830
And the first thing that the system does is to pick with this search region.

206
00:15:19,950 --> 00:15:25,170
Search region is also known as region of interest, ROI. Okay.

207
00:15:25,710 --> 00:15:32,610
Once we select region of interest, for example, here, if we put, I mean, put a region of interest,

208
00:15:32,790 --> 00:15:39,510
which is the search region, then inside this we can put a pattern search.

209
00:15:39,570 --> 00:15:45,210
A pattern search is something that what we have in the tool system like the circular, rectangle, or things like that.

210
00:15:45,690 --> 00:15:50,490
So using this, we, we put a region, let's say we put something in here.

211
00:15:50,610 --> 00:15:56,310
Now what we put here, let's say this is my, the item that I wanted to search, but what I want

212
00:15:56,370 --> 00:16:02,610
to search, how I wanted to search, that would depend on this grayscaling technique, coloring technique.

213
00:16:02,730 --> 00:16:08,850
So that would be a different set of settings, like what I just showed you before, like the grayscaling.

214
00:16:09,210 --> 00:16:13,470
So, so when it runs, let's say I can give any, any name.

215
00:16:13,590 --> 00:16:22,050
So pin one means what they understood, or in terms of the setting, is that we have the search region of interest.

216
00:16:22,290 --> 00:16:31,170
Inside this, wherever I put the, let's say search pattern, it will, it will try to match that based on the configuration. Okay.

217
00:16:31,530 --> 00:16:38,550
It can be based on image that we see, or it could be based on the grayscaling configuration, or.

218
00:16:38,730 --> 00:16:39,210
Speaker 2: Professor.

219
00:16:39,330 --> 00:16:41,430
Jaya: Yes, sir. Sir, you were saying something?

220
00:16:45,870 --> 00:16:47,790
Professor, you were saying something or not?

221
00:16:48,870 --> 00:16:49,770
Speaker 2: No, no, no. Okay, okay.

222
00:16:50,070 --> 00:16:51,030
Jaya: Good. Okay. Thank you, sir.

223
00:16:51,030 --> 00:16:52,350
Speaker 2: Let me off my mic.

224
00:16:52,470 --> 00:17:02,970
Jaya: Okay. Sure, sure. So if, let's say I put this as a circle of my interest, I mean, this is the

225
00:17:03,210 --> 00:17:05,430
pattern that I'm looking for.

226
00:17:05,490 --> 00:17:08,370
Again, I could have like loosely, loosely balanced.

227
00:17:08,430 --> 00:17:10,290
This type of settings could go in.

228
00:17:10,350 --> 00:17:14,310
So pin one, it, it does not mean that it does something else.

229
00:17:14,610 --> 00:17:16,530
So it's just like a pattern search.

230
00:17:16,710 --> 00:17:19,110
So it will try to validate just like any other pattern.

231
00:17:19,170 --> 00:17:21,810
It will say like this is successful or not.

232
00:17:22,230 --> 00:17:27,510
However, that is a catch that we have to do it in the AI validation later on.

233
00:17:27,570 --> 00:17:31,170
That is not for here right now, but you could have the full picture of the system.

234
00:17:31,530 --> 00:17:37,770
The idea is that what the pin one configuration means that where the circuit starts, where the

235
00:17:37,830 --> 00:17:43,470
circuit pin starts, because circuits have different number of pins. Okay.

236
00:17:43,650 --> 00:17:46,530
So the starting point means the pin one configuration.

237
00:17:46,950 --> 00:17:55,050
Now what happens in sometimes that the, the pin is actually in, in there, it is correct, but

238
00:17:55,290 --> 00:18:02,010
someone actually put in, in a different order of the device, but it would go into rejection.

239
00:18:02,250 --> 00:18:08,610
For example, the pin zero should be here, but someone mistakenly put the device in a wrong order.

240
00:18:08,850 --> 00:18:10,050
You understand what I'm saying?

241
00:18:10,230 --> 00:18:11,550
And then it would be rejected.

242
00:18:11,910 --> 00:18:14,910
But then again, it is actually a valid circuit.

243
00:18:15,330 --> 00:18:18,930
But with rule-based system, there is no way to distinguish that.

244
00:18:19,710 --> 00:18:25,410
So whatever that is put in there, it's going to verify, and if it fails, it would go to the rejection.

245
00:18:26,190 --> 00:18:32,010
Now with the AI technique, what we try to do, whatever is rejected, we try to, let's say, rotate

246
00:18:32,070 --> 00:18:38,130
it and try to put it to the rules and see if that works. Does this make sense?

247
00:18:38,250 --> 00:18:42,930
So not only from the AI, probably we could do it after the rejection.

248
00:18:43,410 --> 00:18:49,230
Once the rejections are combined, we could rotate and see if that kind of matches.

249
00:18:49,410 --> 00:18:53,550
So that, that could be additional things that we could do, like false rejection finding.

250
00:18:53,670 --> 00:18:54,870
That could be a different technique.

251
00:18:55,170 --> 00:19:00,330
But usually not only the pin one configuration goes, there are something like the logos, many

252
00:19:00,450 --> 00:19:05,670
other factors that goes in that actually explain this stuff.

253
00:19:06,270 --> 00:19:07,410
Does this make sense to you?

254
00:19:07,410 --> 00:19:10,110
Or do you have any questions so far?

255
00:19:12,090 --> 00:19:12,870
Speaker 2: No, no.

256
00:19:13,710 --> 00:19:23,310
Jaya: Great. Great. Give me a moment, please, to.

257
00:19:27,090 --> 00:19:36,030
Okay. I, I think I have got the vision pictures from my machine. Give me a moment.

258
00:19:40,110 --> 00:19:47,910
Speaker 2: This set for pattern search, we can't do it separately without the search region, or we can do it.

259
00:19:48,150 --> 00:19:50,190
Jaya: Oh, search region is must, actually.

260
00:19:50,610 --> 00:19:53,970
So these are the pictures I have taken from the office. Okay.

261
00:19:54,510 --> 00:19:57,750
So this one is a bit important that we can learn.

262
00:19:57,870 --> 00:19:59,970
So this is a circuit.

263
00:20:00,270 --> 00:20:02,550
This circuit has a, a QR code.

264
00:20:02,670 --> 00:20:04,290
This is where the QR code is. Okay.

265
00:20:04,650 --> 00:20:06,810
And this is what the grayscaling we are doing.

266
00:20:07,050 --> 00:20:08,490
So based on the grayscaling.

267
00:20:08,550 --> 00:20:12,150
Speaker 2: Yes, sir. We don't, we don't call it circuit. It's a device.

268
00:20:12,510 --> 00:20:20,610
Jaya: Okay. Device. Okay. Okay. So let's say in this device, we have some letters. You can see, Mohan.

269
00:20:21,210 --> 00:20:26,550
And this, these letters are nothing but the pattern match we could do.

270
00:20:26,610 --> 00:20:32,490
We could even do OCR, but OCR is hardly used, as I have learned.

271
00:20:32,610 --> 00:20:34,770
But we can have this as an additional feature.

272
00:20:34,890 --> 00:20:36,990
But the must-have feature is the pattern match.

273
00:20:37,230 --> 00:20:42,030
So what we can actually achieve in here, because you can see here is two bit colors only, the

274
00:20:42,090 --> 00:20:48,270
black and white, and depending on the camera flash light here and there, the white will be much more visible or not.

275
00:20:48,510 --> 00:20:55,770
So depending on this, I could actually create, I mean, what I could do is like draw an area like this. Okay.

276
00:20:56,070 --> 00:20:58,290
So what will happen when I do this?

277
00:20:58,410 --> 00:21:01,230
Can you please tell me from your vision?

278
00:21:03,810 --> 00:21:06,510
Speaker 2: Like for pattern search, you're telling me.

279
00:21:06,630 --> 00:21:08,850
Jaya: Yes. So what, what should happen here?

280
00:21:12,090 --> 00:21:18,090
Speaker 2: Like it's going inside the vision systems, this device.

281
00:21:18,630 --> 00:21:18,870
Jaya: Correct.

282
00:21:19,050 --> 00:21:21,030
Speaker 2: During that, what will happen? You're asking, right?

283
00:21:21,150 --> 00:21:30,930
Jaya: Yes, correct. But the idea here is that whatever the white ones, this will be created as singular pattern. This is a pattern.

284
00:21:31,050 --> 00:21:33,510
So this will mark as one. Okay.

285
00:21:33,690 --> 00:21:36,330
This will mark as two, because this is a white areas.

286
00:21:36,450 --> 00:21:38,490
So this is mark as three.

287
00:21:38,850 --> 00:21:42,390
This is mark as four. So it will continue. Okay. Continue.

288
00:21:42,450 --> 00:21:46,530
Each one of those will have a mark and indexing of that pattern.

289
00:21:46,710 --> 00:21:52,530
And it will continue to go wherever the, let's say, white areas are.

290
00:21:52,650 --> 00:21:58,890
For example, this is a white mark, but I don't want to have this mark because this is noise, you can say.

291
00:21:59,250 --> 00:22:00,690
Also, this is a QR validation.

292
00:22:00,810 --> 00:22:05,130
This will also be in that region because this is actually inside the search region.

293
00:22:05,190 --> 00:22:08,010
I mean, inside the pattern matching that I have selected. Okay.

294
00:22:08,490 --> 00:22:10,650
Now every one of those has different numbers.

295
00:22:10,770 --> 00:22:17,790
Now what I could do is after the selection, I could remove the areas that I don't want. Okay.

296
00:22:18,090 --> 00:22:23,130
So that is what is called in the, in the older system.

297
00:22:23,190 --> 00:22:24,990
Let me give you the older system.

298
00:22:25,110 --> 00:22:27,030
Sorry, that is older system. That's called

299
00:22:31,650 --> 00:22:37,710
masking. That's called masking. And we, we can see the masking, but we can have masking or we can remove.

300
00:22:37,830 --> 00:22:39,450
So this is the mask area.

301
00:22:39,810 --> 00:22:47,910
So let's say we, we have this. We have this. Sorry. Sorry. Yeah.

302
00:22:47,970 --> 00:22:48,990
We, we, you can see this.

303
00:22:49,050 --> 00:22:51,630
This is, let's say, the area of search interest.

304
00:22:51,810 --> 00:22:54,270
And inside this, this is the search pattern. Okay.

305
00:22:54,510 --> 00:22:56,610
Green one, let's say, just for understanding.

306
00:22:56,850 --> 00:22:57,030
Speaker 2: Yes.

307
00:22:57,270 --> 00:22:58,650
Jaya: But it, it could have been bigger.

308
00:22:58,770 --> 00:23:02,310
Let's say, let's say it could have been bigger like this. Okay.

309
00:23:02,610 --> 00:23:07,530
And inside this, I'm trying to pick, let's say, this one. Okay.

310
00:23:08,010 --> 00:23:12,930
And the, in this region, let's say there are some steps which is coming here.

311
00:23:13,050 --> 00:23:14,790
This is another box I don't want.

312
00:23:15,510 --> 00:23:19,710
So in that context, you can, or we can create a mask.

313
00:23:20,010 --> 00:23:22,110
Mask is nothing but ignore that area.

314
00:23:22,590 --> 00:23:28,590
We can just create, click on the mask and just say, drawing this area, say like, do not take anything from this.

315
00:23:28,650 --> 00:23:31,650
This is how the, I mean, search pattern changes.

316
00:23:32,250 --> 00:23:37,050
And the same thing is actually happening here. Okay.

317
00:23:37,170 --> 00:23:44,430
So first, when we are selecting like this, so this is like the point of interest inside this.

318
00:23:44,430 --> 00:23:47,910
This is my, let's say, search pattern that I'm doing.

319
00:23:48,090 --> 00:23:55,410
And then I have each one of the item with marking, like what is the pattern, what is the height of the pattern.

320
00:23:55,470 --> 00:23:57,570
So all these things we need to keep in track.

321
00:23:57,690 --> 00:24:04,650
So what will happen, let's say, next time the next device comes, if that device has a, let's

322
00:24:04,710 --> 00:24:11,730
say, a different height of this number, because if the number changes, let's say this is something

323
00:24:11,910 --> 00:24:19,290
else, or it becomes from one to something else, then it will fail because this is not the pattern

324
00:24:19,410 --> 00:24:22,590
that we're looking for, because this is not the wider scale balance.

325
00:24:22,650 --> 00:24:28,350
But we can adjust that between fine-tuning the numbers and things like that.

326
00:24:28,410 --> 00:24:31,830
So that could happen for each one of the ruling. Remember that.

327
00:24:31,890 --> 00:24:40,050
That is the most important part that I missed during my first technical aspect or my first understanding.

328
00:24:40,230 --> 00:24:46,590
So that is very, very critical that every segment have different types of setting, and that

329
00:24:46,770 --> 00:24:50,910
setting needs to be applied when this rule is validating. Okay.

330
00:24:52,050 --> 00:24:52,170
Speaker 2: Yes.

331
00:24:52,950 --> 00:24:54,930
Jaya: Okay. So this is part of this one.

332
00:24:55,170 --> 00:25:00,510
And if I go into this, so you can see, like this is the exact thing that we, I was talking about.

333
00:25:00,690 --> 00:25:05,190
You have the numbers, and you can see there are also numbers one and two, because this has like

334
00:25:05,250 --> 00:25:09,690
a little bit of white there. One and two. Does this make sense?

335
00:25:09,750 --> 00:25:09,990
Speaker 2: Okay.

336
00:25:10,050 --> 00:25:11,250
Jaya: Yeah. So very, very important.

337
00:25:11,490 --> 00:25:17,190
So usually if I'm doing the actual settings, because we are just testing it, I would probably

338
00:25:17,370 --> 00:25:18,570
remove this one and two.

339
00:25:18,630 --> 00:25:20,970
So once I do that, then other sequence will be changed.

340
00:25:21,030 --> 00:25:22,890
You can see the sequence are marked.

341
00:25:23,010 --> 00:25:27,030
So it could be also inside the log what is happening and how it is happening. Okay.

342
00:25:27,210 --> 00:25:31,530
So that is a very, very critical factor of this pattern matching.

343
00:25:33,690 --> 00:25:40,290
So here are some of the, some of the, let's say, other types of settings are there.

344
00:25:40,350 --> 00:25:41,730
So this is called the scratch.

345
00:25:41,970 --> 00:25:49,050
Scratch is like the defect, or in terms of our system, when we design, we call it absent, must be absent.

346
00:25:49,170 --> 00:25:55,950
So we can think of like this, but we will have it is named as defects rather than scratch.

347
00:25:56,070 --> 00:25:58,170
I think this is a very old system, I guess.

348
00:25:58,290 --> 00:25:59,670
This is how they named it.

349
00:26:00,090 --> 00:26:06,810
Now when we go to the scratch, it's like the, the previous system, when we see it, if we go

350
00:26:07,410 --> 00:26:10,410
back, we create this using the rule, right?

351
00:26:10,650 --> 00:26:13,770
So we go to the add tools and create each one of the segment.

352
00:26:14,190 --> 00:26:20,550
Now in this segment, this one, we create it from the illumination. Okay.

353
00:26:20,610 --> 00:26:24,330
And there are some fixed configuration, like pin one configuration.

354
00:26:24,450 --> 00:26:28,590
Pin one configuration is nothing but another pattern matching on how we want to find and where

355
00:26:28,710 --> 00:26:30,930
we want to find the pin one configuration.

356
00:26:31,050 --> 00:26:36,270
So that is very, very important, but it is nothing but a pattern match or the algorithms we have.

357
00:26:36,510 --> 00:26:44,670
It's like not going to do any dynamic stuff, but once it actually fails, it will let know that pin one configuration failed. Okay.

358
00:26:44,910 --> 00:26:51,750
So based on pin one configuration, the device knows like the structure where it is and how the pin starts.

359
00:26:51,990 --> 00:26:53,610
So that, that is very, very important.

360
00:26:54,090 --> 00:26:59,430
Now the scratch or the defect management is like when we go into the defect scratch, it also

361
00:26:59,670 --> 00:27:01,230
gives you the similar tooling.

362
00:27:01,350 --> 00:27:09,210
That mean you can, or we can make it white and other colors to see where my defects are, where

363
00:27:09,570 --> 00:27:14,070
my, let's say, let's say there are some scratches, this one. Okay.

364
00:27:14,550 --> 00:27:17,430
So it is something like the same as pattern matching.

365
00:27:17,670 --> 00:27:24,750
Same thing, but it will do the similar trick, but just name as defects.

366
00:27:25,290 --> 00:27:31,470
So when the pattern search, when we do, that means if that is not there, we mark it as failed.

367
00:27:31,890 --> 00:27:36,030
For defect management, if you find that, then we find it as failed.

368
00:27:36,090 --> 00:27:39,570
So it's just the same thing in a different flavor. Does this make sense?

369
00:27:42,390 --> 00:27:43,530
Speaker 2: Can you repeat it again?

370
00:27:43,590 --> 00:27:46,170
Jaya: Yes. Yes. So the difference between.

371
00:27:46,290 --> 00:27:48,390
Speaker 2: The same or the defects, right?

372
00:27:48,570 --> 00:27:55,170
Jaya: Yes, yes, yes. So in terms of coding, you can assume like both are validation techniques. Okay.

373
00:27:55,830 --> 00:28:04,650
So when we do the point of interest, when we do this pattern search, okay, and if this pattern

374
00:28:04,830 --> 00:28:08,670
does not match, what we do, we mark it as failed, right?

375
00:28:08,730 --> 00:28:10,290
Because this pattern does not satisfy.

376
00:28:10,710 --> 00:28:14,010
In the defect management, the same thing just inverts.

377
00:28:14,430 --> 00:28:19,350
So in, in defect management, what we select, if that matches, let's say we select that and we

378
00:28:19,470 --> 00:28:23,010
do the same grayscaling and find these areas of scratch. Okay.

379
00:28:23,250 --> 00:28:25,530
And we can name it differently as defect.

380
00:28:25,650 --> 00:28:27,570
But the idea here is just it flips.

381
00:28:28,050 --> 00:28:31,890
So previously, if we do not find it, we mark it as failure.

382
00:28:31,950 --> 00:28:34,770
But here, if we find it, we mark it as failure.

383
00:28:35,790 --> 00:28:36,750
Speaker 2: Yes. So you might get it.

384
00:28:36,930 --> 00:28:38,730
Jaya: Okay. So that's the same technique.

385
00:28:38,850 --> 00:28:40,590
Actually, the technique is similar.

386
00:28:43,470 --> 00:28:46,290
You know, here you can see that it has the QR code.

387
00:28:46,410 --> 00:28:48,270
Sometimes the logo and QR code.

388
00:28:48,330 --> 00:28:50,550
So this is the defect that we try to find.

389
00:28:50,610 --> 00:28:56,970
You can see the some of the regions are selected, and you can see each one of them has some numbers there.

390
00:28:57,090 --> 00:28:58,290
So there is that part.

391
00:28:59,250 --> 00:29:04,110
Now this is the one which a sample example of the device. Okay.

392
00:29:04,470 --> 00:29:08,610
So here you can see we are trying to find the pin one configuration.

393
00:29:08,850 --> 00:29:12,270
So this is our point of interest.

394
00:29:12,570 --> 00:29:14,550
Inside this, we have like this hole.

395
00:29:14,970 --> 00:29:20,310
So based on this hole, we just created the circle, and that circle should try to find based

396
00:29:20,370 --> 00:29:23,190
on the grayscale or other color technique.

397
00:29:23,310 --> 00:29:25,890
So that would be based on the settings that how we want to do it.

398
00:29:26,250 --> 00:29:32,310
So once we have this, then the system will just try to find as the pattern search.

399
00:29:32,370 --> 00:29:36,150
And you can see this is like a pattern search, but this is a circular pattern search.

400
00:29:36,210 --> 00:29:41,190
It will try to find that if that is there in this point of interest.

401
00:29:41,730 --> 00:29:49,530
So there is one part also very important that point of interest is, or the region of interest

402
00:29:49,650 --> 00:29:59,310
is very important topic because this point of interest, and Prabhusar can correct me, if this

403
00:30:01,470 --> 00:30:08,970
pattern is a little bit flipped to, let's say, upper the area, let's say this, this pattern,

404
00:30:09,150 --> 00:30:15,690
this one actually in the real time, real picture goes here, here.

405
00:30:16,350 --> 00:30:19,290
Will my validation successful or failed?

406
00:30:24,210 --> 00:30:25,050
Sir, you are on mute.

407
00:30:26,790 --> 00:30:27,030
Speaker 2: Okay.

408
00:30:30,270 --> 00:30:32,910
In, in, you mean when the machine is running at high speed?

409
00:30:33,090 --> 00:30:33,270
Jaya: Yes.

410
00:30:34,170 --> 00:30:38,790
Speaker 2: Let's say the entire device shifted up or only that pin one

411
00:30:41,610 --> 00:30:44,190
is, is by, by nature is defect.

412
00:30:44,790 --> 00:30:46,530
Which one are you referring to?

413
00:30:47,790 --> 00:30:52,290
Jaya: So what I'm referring, sir, so this is my region of interest.

414
00:30:52,650 --> 00:30:58,470
So when I create the pattern, does this mean I'm looking for the pattern everywhere in this

415
00:30:58,890 --> 00:31:01,770
or exactly on this point? That is my question.

416
00:31:03,930 --> 00:31:07,290
Speaker 2: Exactly there, but there's like there'll be a little.

417
00:31:07,470 --> 00:31:09,750
Jaya: Some plus and minus. Some plus and minus. Understood.

418
00:31:09,990 --> 00:31:10,170
Speaker 2: Yes.

419
00:31:10,470 --> 00:31:13,590
Jaya: Understood. So Mohan, it should be clear actually.

420
00:31:13,770 --> 00:31:15,990
So it is based on the first observation.

421
00:31:16,050 --> 00:31:20,850
So it is not wrong what we have done so far in terms of our understanding.

422
00:31:21,030 --> 00:31:29,070
So it is not like it is going to search everywhere, but try to find here with that loosely deviation

423
00:31:29,190 --> 00:31:33,870
how much we want to go plus and minus from both angles. Okay. And also.

424
00:31:34,230 --> 00:31:39,390
Speaker 2: You see, if you put the blue, blue, I mean the search region.

425
00:31:39,810 --> 00:31:40,050
Jaya: Yes.

426
00:31:41,790 --> 00:31:45,090
Speaker 2: The blue one, the blue, blue box that we put here, right?

427
00:31:45,450 --> 00:31:45,570
Jaya: Yes.

428
00:31:45,690 --> 00:31:52,470
Speaker 2: So if we, if you make it a little bit smaller near to that, the green and the circle one, right?

429
00:31:53,550 --> 00:31:53,790
Jaya: Yes.

430
00:31:55,350 --> 00:31:56,730
Speaker 2: Okay. Try to make it smaller.

431
00:31:57,690 --> 00:31:59,310
Jaya: Let me use green color.

432
00:31:59,610 --> 00:32:05,550
And I, I cannot do it because just assume that the green one is this, this one.

433
00:32:06,150 --> 00:32:12,090
Speaker 2: Okay. So when you make it smaller during the high run production run, what will happen?

434
00:32:12,630 --> 00:32:20,250
The, the, the entire scenario will shift a bit, you know, up and down. So what will happen?

435
00:32:20,790 --> 00:32:25,710
Because inside the device there also have some tolerance space. So what will happen?

436
00:32:25,710 --> 00:32:27,510
The device also will move a bit.

437
00:32:27,870 --> 00:32:30,270
So during the high speed run, you cannot see this.

438
00:32:30,390 --> 00:32:37,710
But if you put the, the, I mean the, the search region smaller, so the, the tendency to fail,

439
00:32:40,230 --> 00:32:45,390
it, it might be a good, good device, but then the tendency to fail the, the device is high.

440
00:32:46,410 --> 00:32:49,590
So it's like, it's like you're setting the tolerance is too tight.

441
00:32:50,250 --> 00:32:54,090
That's why, that's why normally we put the search window is a bit bigger.

442
00:32:55,530 --> 00:32:58,890
Jaya: Yes. Understood. Understood. Understood. Sorry. Understood.

443
00:32:59,190 --> 00:32:59,370
Speaker 2: Okay.

444
00:32:59,910 --> 00:33:00,750
Jaya: Understood. Okay.

445
00:33:04,110 --> 00:33:07,650
So, so far are we clear, Mohan, or do you have any questions so far?

446
00:33:09,570 --> 00:33:09,630
Speaker 2: No.

447
00:33:10,410 --> 00:33:12,630
Jaya: Good. Because understanding is very, very important.

448
00:33:12,630 --> 00:33:14,370
If we don't understand, we cannot make it.

449
00:33:15,330 --> 00:33:18,810
So there, there are some settings that you, we could change.

450
00:33:18,930 --> 00:33:21,810
You can see detection condition like angles.

451
00:33:22,350 --> 00:33:29,310
It, it is plus minus two, just like sir was talking about, like it has some ranges that we could do. Okay.

452
00:33:30,810 --> 00:33:33,030
How many detection that we are counting here?

453
00:33:33,090 --> 00:33:36,510
Is it one or two we are looking for? Something like this.

454
00:33:39,150 --> 00:33:41,130
So this is another one.

455
00:33:41,250 --> 00:33:48,330
This is actually an example with, with a, I mean grayscale search.

456
00:33:48,390 --> 00:33:54,690
So you can see like we have took the point of interest or region of interest here. And

457
00:33:57,810 --> 00:34:00,750
that part, I think, I think it is the same one.

458
00:34:00,870 --> 00:34:08,190
Just we just increase the size rather than there is nothing changed actually. So.

459
00:34:08,370 --> 00:34:13,170
Speaker 2: So that circle circle there you have highlighted there is the.

460
00:34:13,290 --> 00:34:13,650
Jaya: Same one.

461
00:34:13,830 --> 00:34:15,750
Speaker 2: That's the same one that we have done.

462
00:34:15,870 --> 00:34:16,770
Jaya: Same one we have done.

463
00:34:16,890 --> 00:34:21,390
It just, we just increase the search region a bit wider.

464
00:34:21,690 --> 00:34:24,330
Speaker 2: Yeah. We are doing the pattern search in that region.

465
00:34:24,570 --> 00:34:24,750
Jaya: Yes.

466
00:34:24,870 --> 00:34:25,470
Speaker 2: Specific region.

467
00:34:25,890 --> 00:34:28,650
Jaya: Yes. Yes. That we can name as pin one.

468
00:34:28,770 --> 00:34:33,630
So pin one is nothing but there is no, I mean extra facility that goes under the hood.

469
00:34:33,630 --> 00:34:39,210
It's just like the pattern search. Okay. Algorithm is saying. Okay.

470
00:34:39,390 --> 00:34:49,530
So if we click on this, this, this arrow, actually, this arrow button, we just see the XY positions. It's nothing fancy actually.

471
00:34:50,010 --> 00:34:54,570
So two points, point one, point two XY position.

472
00:34:54,810 --> 00:35:02,310
So I don't know what the point one, point two XY position because that should be one XY position. Why the point two?

473
00:35:02,310 --> 00:35:07,050
I think it, it tried to mention if we go out.

474
00:35:07,050 --> 00:35:11,070
I think it tried to mention somewhere like this one and this one. Probably. I don't know.

475
00:35:11,430 --> 00:35:13,890
But we usually need one point.

476
00:35:14,070 --> 00:35:15,270
We don't need two points.

477
00:35:15,330 --> 00:35:16,830
I don't know why that is there.

478
00:35:17,430 --> 00:35:24,690
But here what we are trying to find is probably the width range using the pattern tooling.

479
00:35:25,950 --> 00:35:31,710
This is a different sets of, let's say, function we are in.

480
00:35:31,830 --> 00:35:38,850
And this function is called, in a moment, if I have taken the picture.

481
00:35:38,910 --> 00:35:46,950
I didn't take the picture of this, but I think we have the picture here when we took the tools picture.

482
00:35:50,310 --> 00:35:59,610
Yes. So the one that I was showing you, it is in terms of this actually. Edge beach, edge width.

483
00:35:59,970 --> 00:36:02,310
These are the two things that I'm trying to show you.

484
00:36:02,670 --> 00:36:04,890
Probably edge width it was.

485
00:36:05,010 --> 00:36:14,790
So why the edge width is there, it is try to validate this circuit that we have on device, you can say.

486
00:36:15,210 --> 00:36:17,550
So in device they have this pin, right?

487
00:36:18,030 --> 00:36:23,910
So the pins sometimes have irregular consistencies of the width.

488
00:36:24,030 --> 00:36:32,970
So using that tool, it actually detects the, the consistencies between this, these pins.

489
00:36:33,450 --> 00:36:35,190
Actually, what is the wide range?

490
00:36:35,370 --> 00:36:38,730
Similar technique of the pattern search, but a different algorithm. Okay.

491
00:36:38,850 --> 00:36:41,490
That is widely used what I learned.

492
00:36:41,730 --> 00:36:43,170
But we can add more algorithm.

493
00:36:43,230 --> 00:36:44,550
This is how the system should be.

494
00:36:44,550 --> 00:36:47,490
We can add new algorithm later on.

495
00:36:47,790 --> 00:36:53,550
So first we need to make the base system, then we can add new algorithms and new stuff once we understand this stuff.

496
00:36:53,730 --> 00:36:56,610
The technique is same what we learned so far.

497
00:36:56,910 --> 00:37:01,110
So if we go further onto this, onto this one.

498
00:37:02,850 --> 00:37:08,010
So I hope that these are the ones that we can go in and change our name.

499
00:37:08,010 --> 00:37:12,810
And for each one of the cases, it can have different type of functionality.

500
00:37:15,450 --> 00:37:20,490
So each rule have different kinds of functionality, each kind of camera setup, camera settings.

501
00:37:20,670 --> 00:37:23,190
And based on that, each one of them will run.

502
00:37:23,310 --> 00:37:33,030
If any one of them fail, the whole device actually calculated as a failed or rejection, rejected. Okay.

503
00:37:33,390 --> 00:37:39,390
And based on the rejection, we have to log it properly, show it like this one is failed.

504
00:37:39,690 --> 00:37:43,110
And reasoning for this, the every log needs to be very critical.

505
00:37:43,170 --> 00:37:46,650
We will come to the logging part in the technical terms, how we do it.

506
00:37:46,710 --> 00:37:48,570
I will, I will show you that part.

507
00:37:48,630 --> 00:37:57,390
But this is what my understanding is so far in the system that I learned newly what we are deviated from the initial goal.

508
00:37:59,250 --> 00:38:01,290
Prabhusar, do you have anything to add here?

509
00:38:02,070 --> 00:38:05,130
If not, then I, I want to conclude this training.

510
00:38:09,990 --> 00:38:11,010
Speaker 2: On the which part? Sorry.

511
00:38:12,390 --> 00:38:14,190
Jaya: I'm saying, do you have anything to add, sir?

512
00:38:14,250 --> 00:38:16,110
Otherwise, I'm going to end this training here.

513
00:38:16,230 --> 00:38:18,090
This is what I learned yesterday.

514
00:38:18,330 --> 00:38:22,110
Speaker 2: Okay. That's all. For now, I think we are back.

515
00:38:22,230 --> 00:38:23,970
But then your understanding is okay.

516
00:38:24,270 --> 00:38:26,970
I will send you the flow through the XMINE.

517
00:38:27,390 --> 00:38:33,570
I already put what are the criteria that we like, like mark inspection, like surface crack,

518
00:38:34,350 --> 00:38:36,570
seal inspection, all that in five modules.

519
00:38:36,870 --> 00:38:40,170
And then I give you the entire flow.

520
00:38:40,290 --> 00:38:44,010
And then you go through one by one because there's a lot of branches over there.

521
00:38:44,190 --> 00:38:45,870
So maybe you can just have a look.

522
00:38:46,290 --> 00:38:46,650
Jaya: Sure. Absolutely.

523
00:38:46,650 --> 00:38:50,970
Speaker 2: And then you let me know which one you don't understand and what, what more details that you

524
00:38:51,030 --> 00:38:52,650
need, then you can let me.

525
00:38:52,770 --> 00:38:55,470
Jaya: Absolutely. Absolutely. Thank you. Thank you.

526
00:38:56,850 --> 00:39:02,130
Sir, if you send me, then I will start estimating with Mohan in the system.

527
00:39:02,490 --> 00:39:03,450
Speaker 2: Okay. I will send you now.

528
00:39:03,510 --> 00:39:03,810
Jaya: Thank you.

529
00:39:04,050 --> 00:39:05,010
Speaker 2: I sent to you personally.

530
00:39:05,310 --> 00:39:06,150
Jaya: Thank you, sir. Thank you.

531
00:39:06,450 --> 00:39:07,890
Have a good day then everyone.

532
00:39:08,910 --> 00:39:10,110
Dropping the call, stopping the recording.

