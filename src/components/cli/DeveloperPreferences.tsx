/**
 * `DeveloperPreferences` - operator-facing toggles that live only in the
 * browser (no BE round-trip), rendered inside `/cli/settings`.
 *
 * Plan 90 Step 146. Root cause guarded (one sentence): the "show developer
 * stack frames" preference only affects `EnvelopeErrorPanel` rendering,
 * so persisting it on the BE would be over-engineering, but leaving it
 * un-surfaced would force operators to hand-edit localStorage in devtools
 * every time they wanted to hide frames for a screenshot handoff.
 *
 * Contract:
 *  - Reads/writes via `useShowDevFrames` so the same event bus keeps
 *    every mounted `EnvelopeErrorPanel` in sync without a reload.
 *  - Switch is `disabled` until hydration completes to prevent a click
 *    landing on the SSR default before the persisted value arrives (a
 *    click at that instant would clobber the stored preference with the
 *    default value). Hint text explains the disabled state.
 *  - Pure presentation; no fetching, no route effects.
 */
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useShowDevFrames } from "@/hooks/use-show-dev-frames";
import { useHardwareMockToggle } from "@/hooks/use-hardware-mock";

export function DeveloperPreferences(): React.JSX.Element | null {
  const { show, hydrated: framesHydrated, setShow } = useShowDevFrames();
  const { mock, hydrated: mockHydrated, setMock } = useHardwareMockToggle();

  return (
    <section
      className="rounded-lg border bg-card p-4 space-y-4"
      data-testid="cli-settings-developer-preferences"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Developer preferences</h2>
          <p className="text-xs text-muted-foreground">
            Browser-only toggles (localStorage, no BE round-trip). Applies immediately to every
            mounted error panel in this tab, and to other tabs on the next storage event.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 rounded-md border bg-background/50 px-3 py-3">
          <div className="flex flex-col">
            <Label htmlFor="cli-show-dev-frames" className="text-sm font-medium">
              Show developer stack frames
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When off, <code className="font-mono">EnvelopeErrorPanel</code> hides Backend /
              Frontend / DelegatedServiceErrorStack frames and the DelegatedRequestServer tree even
              in DEV or on 5xx responses. The backend message stays visible so operators can still
              triage the failure.
            </p>
            {!framesHydrated && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Loading persisted preference…
              </p>
            )}
          </div>
          <Switch
            id="cli-show-dev-frames"
            checked={show}
            disabled={!framesHydrated}
            onCheckedChange={setShow}
            data-testid="cli-show-dev-frames-switch"
            aria-label="Show developer stack frames"
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-md border bg-background/50 px-3 py-3">
          <div className="flex flex-col">
            <Label htmlFor="cli-hardware-mock" className="text-sm font-medium">
              Hardware Mock (Seed Mode)
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When enabled, camera capture and discovery are simulated client-side. This mocks the
              presence of <code className="font-mono">LOVABLE_HW_DAHENG=1</code>.
            </p>
            {!mockHydrated && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Loading persisted preference…
              </p>
            )}
          </div>
          <Switch
            id="cli-hardware-mock"
            checked={mock}
            disabled={!mockHydrated}
            onCheckedChange={setMock}
            data-testid="cli-hardware-mock-switch"
            aria-label="Hardware Mock"
          />
        </div>
      </div>
    </section>
  );
}
