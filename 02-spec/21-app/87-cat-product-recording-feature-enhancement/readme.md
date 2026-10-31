# 87 - CAT Product Recording Feature Enhancement Architecture

- **Specification ID**: `SPEC-87-ROOT`
- **Module**: `AppRuntime / BugRecorder / Telemetry / Runner`
- **Date**: 31-Oct-26
- **Status**: ACTIVE

---

## 1. Executive Summary

This specification defines the comprehensive overhaul of the CAT Product Recording & Diagnostic Suite:
1. **Runner Speed & Terminal Stability**: Eliminating redundant local zip packaging in `run.ps1` and ensuring clean process tree termination without terminal console breakage.
2. **Automated V6 & V7 Letterly Prompts**: Generating standardized prompt markdown for AI pair programming adhering to GitMap prompt formats with IDE file references `[<sequence>-<instance>-<description>](file;<path>)`.
3. **Multi-Action Export Dropdown**:
   - `Export ZIP Bundle`
   - `Copy as Prompt (V6)`
   - `Copy as Prompt (V7)`
   - `Direct Email`
   - `Save to Supabase` (450MB quota cap + 14-day data pruning)
   - `Save to Local Machine` (`.logs/recorded-bugs/<session_id>/`)
   - `Inspect in CLI`
4. **Enhanced UI Telemetry & Spring Animation**: Real-time CSS metrics (padding, margin, color, background, bounding rects, directional navigation, XPaths) and step-number spring click animations.
5. **Intelligent Hover Recording**: Dedicated "Hover Record" mode that captures hover states strictly on interactive elements without redundant duplication.
6. **ROI Drag & Resize Metrics**: Recording start-to-end points, coordinates, deltas, and XPaths during region configuration.
7. **Error Model Visibility**: Accessible floating and navigation menu triggers for Split-DB errors, automatically bundling errors into the recorded prompt.

---

## 2. Specification Index

- [`01-runner-speed-and-terminal-lifecycle-spec.md`](01-runner-speed-and-terminal-lifecycle-spec.md): Instant local runner execution, elimination of redundant zip packaging, and deterministic process tree termination with Win32 console restoration.
- [`02-ui-telemetry-spring-and-hover-spec.md`](02-ui-telemetry-spring-and-hover-spec.md): Real-time CSS metrics (padding, colors, bounding box, XPath), spring click ripple indicator, and deduplicated hover capture.
- [`03-v6-v7-letterly-prompt-engine-spec.md`](03-v6-v7-letterly-prompt-engine-spec.md): Automated GitMap Letterly V6 and V7 prompt serialization, ephemeral visual learning invariant, and IDE image reference syntax.
- [`04-local-snapshot-storage-and-multi-export-spec.md`](04-local-snapshot-storage-and-multi-export-spec.md): Binary-adjacent screenshot directories, unified export dropdown (ZIP, Copy V6, Copy V7), and direct email integration.
- [`05-supabase-quota-and-pruning-spec.md`](05-supabase-quota-and-pruning-spec.md): Dual-tier Supabase synchronization, 450MB storage ceiling enforcement, and 14-day rolling eviction policy.
- [`06-roi-drag-tracking-and-error-visibility-spec.md`](06-roi-drag-tracking-and-error-visibility-spec.md): Region of Interest pointer tracking with delta vectors, top bar error counter badge, and runtime error bundling.

---

## 3. Subtask Execution Mapping

- [Subtask 01: Runner Fix & Terminal Lifecycle](../../../.ai-memory/plans/subtasks/87-cat-product-recording-feature-enhancement/01-runner-fix-and-terminal-lifecycle.md)
- [Subtask 02: V6/V7 Letterly Prompt Builders](../../../.ai-memory/plans/subtasks/87-cat-product-recording-feature-enhancement/02-v6-v7-letterly-prompt-builders.md)
- [Subtask 03: Multi-Action Dropdown & Email](../../../.ai-memory/plans/subtasks/87-cat-product-recording-feature-enhancement/03-multi-action-dropdown-and-email.md)
- [Subtask 04: Supabase 450MB Quota & 14-Day Pruning](../../../.ai-memory/plans/subtasks/87-cat-product-recording-feature-enhancement/04-supabase-quota-and-pruning.md)
- [Subtask 05: UI Telemetry, Spring Animation & Intelligent Hover](../../../.ai-memory/plans/subtasks/87-cat-product-recording-feature-enhancement/05-telemetry-spring-and-hover.md)
- [Subtask 06: ROI Drag Tracking, Error Visibility & E2E Push](../../../.ai-memory/plans/subtasks/87-cat-product-recording-feature-enhancement/06-roi-drag-error-visibility-e2e.md)

---

## 4. User Request (Verbatim)

```text
# CAT Product Recording Feature Enhancement: high priority instruction, non-negotiable task

Let me explain how I do see the CAT product, the recording feature. Current one is not very good enough. When we start the recording, it takes snaps when we click on it. That is correct, but also at the same time, now we want to create prompts automatically, just like you can follow through the `gitmap`, the letterly prompt, how the letterly prompt is designed, and every pattern of the letterly prompt, something similar to this. And we will have version V6 and V7, both of the prompt copy option. Now, as a user, there should be a dropdown where I could do the export as zip. I could copy as prompt as copy V6 or V7. Both of those would be there. And then there could be email section. You could email directly to an email address. I could save it to Supabase, directly send it to there. I will give you Supabase so that you can configure from the... Yeah, Supabase can be added and exported automatically with the system so that it's always running. Yeah, there is that. And the Supabase should have limitations, like it should not ever exceed 450 megabytes. And if it does, then older data would be removed. Let's say more than two weeks old data, always remove so that we always have the latest data. Now, coming back to the issue, how the recording would work. So the current way that the recording tried to showcase is that it does take a snap. But snap is not enough. The reason I'm saying this because I need more information on an UI. Let's say when I hover over or click on something, I also need the export, and that needs to create a full MD file, and that would be copied actually, and that would contain all these images as well. For the images, if we are on the same machine, then it would not, let's say, put the image into the code base or anywhere, but the images would be kept where we are running the binary. It will be kept close to there. Create a folder like the bug reporting, and then every session, it would have a sequence number and date. A folder would be created. In that folder, every image, it would name as a sequence and also the instance section where we are clicking and how many times we are clicking, that should be there in the image. And the image would be encapsulated and added as a file path, as an attachment on each click. Like it would refer to that image. And there is a way that we refer to images in the IDE, and it starts with the third bracket where we give the name of the image. So the name would be the sequence and where we're clicking, which instance we are in, and what the image represents. And then in the brackets, parentheses, it would have the file and then semicolon and then absolute path of the image. This is how the image needs to be represented. Make sure of that. Anywhere the image is represented or file is represented, it needs to be represented like this. So anytime you go to, or click on something, the MD file should have where we are going from where to where, okay? And also a directional path, and also the export and also the button clicks or the page that we are in. Along with that, when we click on it, we need to have the distance, the padding information, whatever we are clicking, the button information, color and things like that, so that the AI can change it based on my view. Let's say I could say in the third step, you need to change that. So it would record as a third or fourth step, whatever the step number is, and each click would refer as like it would show as an animation, like a little bit of magic spring anytime you click. If we're in the recording mode and it said the number, we just check that is. So that from the voice I could refer in this click, you need to fix that. So that's another important step that it needs to fix. Currently, the running is not working. Why we have to zip it if we are running locally? The binaries from the Python, why we have to zip it? Fix that code as well. I'm going to give you the screenshot. Yeah, that is very important. Then I want you to fix the faster build that needs to be very fast when we're doing locally. Now in the recording feature, every click is recorded, color is also recorded wherever you click. There should be a button called hover record. You could do that, then every hover effect that we see, it could be menu hover or things like that, then also it would take a single image, but it would not take too many of the image. So that intelligence the system needs to have. So let's say if same hover happened twice, it's not going to record both. It would record only once. Remember that. And that needs to be very precise because otherwise you would have too many screenshots, and that would happen based on a button or image if you hover over that has a click event, only those. Not everywhere we hover, it would not have any effect. Also, one more important section is the rule section, where we add the rule and add the region of interest. So these also, when we drag a start, if we click on the hover record, then it would start with the start point. It would mention where the start point is, how it is, based on the actual pixel, XPath, and so on, so that the AI can understand. And then also it should refer back to the thing when the drag is over or resize is over. So when we click and try to drag and make things bigger, it'll do the first click and the last click as a screenshot and also explain what happened or how many pixels we get down, and with the XPath and explanation where we are clicking, how we are clicking, and with the screenshot so that AI can understand. Now, these images that we put into this, it should be explicitly mentioned that never save this image inside the assets. This would be just for a learning purpose for the AI, so make sure that you fix the bug, understand it, and forget about it. And if there is any confusion with the AI, AI can ask back. First, it should actually answer back what it understood that what it has to fix. And then it would start the fixing of the code. So the recording debug would be very powerful. It would record itself, how the user is behaving, clicking on it, so that AI can track back every move. And make sure in the system, the error manage and error model is visible. Currently, it is not working at all. I don't see the error model. You can also check `Antigravity Manager or Antigravity Tools` package that how they manage that error model. There is a section button on top of the error. And you can actually have a menu item for the errors. I could see all these errors and copy this. That would be easier. And if we start the recording, any error that comes, that would also be captured into an MD file so that it could be copied at once. So when we do the copy, either within V6 or V7, it'll make a single markdown copy so that I can paste it to the Antigravity or any AI that could follow and fix the issues. Does this make sense? Do you follow through? Can you please help me with this? And there are several issues in the run command. The run command needs to be very fast, very explicit, make sure that everything is very professional. Currently, it is not. And one more issue is that once we run and then close, the terminal breaks. Find the root cause, fix it. Is it understood?
```
