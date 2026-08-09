# Command 15 — Tools-images explainer MDs

Status: active
Created: 2026-07-16

## Verbatim

> Can you please explain each image to the spec UI folder, which is inside the spec, uh, folder 24? Just create, uh, tools, images, and explain every image for an AI in next, uh, fifty steps. Clearly explain it in detail so that the AI, it reads the image, that MD file, it would understand what the image is about in very details, every portion, every color details, what the image actually represents, what it tries to do, what kind of text are there, what is the user expectation, what the button is going to do.

## Scope

- Applies to every image in `assets/tools-images/`.
- Output MDs live in `spec/24-app-ui-design-system/tools-images/`, one MD per image, plus `INDEX.md`.
- MD shape is defined in `.lovable/plans/subtasks/40-tools-images-spec-docs/00-md-template.md`.

## When it applies

- Any time new screenshots are added to `assets/tools-images/`: add a matching MD using the same template.
- Any time an existing MD is regenerated: keep the frontmatter `Source:` pointing at the exact asset path.
- Audience is always an AI without access to the image; err on the side of transcribing more, not less.

## Related plan

`.lovable/plans/pending/40-tools-images-spec-docs.md`
