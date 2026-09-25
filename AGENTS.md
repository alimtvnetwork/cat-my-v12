<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

> [!NOTE]
> **Compound Keyboard Keys**: Always use compound helpers from KeyboardKeyType (e.g. KeyboardKeyType.isEnterOrSpace(key)) rather than chaining conditions (||) to comply with P4a complexity limits.

> [!TIP]
> **Future Agents**: Please refer to Command 40 and Plan 88 for historical context and ongoing execution steps regarding the latest backend v1 specifications.

> [!IMPORTANT]
> **Essential Coding Constraints (Auto-Enforced)**:
> - **Strict Boolean Standard**: `is` and `has` only (`can`, `should`, `was`, etc. are banned). Positive framing only, non-nullable.
> - **No Bare Void in Go**: Functions must return `Result[T]` or `*appfault.AppError`.
> - **Parameter Structs**: Banned loose >2-3 parameters; use `*Params` / options structs.
> - **Vertical Line Gaps**: Mandatory blank lines before `if`, after `}`, before `return`/`throw`, and around multiline struct calls.
> - **5–8 Files Micro-Batching**: All refactors must be broken into bounded subtasks of 5–8 files.
