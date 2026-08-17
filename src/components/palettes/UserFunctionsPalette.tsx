import { PaletteIdType } from "@/lib/stores/palette-store";
/**
 * Plan 64 step 89: User Functions palette.
 *
 * Root cause: `palette-store.ts` reserved the `userFunctions` palette id in
 * its hidden default state, but no component ever rendered under that id,
 * so "Toggle Panel: User Functions" from the Command Palette was a no-op.
 * This is the palette shell. Function entries are seeded from a static list
 * for now; a per-project user-function store lands with a later Plan 64 step.
 */
import { PaletteFrame } from "@/components/app-shell/PaletteFrame";
import { FunctionSquare } from "lucide-react";

interface UserFunction {
  id: string;
  name: string;
  signature: string;
}

const STARTER_FUNCTIONS: UserFunction[] = [
  { id: "avg", name: "avg", signature: "(a, b) -> number" },
  { id: "clamp", name: "clamp", signature: "(x, lo, hi) -> number" },
  { id: "distance", name: "distance", signature: "(p1, p2) -> number" },
];

export function UserFunctionsPalette(): React.JSX.Element | null {
  return (
    <PaletteFrame id={PaletteIdType.Userfunctions} title="User Functions">
      <div className="p-2">
        <p className="mb-2 text-hmi-caption text-ca-ink-muted">
          Reusable expressions callable from Math rules. Per-project editor lands with a later Plan
          64 step.
        </p>
        <ul aria-label="User functions" className="space-y-1">
          {STARTER_FUNCTIONS.map((fn) => (
            <li
              key={fn.id}
              className="flex items-center gap-2 rounded-sm px-2 py-1 text-hmi-body text-ca-ink hover:bg-ca-select/20"
            >
              <FunctionSquare aria-hidden size={14} className="text-ca-primary" />
              <span className="font-mono">{fn.name}</span>
              <span className="text-hmi-caption text-ca-ink-muted">{fn.signature}</span>
            </li>
          ))}
        </ul>
      </div>
    </PaletteFrame>
  );
}
