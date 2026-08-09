import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
          patterns: [
            {
              // Plan 72 step 27 (Rule 53, spec/21-app/53-ui-seed-facade.md):
              // UI seed data must flow through the UiSeedFacade. Direct
              // imports of the bundled JSON (or anything else under
              // `src/lib/seed/data/`) from outside `src/lib/seed/**` bypass
              // Zod validation, defeat the swappable Memory/Remote
              // facades, and re-introduce the coupling Plan 72 removed.
              // Emit E_BUG_SEED_LEAK at lint time.
              group: [
                "**/lib/seed/data/*",
                "**/lib/seed/data/**",
                "@/lib/seed/data/*",
                "@/lib/seed/data/**",
              ],
              message:
                "E_BUG_SEED_LEAK: import seed data through useSeedSlice / useSeedBundle (see spec/21-app/53-ui-seed-facade.md). Direct imports from src/lib/seed/data/** outside src/lib/seed/** are forbidden.",
            },
            {
              // Plan 73 step 31b (Issue 26 closeout): the hardcoded sample
              // catalogue exports (`SAMPLE_LIBRARY`, `SAMPLE_POV_MAP`) must
              // flow through the `useSampleLibrary` adapter so UI seed
              // metadata can come from JSON/remote facades. Only the
              // adapter and the module itself may spell those names.
              group: ["@/lib/editor/sample-library"],
              importNames: ["SAMPLE_LIBRARY", "SAMPLE_POV_MAP"],
              message:
                "E_BUG_SAMPLE_LEAK: read samples through useSampleLibrary() (src/lib/editor/useSampleLibrary.ts). Direct imports of SAMPLE_LIBRARY/SAMPLE_POV_MAP outside the adapter are forbidden.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Plan 43 slice-2 step 14 (v3.229.0): ban inline literals that now
      // live in `src/lib/constants/`. Fast in-editor feedback complements
      // `scripts/check-magic-strings.sh --strict` which covers non-TS.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/]",
          message:
            "Use HttpMethod.* from '@/lib/constants' instead of inlining HTTP method strings.",
        },
        {
          selector:
            "Literal[value=/^(ca\\.debug\\.captureRequestPanel\\.collapsed|ca\\.captureHistory\\.v1|editor\\.previewMode\\.v1|editor\\.previewDebugOverlay\\.v1|ca\\.settings\\.camera\\.controls|ca\\.uiPrefs\\.v1|ca\\.referenceImage\\.v1|ca\\.activeProgram\\.v1|ca:projects:list-prefs:v1|ca\\.sample\\.selection\\.v1)$/]",
          message:
            "Use StorageKey.* from '@/lib/constants' instead of inlining a browser storage key.",
        },
        {
          selector:
            "Literal[value=/^(editor:open-inspector|editor-reference-ready|ca:bug-error|ca:menu-command)$/]",
          message: "Use AppEvent.* from '@/lib/constants' instead of inlining a CustomEvent name.",
        },
        {
          // Plan 67 step 44 (v3.412.0): ban raw Tailwind palette color
          // utilities in JSX className strings. Design tokens live in
          // `src/styles.css` as `ca-*` variables and MUST be used so dark
          // mode + theming stay coherent. Backdrops using `bg-black/60`
          // and container `bg-black` framing remain permitted (no digit
          // suffix) since they are opacity-driven scrims, not palette
          // steps. See spec 09 for the token contract.
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|divide|placeholder|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]/]",
          message:
            "Use ca-* design tokens (see src/styles.css) instead of hard-coded Tailwind palette colors. Hard-coded palette utilities bypass theming and break dark mode.",
        },
        {
          // Plan 42 step 29: ban raw ReasonCode literal strings outside
          // the declaring module. The PascalCase codes below are unique to
          // the rule-runner surface (spec 47 s6, spec 48 s6-s7, spec 49
          // s5-s6); typing them as strings drifts silently from the
          // ReasonCode enum. "OK" is deliberately excluded because it is
          // a common English label used throughout the UI and diagnostics.
          selector:
            "Literal[value=/^(ColorDeltaE|EmptyRoi|RuleConditionEval|SequentialShortCircuit|RulesetEval)$/]",
          message:
            "Use ReasonCode.* from '@/types/rules/ReasonCode' instead of the raw literal. See src/types/rules/ReasonCode.ts.",
        },
        {
          // v3.466.0: ban `reasonCode: "OK"` etc. in object literals. This
          // catches the "OK" case that the module-scope selector above
          // deliberately excludes (because "OK" is also a common UI label).
          // Scoping to the `reasonCode` property key means we only fire when
          // the literal is genuinely a ReasonCode assignment.
          selector:
            "Property[key.name='reasonCode'] > Literal[value=/^(OK|ColorDeltaE|EmptyRoi|RuleConditionEval|SequentialShortCircuit|RulesetEval)$/]",
          message:
            "Use ReasonCode.* from '@/types/rules/ReasonCode' when setting `reasonCode`, not a raw string literal.",
        },
        {
          // v3.466.0: ban raw ValidationMode strings ("parallel" /
          // "sequential") when they appear as the value of a
          // `validationMode` property or key. Both words are otherwise
          // common English so we scope by property key rather than
          // banning the bare literal.
          selector:
            "Property[key.name='validationMode'] > Literal[value=/^(parallel|sequential)$/]",
          message:
            "Use ValidationMode.* from '@/types/rules/ValidationMode' instead of the raw literal.",
        },
        {
          // v3.466.0: ban raw ConditionType strings when assigned to a
          // `conditionType` (or `type` inside a rule-condition context via
          // the unique 'same-image' hyphenated form) property. The
          // hyphenated 'same-image' is unique enough to gate outside a
          // property scope too.
          selector:
            "Property[key.name='conditionType'] > Literal[value=/^(same-image|presence|color)$/]",
          message:
            "Use ConditionType.* from '@/types/rules/ConditionType' instead of the raw literal.",
        },
        {
          selector: "Literal[value='same-image']",
          message:
            "Use ConditionType.SameImage from '@/types/rules/ConditionType' instead of the raw 'same-image' literal.",
        },
        {
          // v3.466.0: ban raw ColorSpace strings when assigned to a
          // `colorSpace` property. 'rgb'/'hsv' are too generic to blanket
          // ban, so scope by property key.
          selector: "Property[key.name='colorSpace'] > Literal[value=/^(rgb|hsv)$/]",
          message:
            "Use the ColorSpace values from '@/lib/editor/primitives/color-mat' instead of the raw literal.",
        },
      ],
    },
  },
  {
    // The registries themselves must declare the literals.
    files: ["src/lib/constants/**"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Plan 72 step 27: the seed facade folder itself is the ONE seam that
    // is allowed to reach into `src/lib/seed/data/**`. Tests under
    // `src/lib/seed/__tests__/**` also load fixtures directly. Turn the
    // pattern ban off for these paths only.
    files: ["src/lib/seed/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
    },
  },
  {
    // Plan 73 step 31b: the sample-library adapter is the ONE UI seam
    // that may import `SAMPLE_LIBRARY` / `SAMPLE_POV_MAP` directly.
    files: [
      "src/lib/editor/useSampleLibrary.ts",
      "src/lib/editor/sample-library.ts",
      "src/lib/editor/__tests__/**",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // ReasonCode / other rules-domain enums are declared under
    // `src/types/rules/`. The declaring modules must be allowed to spell
    // the literals; everything else uses the enum.
    files: ["src/types/rules/**"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // The declaring modules for ValidationMode / ConditionType / ColorSpace
    // and their nearest label/description tables must be allowed to spell
    // the literals. Tests and the migration/IO layers that translate
    // stored strings are covered by the `tests/` + `__tests__/` override
    // and the explicit `src/lib/editor/migrations.ts` allowance below.
    files: [
      "src/types/ruleset/**",
      "src/lib/editor/primitives/color-mat.ts",
      "src/lib/editor/migrations.ts",
      "src/lib/editor/ruleset-io.ts",
      "src/lib/editor/schema.ts",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Tests read the literals to lock values.
    files: ["tests/**", "src/**/__tests__/**"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    // Shadcn UI primitives colocate a component with its variants (cva
    // recipes, context, forwarded refs). Splitting each helper into its
    // own file breaks the upstream shadcn import shape and gains nothing.
    // Fast Refresh degrades to a full reload for those files only, which
    // is acceptable for library primitives.
    files: ["src/components/ui/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  eslintPluginPrettier,
);
