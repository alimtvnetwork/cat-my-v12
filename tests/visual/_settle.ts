/**
 * Deterministic "settled for visual capture" gate.
 *
 * Replaces `page.waitForTimeout(N)` proxies inside `tests/visual/*` specs.
 * The header specs already freeze CSS `transition`/`animation` via an
 * injected stylesheet (see `sticky-header-states.spec.ts::gotoAndSettle`),
 * so what we actually need to wait for is:
 *   1. two animation frames so React commit + layout have flushed after the
 *      preceding interaction (hover / scroll),
 *   2. `document.fonts.ready` so any late-loading webfont has stopped
 *      shifting subpixel glyph edges under the header clip.
 *
 * Callers pass the same `Page` they were about to `waitForTimeout` on.
 * The helper is intentionally interaction-agnostic so a future ratchet of
 * `VISUAL_DIFF.maxDiffPixelRatio` (see `docs/plans/84/visual-tolerance-pin.md`)
 * inherits one deterministic settle path across every visual spec.
 */
import type { Page } from "@playwright/test";

export async function settleForVisual(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
            if (fonts?.ready) {
              fonts.ready.then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
          });
        });
      }),
  );
}
