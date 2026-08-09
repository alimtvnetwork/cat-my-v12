# Vision Inspection Automation System Instruction

I'm going to dump this UI to the AI so that it can understand everything. And based on that, it can actually write the spec. So the spec that I'm going to explain here, I'm not going to write it. So I'm going to explain the spec. So the first thing for the AI is to understand it, break things down, and write everything to the file system in the spec folder. Usually, the spec needs to be written in the spec folder, root of the spec folder, folder 21. So if I recall the code, the way that we have here in the spec folder, we have something called the app folder. So inside the app folder, we will have the spec written. So this is where we will have the architectural things, diagrams, and everything else. Okay? So this is the folder structure I use all the time. So that makes me consistent without thinking of anything else. Okay. Now, the way that I think of it, to understand this, you need to get into the picture section. So it's not like I do have the whole idea about the system. Some of the things could change the way that it would work. So I have just seen the system for 30 minutes to 40 minutes. That's all, 30 to 40 minutes. That's what I understood. So I have lots of questions that I could ask. Okay. So basically, I'm going to give a little bit of overview for now for the AI. So the system is a control automation system. It would be written in Python programming language as a back end. The front end would be on the React, Tailwind, Next.js, things like that, and it would run with a Chromium browser. I hope that it is an option in Python, because all the other languages like Golang and others do have this CEF component, which can be used to run the Chrome itself and communicate with the back end. It would feel like a full application or full thing, actually. So that is the idea of overall how it's going to work. Okay? That's the first step. Second, my understanding of this system is that it has the settings and images. So every time we look into the image, okay, so this is kind of like the rule setup section, I could say. So every time I have a image, which would show up here. Here, I'm just correcting the light or something like this, but the same screen is actually repeated. For example, this one. This one, it's called the image 34. See how I'm explaining the image, mentioning the image number, so that AI can read through and understand that as well, what I'm referring to. So that is one of the important aspect. I'm actually talking to myself, but also the note is taking. Also, the recording is going on so that anyone can learn later on. Now, here, the idea is that it has several pins, as you can see. I'm not sure how to zoom in. I don't think that there is a way to zoom in. Okay, I'm good. Somewhere. Here, in the image 34, I could see the pin one marking A, marking B, marking Cs, things like that, edge, width, and things like that. So this marking A, B, C, this can be customized. That means the user can create fixed marking or different marking. With this previous system, it was fixed marking, because if I look into the other images. For example, if I look into the 35 or image 35, 36, I could see that the mask region one, two, I mean, zero, one, two, three is there. That means I could only create four regions of marking. What I want to have the rule-based validation. Okay. And I could see the search region that it shows up here, but that's the old way that it is done. The way that I think about this right now, and it's very important to understand. And also there is a button in image 34, 35, 36 called Run. So in the mind mapping, you could see I am putting here as a Run from the UI. So that means it has two, three ways to think about it. First, let's forget everything. So the system gives us images. Okay, that's very simple way to look at it. We select the image. We have the option from the mouse or anything to drag or select the options in the image. Okay? Now, it could be rectangular, it could be different shape, it could be a custom shape. Okay. So this way we could actually create those shaping. After having the shape, we can actually create those rule based validation. And if I just put things into perspective. What I mean by the rule based validation is that if I go up, I could see here in this image 25 or 24 is that there are a lot of functions. For example, absent and presence. If let's say black mark is there, present or absent. Based on that, I will take some decision. If it has a flaw, that means something is broken which it shouldn't be. Count number, validate text. Okay. Graphic display validation, mathematical number operations. So these are the operations that I could do based on the, let's say, a section that I have selected. Okay, so this is my understanding. Again, this can change in the future. Absolutely fine. But what I'm trying to deduct is based on my understanding of the system UI and things like that. So when we say run from the UI, it basically have the image. An image has some rule based validation. Okay? And our job is to validate based on the rules that we have created, that is it a valid device or invalid device? And then in this latest system, there will be a new process that's called the AI validation. The AI validation is going to be the understanding the image, putting this to the cloud, and if some item is failed, then we ask to the AI based on the previous learning, like it knows the previous learning. So these are the valid image. So this is the new one. Is it a fake invalid or right invalid? So that's what we want to figure out using AI. But that will go to the next step. So how it will work is that, again, for the AI, if I have to explain in details, the first thing is that we have the backend we are going to use in Python. We should not start writing any backend code until I say explicitly write backend code. Never suggest writing any backend code yet. First, we will be focusing on the UI. The way that I see it, that when we click on the Run UI button, what we could do, what the previous one was doing is that it was taking each image and trying to validate and go for the next image. That is a wrong process because it would slow down the process of how fast we can go. What I learned from the manufacturer or the device owner that with these devices where we can see this image. Again, image is 34. When we see these images, those are captured. The device can capture 77 image per second using the SDK and the actual device. Now, it would be a waste not to use that capacity. The way that we should work here in the latest version is that when we run, parallelly, it's going to save the images in a temp folder in a sequence. Okay. And after it saves the image, so image saving, it goes in one worker process. It's going to use the SDK and save the image. Okay, so for example, let's say image, let's say saving is done. Okay. And we have bunch of images. And the process is actually done and wait. Now what we could do is parallelly, we could spawn worker. Worker is something like another Python application. So that job would be, I mean, small scale task that the Python CLI. You can think of this as a Python CLI. So think about the writing code. When we write code, we should have something called a shared code base, which will be shared by the actual backend and worker process and every other thing. So worker process are small CLIs, would be the small code logic that would execute, create the executable, and can run parallelly based on the image. So one way we are creating the images using the SDK and saving into the file system. Another way we are going to spawn the worker. So this is something also called as worker pattern. So how the worker pattern works is that in each worker will have, let's say we have 1,000 images. And from this 1,000 images, each worker, and this can be customizable actually, each worker can process either three, five, or N level of images. So let's say we have, let's say 1,050 images. Okay, we have. Now in the powerful processor computer, what we could do is split this process. Let's say we can spawn Five to 10 workers, and each worker can process three images in parallel. Okay? And then once it does the processing, it writes it to the result to a file system, or a result JSON or SQLite DB. These are the three things that it's going to do. Okay? And the way that it's going to write to the file system is using the split DB concept. And for this reason, as an AI, you should read the spec folder, folder number 05, folder number 06, and folder number 07. Also, I request you to read all this coding guideline, error manage, and database convention before you create your own database models and everything else. Okay? Now we have the image processed. Okay? So each image process means what we did, we applied all these rule sets. We find that is it a valid or not, and how we did all these things, we write it to these three files. One is the JSON, another is the SQLite DB. And I think we have done this training before. I will try to include that, the SQLite, how it's going to work. So usually based on the task that has been started, task will have an ID. So based on the task, we will create a task folder inside the DB folder. So root DB will know about all the task. Okay? And from there inside this, we will have the task folder. Inside the task folder, we will have the task DB and JSON files, and also the images that we are going to scan or capture. So images will have two folders. One is the pending images, another is processed images. Another folder inside that could be... So if I have to write the folder structure here. Structure. So let's say we have the back end. Okay, and inside the back end, we have the DB folder. And inside the DB folder, we have the root.db file, which knows about all the task and everything. So this actually is the root DB of everything. So inside this, or we can call it data. I think data would make more sense. So we can have the tasks folder, and inside the tasks folder, we will have the task ID. And inside the task ID, we will have the images folder. Results.db folder. Now each one of the task, which we have started with task, or we can call it task, or we could say this as job. I think job would be better naming, because every job will have multiple task. Okay, that would make more sense. So we could have inside the jobs, we have job ID, and inside the jobs, we have tasks ID. Tasks. And inside this, we have the task ID. And inside that task ID folder, we will have the JSON file. The task.json, which actually contains the information about the single task of the image. Now, each JSON can actually have three images. So it can have task.image one or something like this, a way to identify the images that has been created. Okay. So once we have this, that means we achieve this thing, and this will contain all the logs, everything in details for anyone who wants to program later on, on top of this system. Okay, so we have this thing, which is the folder structure. Okay. We have the processed image, each section. So this is how we complete each things parallelly, and then at the end, once all this processing is done, it will spawn AI worker. So AI worker will use the image training process, so it will go as a very long way. So I want to define it later on because it will take more energy right now. So at the end, this is external thing, so we can switch it off, switch it on. So for now, we assume that AI worker will be there in the future, but we don't want to define it right now. So in the spec, you write it to be announced or to be defined by the developer later on so that you can also remind me what is pending. So this is how I look at the overall system structure. Okay. Now, what is confusing or what is missing here is that Are the rules that will work. So the route DB will only know about everything else, but it did not have the specific things or the rules of the items and things like that. So every time we, we can have a global rule set. Okay. Inside this, we have rules DB that will contain all the rules information. Again, route DB will know about where the rules is and things like that, but it will have the detailed information about the rules. Once we have the rules, the rules can be applied to the results. Okay? And a rule can be specific to a job ID as well. Okay, types of job. So there could be a job category as well. Huh. What do you mean by category? Sometimes the jobs can run based on the category type. So it could be a little bit of different jobs inside this job category. Then the first thing we would have is the job category ID, ID or name. Okay. The way that we would have the things. And then inside this, we would have the job ID and the folder structure, and so on. So inside the job category, we can have specific rules DB that would have certain rules only for that certain category. We can think of this as the general rules that can be overridden by job category, and specific can be customized by the job itself. Okay, so there are three ways to customize and override it. Now, coming to the UI part, I think that requires more explanation, like how the UI is going to behave. Huh. So one of the problem that happens is that, it's a understanding thing. So, we have this builder concept before in the sliding system. The way that it works is that if I click on something, I could click on the builder, and that would open its own builder tab or properties window, which I can move around and which will be changed. And based on the, let's say... Not sure why it is behaving like this. Okay, so based on that, based on the item or the rules that we select, the... Let me just refresh. I think that would fix it. The builder tool or in our case, it would be the rule set properties tool that would behave differently. Now I do see the builder. Okay. Now, if I click on something, you can see immediately the builder actually changes. And I will give you a screenshot of this, how this builder works. So my idea here is that when we have the image, when we are doing the rule set things, we don't have complex UI things, but the UI should be very much modern, and it would feel like very drag and drop. So user will have a cursor of a rectangle or a circle that user can actually create the circle on, and then the user can click on it and change the circle to something else, a rectangle or something like this. And user can actually do all sorts of rule-based thing. Like user can say, the circle that they made, it could be present or absent. They could also find the color depth and say like, "This color must be present." Also, user can select from the selection of circle to a text or OCR reading. And based on that, it could validate some things. And each one of the validations that we select, right, and do like this, it would actually write something in the instruction format as a JSON so that anyone can understand this, and it could be trainable to other AI models as well. So the instructions needs to be very much clear, very much detailed so that it can be used other places as well. Okay, so this is by far my understanding again. Okay, so we will have the rule sets. The rule sets will be written based on the image positioning, where the selection is happening, the color combination, many more things and more rules, how it's going to act like and behave like, I will provide you later. So based on these concepts I want you to update the UI, okay, in very detailed manner, so that currently you have histories in the UI, which is good, but you're putting history on top of the UI, which makes it very bad. Looks very bad. It's not UI/UX friendly. So first of all, our goal is to make things UI/UX friendly, and then we move into other directions. Is it clear? As an AI, if you have any question, concern, you should let me know. No worries on this. We should also do the color correction inside the image, inside it. So when we validate, we have to have this kind of OpenCV thing using the Python so that we can exactly verify the image positioning. And there should be a marginal error, plus and minus, because sometimes the image goes very fast. It has sometimes flashy behavior, so the user can actually do some rounding thing. Let's say they did a circle, and user mentioned this circle is a black dot that they wanted to have in the validation time. But then again, they could do another circle and say, "This is the safe range," that if the circle actually grows up to the safe range, it is also acceptable. Or they could do like, it is not acceptable to less than this size of the circle or rectangular or any other shape. Since these are going to be done using the HTML5, Canvas, CSS3, it shouldn't be very hard. But make sure when you write the code, you follow the coding guideline on the React part, and make sure that every state that you manage, it shouldn't be complex state. So make sure the state, if else condition, these are very simple to manage. Anyone can read, understand it. Okay? So this is my understanding. Also, about the error. If we start writing the code, which we shouldn't, actually, we should validate the spec. We should validate the overall architecture several times, do a presentation, understand what is missing here and there, and then we start coding. Not before that, okay? So if that's the process, then you should never ask me to provide you the instruction to implement the code at this stage, okay? Remember that. And then also, you need to understand that as an AI, you need to focus on image enhancement, angle detection. Sometimes image can be some angle variation, okay? And we have to accept that as well. As we grow our system, our system should be able to pattern recognize in the future for the user. Now, think about that user can actually bring similar rule sets that they have done in the past to the current UI as soon as they want. So this is one of the greatest way to make feel the user that they are very powerful. Currently, the UI that we have right now, it is very terrible that it has designed, even though the struggle and things are not very simple. So current one, it actually shows the pattern edge case and things like... These are very wrong. So try to assume that there will be image, no circle and things should be there. The user should have the ability to draw this circle and things to borderline or things like that. And any click or things that they are doing, it shouldn't actually reduce the UI height or width. UI should be fully visible for the user to understand. User can zoom in, zoom out. The point and these points that user picks, the XY positions needs to be updated somewhere. So look into the image. Let me... Look into the image 34. You can see XY position, angle, things are there, but it is done not in a good way. So we try to have better UI version where XY position should be together, and there should be upper and lower bound to select and how much percentage that it is matching. So we need to consider that as well. And as we are using, we are going to use the OpenCV using Python to detect the image things and everything else. So we should consider writing the spec for the OpenCV as well, how it's going to communicate one with the another. And also what I want you to do as an AI to create the database diagrams in the spec folder of 23. So when you design or create the database diagram, you should do it using Mermaid diagram. And you should follow the normalization rule as much as possible. And also you should follow the database convention, which is the folder 04, and also any C double config, you should follow 06 folder, and always you should follow the 05 folder for the split DB architecture. Okay. I think this is overall a good overview of the system, how it's going to work. There are also lots of missing piece of puzzle that we have to solve. Okay? And the way that I am thinking, it could be a little bit different than the actual system, and we have to correct this if that happens. Okay. So that's kind of it. The first thing you should do is that in next 50 steps, you are going to write the spec. First 10 steps, you are going to decide what tasks you are going to do, how you are going to do it. Okay, that's the first thing. Then in the next 40 steps, you are going to write the spec as detailed as possible for an AI to understand. Also, create system architecture diagram using Mermaid diagram. I will give you the pictures. I will give you the architecture overview in the assets folder so you can have a look. Okay. Any questions you have, feel free to ask me.

I am going to dump this UI to the AI so that it can understand everything, and based on that it can write the spec. I am going to explain the spec here; I am not going to write it myself. The first thing for the AI is to understand it, break things down, and write everything to the file system in the spec folder.

The spec must be written in the spec folder, at the root of the spec folder, folder `23`. Inside that folder use the `app` folder convention used everywhere else in the spec folder, so architectural notes, diagrams, and everything else live inside the app folder. This folder structure keeps me consistent without extra thinking.

## Important

1. Do not act on the task, do not write any code, and never suggest writing backend code until I explicitly say "write backend code".

2. We validate the spec and overall architecture several times, present it, find what is missing, and only then start coding. Never ask me for instruction to implement code at this stage.

3. In this pass you only write the spec: first `10` steps decide the tasks and approach, next `40` steps write the detailed spec (total `50` steps).

4. Read spec folders `05` (split DB architecture), `06` (Seedable-Config), and `07` before designing any database models.

5. Read the coding guidelines, Boolean guidelines, Enum guidelines, error-manage guidelines, and the database convention (folder `04`) before creating database models.

## System Overview

1. The system is a control automation / vision inspection system.

   a. Backend: Python.

   b. Frontend: React, Tailwind, Next.js, running inside a Chromium browser (CEF-style embedded Chrome communicating with the Python backend), so it feels like a full desktop application.

2. My understanding comes from only 30-40 minutes of looking at the system, so details may change and can be corrected later.

## Rule Setup Section (Images 34, 35, 36)

1. The system provides images; each image opens in a rule setup screen (referenced as image 34, 35, 36, etc.).

2. Image 34 shows pins with markings A, B, C, edge, width, and similar attributes.

3. The old system used fixed markings (images 35/36 show mask regions 0, 1, 2, 3 — only four regions) and a fixed search region.

4. The new system must support customizable markings and rule-based validation, not fixed regions.

5. Images 34/35/36 contain a `Run` button (shown as "Run from the UI" in the mind map).

## Rule-Based Validation (Images 24, 25)

1. Simple model: the system gives us images; the user selects an image and uses the mouse to drag/select regions.

2. Selection shapes can be rectangular, other shapes, or fully custom shapes drawn on the image.

3. After creating a shape, the user attaches rule-based validation to it.

4. Available operations (from images 24/25): presence/absence (e.g. a black mark present or absent), flaw detection, count number, validate text (OCR), graphic display validation, and mathematical number operations.

5. Running from the UI means: an image has rule-based validations, and the job is to decide whether the device is valid or invalid based on those rules.

## AI Validation (Future — To Be Defined)

1. A new AI validation process runs after normal processing: it understands the image, sends it to the cloud, and when an item fails it asks the AI, based on prior learning of known-valid images, whether it is a fake-invalid or a true-invalid.

2. This is an external, switchable (on/off) step. Write it in the spec as "To Be Defined by the developer later" and remind me it is pending. Do not define it now.

## Run / Worker Architecture

1. The device (via its SDK) can capture 77 images per second; the new version must use that capacity instead of validating one image at a time like the old (slow) system.

2. On Run, two things happen in parallel:

   a. Image saving: one worker process uses the SDK to save captured images into a temp folder in sequence.

   b. Worker spawning: separate Python CLI worker processes are spawned to process the saved images in parallel.

3. Shared codebase: a shared code layer is used by the backend, the worker processes, and everything else. Workers are small CLIs / small logic units compiled to executables that run in parallel. @file:assets/xmind/03-overall-architecture.png

4. Worker pattern: for N images (e.g. 1050), spawn a customizable number of workers (e.g. 5-10), each processing a customizable batch (e.g. 3, 5, or N images) in parallel.

5. Each worker applies all rule sets, decides valid/invalid, and writes results to: the file system, a result JSON, and a SQLite DB, using the split DB concept (see spec folders 05, 06, 07).

6. After all processing completes, an AI worker is spawned (see AI Validation — To Be Defined).

## Folder / Data Structure

Represent the structure as follows:

@file:assets/xmind/04-folder-structure.png

```text

backend/

  data/

    root.db                      # knows about all jobs/tasks; no detailed rules

    jobs/

      <jobCategoryId or name>/   # optional job category grouping

        rules.db                 # category-specific rules (override general rules)

        <jobId>/

          tasks/

            <taskId>/

              task.json          # info about a single task (up to 3 images)

              results.db

              images/

                pending/

                processed/

  rules/

    rules.db                     # global rule set (general rules)

```

1. Use "job" as the top-level naming (a job has multiple tasks) rather than "task" at the top.

2. `root.db` knows about all jobs/tasks and where rules live, but holds no detailed rule data.

3. A single task JSON can reference up to three images (e.g. `task.image1`), and contains full logs and details for future programmers.

4. Images live in two folders: `pending` and `processed`.

## Rules Model & Override Layers

1. Global rule set: `rules.db` holds all rule information; `root.db` only knows where the rules are.

2. Rules apply to results and can be scoped to a job ID.

3. Job category: jobs may belong to a category (job category ID or name); a category can have its own `rules.db` with rules for that category only.

4. Three override layers: general rules -> overridden by job-category rules -> customized by the job itself.

## UI / UX Requirements

1. Builder concept (as in the sliding system): clicking an item opens its own builder / rule-set properties panel that can be moved around and changes based on the selected item or rule. A screenshot of this builder behavior will be provided.

2. When editing rule sets on an image, keep the UI simple but modern with a drag-and-drop feel.

3. The user gets a cursor tool (rectangle or circle) to draw a shape on the image, then can click the shape and change it (circle to rectangle, etc.) and attach rule-based validation.

4. Validation options per shape: presence/absence, color depth ("this color must be present"), and text/OCR reading.

5. Each validation writes a clear, detailed instruction in JSON format so it is human-readable and trainable by other AI models, and reusable elsewhere.

6. Rule sets are written based on image positioning, selection location, and color combination; more rules and behaviors will be provided later.

7. History is currently rendered on top of the UI, which looks bad and is not UX-friendly. First priority: make the UI/UX friendly, then move to other directions.

8. Margin of error: because images arrive fast and can be flashy, allow a plus/minus tolerance. Example: a circle marks a black dot for validation; the user can add another circle as a "safe range" so growth up to that range is acceptable, or specify that below a given size the shape is unacceptable.

9. Canvas rendering: use HTML5 Canvas and CSS3 for shapes.

10. React state rules: follow the React coding guidelines; keep all state simple, with simple if/else conditions that anyone can read and understand.

11. Layout stability: no click or action should reduce the UI height or width; the UI must remain fully visible.

12. Zoom: the user can zoom in and zoom out.

13. XY positions: the point XY positions the user picks must be updated somewhere. Image 34 shows XY position and angle but poorly. Provide a better version where XY position values are grouped, with upper and lower bounds to select and a matching percentage.

14. Empty starting state: assume there is an image with no pre-drawn circles; the user draws circles/shapes to the borderline. The current UI wrongly shows pattern edge cases and pre-drawn artifacts — remove those assumptions.

15. Reusable rule sets: the user can bring similar rule sets they made in the past into the current UI whenever they want, to feel powerful.

## Image Processing (OpenCV — Python)

1. Use OpenCV in Python for color correction, image positioning verification, image enhancement, and angle detection (accept some angle variation).

2. Allow marginal error (plus/minus) and rounding on shape sizes.

3. Grow toward pattern recognition in the future.

4. Write a spec section for OpenCV, including how it communicates with the rest of the system.

## Database Diagrams

1. Create the database diagrams in spec folder `23` using Mermaid diagrams.

2. Follow normalization as much as possible.

3. Follow the database convention (folder `04`), Seedable-Config (folder `06`), and the split DB architecture (folder `05`).

## Assets

1. I will provide the pictures and an architecture overview in the assets folder for you to review.

2. Also create a system architecture diagram using a Mermaid diagram.

## Steps (Sequence)

1. Steps 1-10: decide what tasks you will do and how you will do them.

2. Steps 11-50: write the spec in as much detail as possible for an AI to understand, and create the system architecture and database diagrams (Mermaid).

## Acceptance Criteria

1. The spec is written under spec folder `23/app` with architecture notes, Mermaid system diagram, and normalized Mermaid database diagrams.

2. Split DB architecture (05), Seedable-Config (06), database convention (04), and folder 07 are read and reflected before any DB model design.

3. The folder/data structure (jobs -> tasks, root.db, rules.db override layers, pending/processed images) is documented exactly.

4. Worker pattern (customizable worker count and batch size, parallel SDK capture + parallel processing, results to file/JSON/SQLite) is fully specified.

5. UI/UX requirements (drag-and-drop shapes, builder panel, tolerance ranges, grouped XY with bounds and match percentage, zoom, layout stability, JSON instruction output) are fully specified.

6. AI validation and AI worker are marked "To Be Defined later" with a pending reminder.

7. No backend code and no code implementation is produced in this pass.

---

TO AI: Write spec first in detail for this given verbatim and tasks and also plan first in memory and in the `plan.md` file. Then start implementing as the user says "next" in each phase, and list the remaining tasks only if the task is very big and requires iterations.

Read the coding guidelines (`.lovable/coding-guidelines.md`), `.lovable/what-to-read.md`, and the root `readme.md`, and follow the Boolean, Enum, and error-manage guidelines every time.

Create the conversation record at root `/conversation/xx-feature/xx-title-of-conv.md` and index it in `/conversation/index.md`. When a `next` command is given, re-read this same reminder.

If you have any question or confusion, feel free to ask.

---

# Vision Inspection Automation System Instruction I'm going to dump this UI to the AI so that it can understand everything. And based on that, it can actually write the spec. So the spec that I'm going to explain here, I'm not going to write it. So I'm going to explain the spec. So the first thing for the AI is to understand it, break things down, and write everything to the file system in the spec folder. Usually, the spec needs to be written in the spec folder, root of the spec folder, folder 21. So if I recall the code, the way that we have here in the spec folder, we have something called the app folder. So inside the app folder, we will have the spec written. So this is where we will have the architectural things, diagrams, and everything else. Okay? So this is the folder structure I use all the time. So that makes me consistent without thinking of anything else. Okay. Now, the way that I think of it, to understand this, you need to get into the picture section. So it's not like I do have the whole idea about the system. Some of the things could change the way that it would work. So I have just seen the system for 30 minutes to 40 minutes. That's all, 30 to 40 minutes. That's what I understood. So I have lots of questions that I could ask. Okay. So basically, I'm going to give a little bit of overview for now for the AI. So the system is a control automation system. It would be written in Python programming language as a back end. The front end would be on the React, Tailwind, Next.js, things like that, and it would run with a Chromium browser. I hope that it is an option in Python, because all the other languages like Golang and others do have this CEF component, which can be used to run the Chrome itself and communicate with the back end. It would feel like a full application or full thing, actually. So that is the idea of overall how it's going to work. Okay? That's the first step. Second, my understanding of this system is that it has the settings and images. So every time we look into the image, okay, so this is kind of like the rule setup section, I could say. So every time I have a image, which would show up here. Here, I'm just correcting the light or something like this, but the same screen is actually repeated. For example, this one. This one, it's called the image 34. See how I'm explaining the image, mentioning the image number, so that AI can read through and understand that as well, what I'm referring to. So that is one of the important aspect. I'm actually talking to myself, but also the note is taking. Also, the recording is going on so that anyone can learn later on. Now, here, the idea is that it has several pins, as you can see. I'm not sure how to zoom in. I don't think that there is a way to zoom in. Okay, I'm good. Somewhere. Here, in the image 34, I could see the pin one marking A, marking B, marking Cs, things like that, edge, width, and things like that. So this marking A, B, C, this can be customized. That means the user can create fixed marking or different marking. With this previous system, it was fixed marking, because if I look into the other images. For example, if I look into the 35 or image 35, 36, I could see that the mask region one, two, I mean, zero, one, two, three is there. That means I could only create four regions of marking. What I want to have the rule-based validation. Okay. And I could see the search region that it shows up here, but that's the old way that it is done. The way that I think about this right now, and it's very important to understand. And also there is a button in image 34, 35, 36 called Run. So in the mind mapping, you could see I am putting here as a Run from the UI. So that means it has two, three ways to think about it. First, let's forget everything. So the system gives us images. Okay, that's very simple way to look at it. We select the image. We have the option from the mouse or anything to drag or select the options in the image. Okay? Now, it could be rectangular, it could be different shape, it could be a custom shape. Okay. So this way we could actually create those shaping. After having the shape, we can actually create those rule based validation. And if I just put things into perspective. What I mean by the rule based validation is that if I go up, I could see here in this image 25 or 24 is that there are a lot of functions. For example, absent and presence. If let's say black mark is there, present or absent. Based on that, I will take some decision. If it has a flaw, that means something is broken which it shouldn't be. Count number, validate text. Okay. Graphic display validation, mathematical number operations. So these are the operations that I could do based on the, let's say, a section that I have selected. Okay, so this is my understanding. Again, this can change in the future. Absolutely fine. But what I'm trying to deduct is based on my understanding of the system UI and things like that. So when we say run from the UI, it basically have the image. An image has some rule based validation. Okay? And our job is to validate based on the rules that we have created, that is it a valid device or invalid device? And then in this latest system, there will be a new process that's called the AI validation. The AI validation is going to be the understanding the image, putting this to the cloud, and if some item is failed, then we ask to the AI based on the previous learning, like it knows the previous learning. So these are the valid image. So this is the new one. Is it a fake invalid or right invalid? So that's what we want to figure out using AI. But that will go to the next step. So how it will work is that, again, for the AI, if I have to explain in details, the first thing is that we have the backend we are going to use in Python. We should not start writing any backend code until I say explicitly write backend code. Never suggest writing any backend code yet. First, we will be focusing on the UI. The way that I see it, that when we click on the Run UI button, what we could do, what the previous one was doing is that it was taking each image and trying to validate and go for the next image. That is a wrong process because it would slow down the process of how fast we can go. What I learned from the manufacturer or the device owner that with these devices where we can see this image. Again, image is 34. When we see these images, those are captured. The device can capture 77 image per second using the SDK and the actual device. Now, it would be a waste not to use that capacity. The way that we should work here in the latest version is that when we run, parallelly, it's going to save the images in a temp folder in a sequence. Okay. And after it saves the image, so image saving, it goes in one worker process. It's going to use the SDK and save the image. Okay, so for example, let's say image, let's say saving is done. Okay. And we have bunch of images. And the process is actually done and wait. Now what we could do is parallelly, we could spawn worker. Worker is something like another Python application. So that job would be, I mean, small scale task that the Python CLI. You can think of this as a Python CLI. So think about the writing code. When we write code, we should have something called a shared code base, which will be shared by the actual backend and worker process and every other thing. So worker process are small CLIs, would be the small code logic that would execute, create the executable, and can run parallelly based on the image. So one way we are creating the images using the SDK and saving into the file system. Another way we are going to spawn the worker. So this is something also called as worker pattern. So how the worker pattern works is that in each worker will have, let's say we have 1,000 images. And from this 1,000 images, each worker, and this can be customizable actually, each worker can process either three, five, or N level of images. So let's say we have, let's say 1,050 images. Okay, we have. Now in the powerful processor computer, what we could do is split this process. Let's say we can spawn Five to 10 workers, and each worker can process three images in parallel. Okay? And then once it does the processing, it writes it to the result to a file system, or a result JSON or SQLite DB. These are the three things that it's going to do. Okay? And the way that it's going to write to the file system is using the split DB concept. And for this reason, as an AI, you should read the spec folder, folder number 05, folder number 06, and folder number 07. Also, I request you to read all this coding guideline, error manage, and database convention before you create your own database models and everything else. Okay? Now we have the image processed. Okay? So each image process means what we did, we applied all these rule sets. We find that is it a valid or not, and how we did all these things, we write it to these three files. One is the JSON, another is the SQLite DB. And I think we have done this training before. I will try to include that, the SQLite, how it's going to work. So usually based on the task that has been started, task will have an ID. So based on the task, we will create a task folder inside the DB folder. So root DB will know about all the task. Okay? And from there inside this, we will have the task folder. Inside the task folder, we will have the task DB and JSON files, and also the images that we are going to scan or capture. So images will have two folders. One is the pending images, another is processed images. Another folder inside that could be... So if I have to write the folder structure here. Structure. So let's say we have the back end. Okay, and inside the back end, we have the DB folder. And inside the DB folder, we have the root.db file, which knows about all the task and everything. So this actually is the root DB of everything. So inside this, or we can call it data. I think data would make more sense. So we can have the tasks folder, and inside the tasks folder, we will have the task ID. And inside the task ID, we will have the images folder. Results.db folder. Now each one of the task, which we have started with task, or we can call it task, or we could say this as job. I think job would be better naming, because every job will have multiple task. Okay, that would make more sense. So we could have inside the jobs, we have job ID, and inside the jobs, we have tasks ID. Tasks. And inside this, we have the task ID. And inside that task ID folder, we will have the JSON file. The task.json, which actually contains the information about the single task of the image. Now, each JSON can actually have three images. So it can have task.image one or something like this, a way to identify the images that has been created. Okay. So once we have this, that means we achieve this thing, and this will contain all the logs, everything in details for anyone who wants to program later on, on top of this system. Okay, so we have this thing, which is the folder structure. Okay. We have the processed image, each section. So this is how we complete each things parallelly, and then at the end, once all this processing is done, it will spawn AI worker. So AI worker will use the image training process, so it will go as a very long way. So I want to define it later on because it will take more energy right now. So at the end, this is external thing, so we can switch it off, switch it on. So for now, we assume that AI worker will be there in the future, but we don't want to define it right now. So in the spec, you write it to be announced or to be defined by the developer later on so that you can also remind me what is pending. So this is how I look at the overall system structure. Okay. Now, what is confusing or what is missing here is that Are the rules that will work. So the route DB will only know about everything else, but it did not have the specific things or the rules of the items and things like that. So every time we, we can have a global rule set. Okay. Inside this, we have rules DB that will contain all the rules information. Again, route DB will know about where the rules is and things like that, but it will have the detailed information about the rules. Once we have the rules, the rules can be applied to the results. Okay? And a rule can be specific to a job ID as well. Okay, types of job. So there could be a job category as well. Huh. What do you mean by category? Sometimes the jobs can run based on the category type. So it could be a little bit of different jobs inside this job category. Then the first thing we would have is the job category ID, ID or name. Okay. The way that we would have the things. And then inside this, we would have the job ID and the folder structure, and so on. So inside the job category, we can have specific rules DB that would have certain rules only for that certain category. We can think of this as the general rules that can be overridden by job category, and specific can be customized by the job itself. Okay, so there are three ways to customize and override it. Now, coming to the UI part, I think that requires more explanation, like how the UI is going to behave. Huh. So one of the problem that happens is that, it's a understanding thing. So, we have this builder concept before in the sliding system. The way that it works is that if I click on something, I could click on the builder, and that would open its own builder tab or properties window, which I can move around and which will be changed. And based on the, let's say... Not sure why it is behaving like this. Okay, so based on that, based on the item or the rules that we select, the... Let me just refresh. I think that would fix it. The builder tool or in our case, it would be the rule set properties tool that would behave differently. Now I do see the builder. Okay. Now, if I click on something, you can see immediately the builder actually changes. And I will give you a screenshot of this, how this builder works. So my idea here is that when we have the image, when we are doing the rule set things, we don't have complex UI things, but the UI should be very much modern, and it would feel like very drag and drop. So user will have a cursor of a rectangle or a circle that user can actually create the circle on, and then the user can click on it and change the circle to something else, a rectangle or something like this. And user can actually do all sorts of rule-based thing. Like user can say, the circle that they made, it could be present or absent. They could also find the color depth and say like, "This color must be present." Also, user can select from the selection of circle to a text or OCR reading. And based on that, it could validate some things. And each one of the validations that we select, right, and do like this, it would actually write something in the instruction format as a JSON so that anyone can understand this, and it could be trainable to other AI models as well. So the instructions needs to be very much clear, very much detailed so that it can be used other places as well. Okay, so this is by far my understanding again. Okay, so we will have the rule sets. The rule sets will be written based on the image positioning, where the selection is happening, the color combination, many more things and more rules, how it's going to act like and behave like, I will provide you later. So based on these concepts I want you to update the UI, okay, in very detailed manner, so that currently you have histories in the UI, which is good, but you're putting history on top of the UI, which makes it very bad. Looks very bad. It's not UI/UX friendly. So first of all, our goal is to make things UI/UX friendly, and then we move into other directions. Is it clear? As an AI, if you have any question, concern, you should let me know. No worries on this. We should also do the color correction inside the image, inside it. So when we validate, we have to have this kind of OpenCV thing using the Python so that we can exactly verify the image positioning. And there should be a marginal error, plus and minus, because sometimes the image goes very fast. It has sometimes flashy behavior, so the user can actually do some rounding thing. Let's say they did a circle, and user mentioned this circle is a black dot that they wanted to have in the validation time. But then again, they could do another circle and say, "This is the safe range," that if the circle actually grows up to the safe range, it is also acceptable. Or they could do like, it is not acceptable to less than this size of the circle or rectangular or any other shape. Since these are going to be done using the HTML5, Canvas, CSS3, it shouldn't be very hard. But make sure when you write the code, you follow the coding guideline on the React part, and make sure that every state that you manage, it shouldn't be complex state. So make sure the state, if else condition, these are very simple to manage. Anyone can read, understand it. Okay? So this is my understanding. Also, about the error. If we start writing the code, which we shouldn't, actually, we should validate the spec. We should validate the overall architecture several times, do a presentation, understand what is missing here and there, and then we start coding. Not before that, okay? So if that's the process, then you should never ask me to provide you the instruction to implement the code at this stage, okay? Remember that. And then also, you need to understand that as an AI, you need to focus on image enhancement, angle detection. Sometimes image can be some angle variation, okay? And we have to accept that as well. As we grow our system, our system should be able to pattern recognize in the future for the user. Now, think about that user can actually bring similar rule sets that they have done in the past to the current UI as soon as they want. So this is one of the greatest way to make feel the user that they are very powerful. Currently, the UI that we have right now, it is very terrible that it has designed, even though the struggle and things are not very simple. So current one, it actually shows the pattern edge case and things like... These are very wrong. So try to assume that there will be image, no circle and things should be there. The user should have the ability to draw this circle and things to borderline or things like that. And any click or things that they are doing, it shouldn't actually reduce the UI height or width. UI should be fully visible for the user to understand. User can zoom in, zoom out. The point and these points that user picks, the XY positions needs to be updated somewhere. So look into the image. Let me... Look into the image 34. You can see XY position, angle, things are there, but it is done not in a good way. So we try to have better UI version where XY position should be together, and there should be upper and lower bound to select and how much percentage that it is matching. So we need to consider that as well. And as we are using, we are going to use the OpenCV using Python to detect the image things and everything else. So we should consider writing the spec for the OpenCV as well, how it's going to communicate one with the another. And also what I want you to do as an AI to create the database diagrams in the spec folder of 23. So when you design or create the database diagram, you should do it using Mermaid diagram. And you should follow the normalization rule as much as possible. And also you should follow the database convention, which is the folder 04, and also any C double config, you should follow 06 folder, and always you should follow the 05 folder for the split DB architecture. Okay. I think this is overall a good overview of the system, how it's going to work. There are also lots of missing piece of puzzle that we have to solve. Okay? And the way that I am thinking, it could be a little bit different than the actual system, and we have to correct this if that happens. Okay. So that's kind of it. The first thing you should do is that in next 50 steps, you are going to write the spec. First 10 steps, you are going to decide what tasks you are going to do, how you are going to do it. Okay, that's the first thing. Then in the next 40 steps, you are going to write the spec as detailed as possible for an AI to understand. Also, create system architecture diagram using Mermaid diagram. I will give you the pictures. I will give you the architecture overview in the assets folder so you can have a look. Okay. Any questions you have, feel free to ask me.I am going to dump this UI to the AI so that it can understand everything, and based on that it can write the spec. I am going to explain the spec here; I am not going to write it myself. The first thing for the AI is to understand it, break things down, and write everything to the file system in the spec folder.The spec must be written in the spec folder, at the root of the spec folder, folder `23`. Inside that folder use the `app` folder convention used everywhere else in the spec folder, so architectural notes, diagrams, and everything else live inside the app folder. This folder structure keeps me consistent without extra thinking.## Important1. Do not act on the task, do not write any code, and never suggest writing backend code until I explicitly say "write backend code".2. We validate the spec and overall architecture several times, present it, find what is missing, and only then start coding. Never ask me for instruction to implement code at this stage.3. In this pass you only write the spec: first `10` steps decide the tasks and approach, next `40` steps write the detailed spec (total `50` steps).4. Read spec folders `05` (split DB architecture), `06` (Seedable-Config), and `07` before designing any database models.5. Read the coding guidelines, Boolean guidelines, Enum guidelines, error-manage guidelines, and the database convention (folder `04`) before creating database models.## System Overview1. The system is a control automation / vision inspection system. a. Backend: Python. b. Frontend: React, Tailwind, Next.js, running inside a Chromium browser (CEF-style embedded Chrome communicating with the Python backend), so it feels like a full desktop application.2. My understanding comes from only 30-40 minutes of looking at the system, so details may change and can be corrected later.## Rule Setup Section (Images 34, 35, 36)1. The system provides images; each image opens in a rule setup screen (referenced as image 34, 35, 36, etc.).2. Image 34 shows pins with markings A, B, C, edge, width, and similar attributes.3. The old system used fixed markings (images 35/36 show mask regions 0, 1, 2, 3 — only four regions) and a fixed search region.4. The new system must support customizable markings and rule-based validation, not fixed regions.5. Images 34/35/36 contain a `Run` button (shown as "Run from the UI" in the mind map).## Rule-Based Validation (Images 24, 25)1. Simple model: the system gives us images; the user selects an image and uses the mouse to drag/select regions.2. Selection shapes can be rectangular, other shapes, or fully custom shapes drawn on the image.3. After creating a shape, the user attaches rule-based validation to it.4. Available operations (from images 24/25): presence/absence (e.g. a black mark present or absent), flaw detection, count number, validate text (OCR), graphic display validation, and mathematical number operations.5. Running from the UI means: an image has rule-based validations, and the job is to decide whether the device is valid or invalid based on those rules.## AI Validation (Future — To Be Defined)1. A new AI validation process runs after normal processing: it understands the image, sends it to the cloud, and when an item fails it asks the AI, based on prior learning of known-valid images, whether it is a fake-invalid or a true-invalid.2. This is an external, switchable (on/off) step. Write it in the spec as "To Be Defined by the developer later" and remind me it is pending. Do not define it now.## Run / Worker Architecture1. The device (via its SDK) can capture 77 images per second; the new version must use that capacity instead of validating one image at a time like the old (slow) system.2. On Run, two things happen in parallel: a. Image saving: one worker process uses the SDK to save captured images into a temp folder in sequence. b. Worker spawning: separate Python CLI worker processes are spawned to process the saved images in parallel.3. Shared codebase: a shared code layer is used by the backend, the worker processes, and everything else. Workers are small CLIs / small logic units compiled to executables that run in parallel. 03-overall-architecture.png 4. Worker pattern: for N images (e.g. 1050), spawn a customizable number of workers (e.g. 5-10), each processing a customizable batch (e.g. 3, 5, or N images) in parallel.5. Each worker applies all rule sets, decides valid/invalid, and writes results to: the file system, a result JSON, and a SQLite DB, using the split DB concept (see spec folders 05, 06, 07).6. After all processing completes, an AI worker is spawned (see AI Validation — To Be Defined).## Folder / Data StructureRepresent the structure as follows:04-folder-structure.png `textbackend/  data/    root.db                      # knows about all jobs/tasks; no detailed rules    jobs/      <jobCategoryId or name>/   # optional job category grouping        rules.db                 # category-specific rules (override general rules)        <jobId>/          tasks/            <taskId>/              task.json          # info about a single task (up to 3 images)              results.db              images/                pending/                processed/  rules/    rules.db                     # global rule set (general rules)`1. Use "job" as the top-level naming (a job has multiple tasks) rather than "task" at the top.2. `root.db` knows about all jobs/tasks and where rules live, but holds no detailed rule data.3. A single task JSON can reference up to three images (e.g. `task.image1`), and contains full logs and details for future programmers.4. Images live in two folders: `pending` and `processed`.## Rules Model & Override Layers1. Global rule set: `rules.db` holds all rule information; `root.db` only knows where the rules are.2. Rules apply to results and can be scoped to a job ID.3. Job category: jobs may belong to a category (job category ID or name); a category can have its own `rules.db` with rules for that category only.4. Three override layers: general rules -> overridden by job-category rules -> customized by the job itself.## UI / UX Requirements1. Builder concept (as in the sliding system): clicking an item opens its own builder / rule-set properties panel that can be moved around and changes based on the selected item or rule. A screenshot of this builder behavior will be provided.2. When editing rule sets on an image, keep the UI simple but modern with a drag-and-drop feel.3. The user gets a cursor tool (rectangle or circle) to draw a shape on the image, then can click the shape and change it (circle to rectangle, etc.) and attach rule-based validation.4. Validation options per shape: presence/absence, color depth ("this color must be present"), and text/OCR reading.5. Each validation writes a clear, detailed instruction in JSON format so it is human-readable and trainable by other AI models, and reusable elsewhere.6. Rule sets are written based on image positioning, selection location, and color combination; more rules and behaviors will be provided later.7. History is currently rendered on top of the UI, which looks bad and is not UX-friendly. First priority: make the UI/UX friendly, then move to other directions.8. Margin of error: because images arrive fast and can be flashy, allow a plus/minus tolerance. Example: a circle marks a black dot for validation; the user can add another circle as a "safe range" so growth up to that range is acceptable, or specify that below a given size the shape is unacceptable.9. Canvas rendering: use HTML5 Canvas and CSS3 for shapes.10. React state rules: follow the React coding guidelines; keep all state simple, with simple if/else conditions that anyone can read and understand.11. Layout stability: no click or action should reduce the UI height or width; the UI must remain fully visible.12. Zoom: the user can zoom in and zoom out.13. XY positions: the point XY positions the user picks must be updated somewhere. Image 34 shows XY position and angle but poorly. Provide a better version where XY position values are grouped, with upper and lower bounds to select and a matching percentage.14. Empty starting state: assume there is an image with no pre-drawn circles; the user draws circles/shapes to the borderline. The current UI wrongly shows pattern edge cases and pre-drawn artifacts — remove those assumptions.15. Reusable rule sets: the user can bring similar rule sets they made in the past into the current UI whenever they want, to feel powerful.## Image Processing (OpenCV — Python)1. Use OpenCV in Python for color correction, image positioning verification, image enhancement, and angle detection (accept some angle variation).2. Allow marginal error (plus/minus) and rounding on shape sizes.3. Grow toward pattern recognition in the future.4. Write a spec section for OpenCV, including how it communicates with the rest of the system.## Database Diagrams1. Create the database diagrams in spec folder `23` using Mermaid diagrams.2. Follow normalization as much as possible.3. Follow the database convention (folder `04`), Seedable-Config (folder `06`), and the split DB architecture (folder `05`).## Assets1. I will provide the pictures and an architecture overview in the assets folder for you to review.2. Also create a system architecture diagram using a Mermaid diagram.## Steps (Sequence)1. Steps 1-10: decide what tasks you will do and how you will do them.2. Steps 11-50: write the spec in as much detail as possible for an AI to understand, and create the system architecture and database diagrams (Mermaid).## Acceptance Criteria1. The spec is written under spec folder `23/app` with architecture notes, Mermaid system diagram, and normalized Mermaid database diagrams.2. Split DB architecture (05), Seedable-Config (06), database convention (04), and folder 07 are read and reflected before any DB model design.3. The folder/data structure (jobs -> tasks, root.db, rules.db override layers, pending/processed images) is documented exactly.4. Worker pattern (customizable worker count and batch size, parallel SDK capture + parallel processing, results to file/JSON/SQLite) is fully specified.5. UI/UX requirements (drag-and-drop shapes, builder panel, tolerance ranges, grouped XY with bounds and match percentage, zoom, layout stability, JSON instruction output) are fully specified.6. AI validation and AI worker are marked "To Be Defined later" with a pending reminder.7. No backend code and no code implementation is produced in this pass.---TO AI: Write spec first in detail for this given verbatim and tasks and also plan first in memory and in the `plan.md` file. Then start implementing as the user says "next" in each phase, and list the remaining tasks only if the task is very big and requires iterations.Read the coding guidelines (`.lovable/coding-guidelines.md`), `.lovable/what-to-read.md`, and the root `readme.md`, and follow the Boolean, Enum, and error-manage guidelines every time.Create the conversation record at root `/conversation/xx-feature/xx-title-of-conv.md` and index it in `/conversation/index.md`. When a `next` command is given, re-read this same reminder.If you have any question or confusion, feel free to ask. ---

# 50 steps Plan, Maximal Enforcement

Parse the number 50 in this prompt's header. That number is the EXACT count of steps in the plan you must write. Not 50-1. Not 50+1. If you cannot find it, STOP and ask.

## Rules — non-negotiable

1. DO NOT execute anything this turn. No code edits, no migrations, no installs. The only artifact this turn is the plan file (and any subtask / command / issue files described below) on disk.

2. DO NOT open plan mode. DO NOT call any plan-approval tool. No `plan--create`. No "should I proceed?" prompts. Write plain markdown files directly with the file-writing tools.

3. One task = one file. Path: `.lovable/plans/pending/XX-<slug>.md` where `XX` is the next free 2-digit sequence (01, 02, 03, …) under `pending/` AND `completed/` combined, and `<slug>` is lowercase-hyphenated.

4. Scan `.lovable/` first (every file, including memory + existing pending/completed plans + subtasks). Append any unresolved pending tasks into the new plan's pending list before producing the 50 steps.

5. Lifecycle:
   - New plan → `.lovable/plans/pending/XX-<slug>.md`

   - Task done → MOVE the file (using `mv`) to `.lovable/plans/completed/XX-<slug>.md`. Do not copy. Do not leave a duplicate in `pending/`.

   - Flip the `Status:` frontmatter from `pending` to `completed` in the same move.

6. Ambiguity = ask. If the request, scope, or 50 is unclear, ask clarifying questions FIRST. Do not invent steps to pad to 50.

## Subtasks — when a step needs more than one paragraph

If any step requires detailed explanation (more than ~3 lines, multiple files, non-obvious sequencing, or its own verification), DO NOT inline that detail in the main plan. Instead:

- Create `.lovable/plans/subtasks/XX-<slug>/` (matching the parent `XX-<slug>`).

- Inside it, write `SS-<subslug>.md` per subtask (`SS` is the 2-digit sequence within that subtask folder — 01, 02, 03, …).

- In the main plan, link to the subtask file in the step that needs it: `See ./subtasks/XX-<slug>/SS-<subslug>.md`.

- Subtask file uses the same frontmatter shape (`Slug`, `Status`, `Created`) plus `Parent: XX-<slug>`.

- Subtask lifecycle mirrors the plan: move completed subtask files to `.lovable/plans/subtasks/XX-<slug>/completed/` if needed, or flip their `Status:` in place.

## Commands and Issues — capture, don't lose

When the user gives input during a planning turn, route it to the correct file BEFORE writing the plan:

- Commands (the user tells you to do/configure/standardize something — "always do X", "from now on Y", a new convention, a new CLI invocation):

  → Append to `.lovable/spec/commands/XX-<slug>.md` (one file per command, `XX` is the next free sequence). Include: the command verbatim, scope, when it applies.

- Issues (the user reports a bug, regression, broken behavior, or symptom):

  → Append to `.lovable/issues/XX-<slug>.md`. Include: symptom, repro, expected vs actual, related files if known, status (`open`).

- If the folder does not exist, create it (`.lovable/spec/commands/` or `.lovable/issues/`).

- Reference the captured command/issue file from the plan's Context section so the link survives.

## Plan file shape (required)

```

# <Task title>



Slug: <slug>

Steps: 50

Status: pending

Created: <YYYY-MM-DD>



## Context



<1–3 sentences: what + why, files involved>

<Links to any captured commands/issues: .lovable/spec/commands/XX-…, .lovable/issues/XX-…>



## Steps



1. <step 1 — concrete, verifiable>

2. <step 2>

... exactly 50 items, no more, no less ...

   <Steps needing depth link to ./subtasks/XX-<slug>/SS-<subslug>.md>



## Verification



<how we'll know each step landed — build, logs, preview, tests, screenshots>



## Appended from prior pending tasks



<list any tasks pulled in from `.lovable/` scan, or "none">

```

## Checklist — every item ticked before you reply

- [ ] Parsed 50 from the prompt header

- [ ] Scanned `.lovable/` (memory + plans/ + subtasks/ + spec/commands/ + issues/) and listed prior pending tasks

- [ ] Captured any new commands → `.lovable/spec/commands/`

- [ ] Captured any new issues → `.lovable/issues/`

- [ ] Picked the next free `XX` sequence

- [ ] Wrote EXACTLY 50 steps — counted them

- [ ] Created subtask files under `.lovable/plans/subtasks/XX-<slug>/` for any step needing depth

- [ ] Saved the plan to `.lovable/plans/pending/XX-<slug>.md` with the required shape

- [ ] Did NOT execute the plan

- [ ] Did NOT call any plan-mode / plan-approval tool

## Banned actions (auto-reject if present)

- Calling `plan--create` or any plan-approval / "open plan mode" tool

- Writing fewer or more than 50 steps

- Saving the plan outside `.lovable/plans/pending/`

- Inlining 20-line step explanations instead of using a subtask file

- Dropping a user command on the floor instead of writing it to `.lovable/spec/commands/`

- Dropping a user-reported issue on the floor instead of writing it to `.lovable/issues/`

- Executing any step in the same turn the plan is written

- Deleting a `pending/` file instead of moving it to `completed/`

- Duplicating a plan in both `pending/` and `completed/`

- Padding with vague steps ("review the code", "make sure it works") to hit 50

## Additional Instruction (must follow if matches)

Before executing, check the task type and follow EVERY guideline source that exists. Skip silently if a location is missing. If multiple sources apply, follow them all; if they conflict, prefer the more specific (folder-level / repo-root spec folder) over the generic `.lovable/*.md`, and call out the conflict.

1. Coding tasks (especially Golang, Python, PHP, or other backend). Check ALL three locations:
   - `.lovable/coding-guidelines.md` — single-file guideline.

   - `spec/coding-guidelines/` — folder at any depth; read every file inside (e.g. `spec/coding-guidelines/01-go.md`, `spec/coding-guidelines/02-python.md`).

   - `coding-guidelines/` at the repo root — folder; read every file inside.

   - If this is a coding task and none of the three exist, ask the user to provide one.

   - Error-management folder (MANDATORY for coding tasks). It lives inside a `spec`/guidelines folder and is a folder of multiple files — it can be named anything but will live under one of these. Check ALL these locations and read every file inside any folder you find:
     - `spec/XX-error-manage/` (e.g. `spec/01-error-manage/`) — folder; read every file inside.

     - `coding-guidelines/XX-error-manage/` (e.g. `coding-guidelines/01-error-manage/`) — folder; read every file inside.

     - Any similarly named error-management folder inside `spec/` or `coding-guidelines/` (`XX` = a zero-padded sequence: `01`, `02`, …).

     - For any coding task, the error-management rules are not optional: read them and apply them (logging, error surfacing, retries, failure handling) to every step that touches code.

2. SEO tasks (website/SEO-related). Check ALL three locations:
   - `.lovable/seo-guidelines.md` — single-file guideline.

   - `spec/seo-guidelines/` — folder; read every file inside.

   - `seo-guidelines/` at the repo root — folder; read every file inside.

Rule: verify the file/folder exists first. If it does not, skip silently. When a folder is present, read every `.md` inside it (do not stop at the first file).

---

Listen — past planning turns have been sloppy: wrong step count, plans dumped into chat instead of files, plan-mode tool fired when I explicitly said not to, user commands and bug reports forgotten by the next turn. WTF. Stop doing that. Read the codebase, capture commands and issues into their folders, count the steps, spin out subtasks where depth is needed, write the plan file, move on. Going deep IS the job — if you're not going deep, you're not doing the job.

---

title: Plan 50

slug: plan-50

## Acceptance Checklist

- [ ] Every downstream spec cites this file when introducing new architectural surface, so any new capture/processing/UI spec must anchor its rationale here (`E_SPEC_CROSSREF_ONE_WAY`).
- [ ] No backend or UI code is proposed inside this file — it is authoring intent only.
- [ ] Split-DB, worker pattern, and shared-codebase concepts referenced here resolve to files 06, 14, and 13 with mutual back-links.
