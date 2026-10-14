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
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await page.evaluate(async () => {
        const links = Array.from(
          document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
        );

        await Promise.all(
          links.map((link) => {
            if (link.sheet) {
              return Promise.resolve();
            }

            return new Promise<void>((resolve) => {
              link.addEventListener("load", () => resolve(), { once: true });
              link.addEventListener("error", () => resolve(), { once: true });
              setTimeout(resolve, 3000);
            });
          }),
        );

        const start = performance.now();

        while (performance.now() - start < 5000) {
          const headerH = getComputedStyle(document.documentElement).getPropertyValue("--header-h");

          if (headerH && headerH.trim().length > 0) {
            break;
          }

          await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;

        if (fonts?.ready) {
          try {
            await fonts.ready;
          } catch {
            /* ignore */
          }
        }

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        });
      });

      return;
    } catch (error) {
      const isContextDestroyed =
        error instanceof Error &&
        (error.message.includes("Execution context was destroyed") ||
          error.message.includes("navigating") ||
          error.message.includes("Target closed"));

      if (attempt === maxAttempts - 1 || !isContextDestroyed) {
        throw error;
      }

      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
  }
}
