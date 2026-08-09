# Command 17, code-quality: enums, constants, no bad inline code

Scope: all of src/\*\*.
When it applies: every edit going forward, and a one-time sweep.

Command verbatim (paraphrased from user, do not change logic):

> In many places you have written bad codes in the src file. There is no
> enum use, constant use, string manipulation, string checking. You try
> to reduce the code file, that is all right, but you cannot write
> inline code to reduce the line count. If required, split into a
> smaller component. Do not chase 100 lines by cramming if/else into one
> line. Update the error-manage coding guideline and the src folder
> based on that. Do not change any logic. When checking a constant,
> define an enum in the types folder and refer to that enum back.

Rules:

1. No magic strings / numbers in comparisons. Extract enums to src/types/\*\*.
2. One enum per concept, one file per enum (src/types/<domain>/<Enum>.ts).
3. Shared constants live in src/lib/<domain>/constants.ts, imported by name.
4. No single-line if/else or nested ternaries to shrink LOC. Prefer named
   sub-components or helper functions in the same folder.
5. Errors flow through AppError + ErrorCode enum (see spec/03-error-manage).
6. Do not change behavior during the sweep. Refactor only.
