"""Shared helpers for e2e specs under `tests/e2e/`.

Currently owns the deterministic boot-time auto-seed readiness gate
first introduced for `seed_reset_flow.py` (v3.737.0) and extended to
`address_bar_deeplink.py`, `error_history_hotkey.py`, and
`copy_details_toast.py` (v3.738.0). Centralising it here means the
next tweak (timeout, summary line rename in
`src/routes/__root.tsx`, extra diagnostic field) is a single-seam
edit instead of a four-file sweep.

Also owns the forced-failure reseed helpers duplicated by
`error_history_hotkey.py` and `copy_details_toast.py`.

Each e2e spec is invoked as `python3 tests/e2e/<name>.py`, so the
script's directory is on `sys.path` and `from _helpers import ...`
resolves without any package plumbing.
"""

from __future__ import annotations

import asyncio
from typing import Tuple

# Boot-time auto-seed emits this line exactly once when
# `AutoSeedFromFacade` finishes in mode "auto" (see
# `src/routes/__root.tsx` `logSummary(mode, report)` and
# `src/lib/seed/orchestrator.ts` `[seed/orchestrator] summary`).
AUTO_SEED_SUMMARY_PREFIX = "[seed/orchestrator] summary"

# Patch `removeItem` so any of the three seed flag keys throws. The
# orchestrator catches per-key and routes the aggregate into the
# `Reseed partially reset` branch. Kept in sync with
# `src/routes/__root.tsx` and `src/lib/seed/orchestrator.ts`.
BREAK_STORAGE_JS = """
() => {
  const KEYS = new Set([
    'ca:autoseeded:v1',
    'ca:rules-autoseeded:v1',
    'ca.camera.seed.v1',
  ]);
  const orig = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (key) {
    if (KEYS.has(key)) {
      throw new Error('e2e-forced-removeItem-failure');
    }
    return orig.call(this, key);
  };
}
"""

DISPATCH_RESET = (
    "window.dispatchEvent(new CustomEvent('cmd:reset-and-reseed'))"
)


def attach_console_and_seed_gate(page) -> Tuple[list[str], asyncio.Event]:
    """Install a console listener that records every message and sets
    an `asyncio.Event` when the boot-time auto-seed summary lands.

    Returns (console_msgs, auto_seed_done). Call BEFORE `page.goto`
    so no summary line is missed on a cold Vite compile.
    """
    console_msgs: list[str] = []
    auto_seed_done = asyncio.Event()

    def _on_console(m):
        text = f"{m.type}:{m.text}"
        console_msgs.append(text)
        if AUTO_SEED_SUMMARY_PREFIX in m.text and "mode: auto" in m.text:
            auto_seed_done.set()

    page.on("console", _on_console)
    return console_msgs, auto_seed_done


async def wait_for_auto_seed(
    auto_seed_done: asyncio.Event,
    console_msgs: list[str],
    timeout: float = 15.0,
) -> None:
    """Await the boot-time auto-seed gate with a diagnostic timeout.

    Raises AssertionError with the last 10 console messages if the
    summary line never fires within `timeout` seconds.
    """
    try:
        await asyncio.wait_for(auto_seed_done.wait(), timeout=timeout)
    except asyncio.TimeoutError as exc:
        raise AssertionError(
            "boot-time auto-seed never emitted "
            f"'{AUTO_SEED_SUMMARY_PREFIX} ... mode: auto ...'; "
            f"last {len(console_msgs)} console messages: "
            + " | ".join(console_msgs[-10:])
        ) from exc


# --------------------------------------------------------------------- #
# Plan 86 Step 41: seed-profile setup utility.
#
# Frozen SS-07 profile ids. Kept in sync with
# `src/lib/seed/apply-profile-command.ts` FROZEN_SEED_PROFILES and
# `src/lib/seed/schemas-v2.ts` FROZEN_PROFILE_IDS. When adding a
# profile, update all three.
# --------------------------------------------------------------------- #
FROZEN_SEED_PROFILE_IDS: Tuple[str, ...] = (
    "prof-default-pcb",
    "prof-soic-inspection",
    "prof-connector-bank",
    "prof-blister-qa",
    "prof-empty-preview",
    "prof-error-preview",
    "prof-ui-craft-demo",
)

# Structured completion line emitted by
# `src/lib/seed/apply-profile-command.ts` `applySeedProfile` on the
# happy path. Failures land in `useErrorStore` and are surfaced by the
# Global Error Modal; we detect them via the `[seed-v2]` error-log
# prefix (also emitted synchronously).
APPLY_PROFILE_DONE_PREFIX = "[seed-v2] cmd:apply-seed-profile done"
APPLY_PROFILE_START_PREFIX = "[seed-v2] cmd:apply-seed-profile start"


def _dispatch_apply_profile_js(profile_id: str) -> str:
    # No f-string: the JSON.stringify keeps quoting rules simple.
    import json
    return (
        "window.dispatchEvent(new CustomEvent('cmd:apply-seed-profile', "
        f"{{ detail: {{ profileId: {json.dumps(profile_id)} }} }}))"
    )


async def apply_seed_profile(
    page,
    console_msgs: list[str],
    profile_id: str,
    *,
    timeout: float = 15.0,
) -> dict:
    """Dispatch `cmd:apply-seed-profile` and await the structured
    completion line from `apply-profile-command.ts`.

    Requires that `attach_console_and_seed_gate` was called before
    `page.goto`, and that `wait_for_auto_seed` has already resolved
    (so the boot-time auto pass cannot race the manual command).

    Raises AssertionError with the last 10 console messages if the
    done line never fires within `timeout` seconds.

    Returns a small dict with the profile id and the raw done line
    for downstream assertions (e.g. writtenSlices > 0).
    """
    if profile_id not in FROZEN_SEED_PROFILE_IDS:
        raise ValueError(
            f"apply_seed_profile: unknown profile_id {profile_id!r}; "
            f"expected one of {FROZEN_SEED_PROFILE_IDS}"
        )

    done = asyncio.Event()
    captured: dict = {"profileId": profile_id, "line": None}

    def _on_console(m):
        text = m.text
        if APPLY_PROFILE_DONE_PREFIX in text and profile_id in text:
            captured["line"] = text
            done.set()

    page.on("console", _on_console)
    try:
        await page.evaluate(_dispatch_apply_profile_js(profile_id))
        try:
            await asyncio.wait_for(done.wait(), timeout=timeout)
        except asyncio.TimeoutError as exc:
            raise AssertionError(
                f"cmd:apply-seed-profile({profile_id!r}) never emitted "
                f"'{APPLY_PROFILE_DONE_PREFIX}'; last 10 console msgs: "
                + " | ".join(console_msgs[-10:])
            ) from exc
    finally:
        page.remove_listener("console", _on_console)
    return captured
