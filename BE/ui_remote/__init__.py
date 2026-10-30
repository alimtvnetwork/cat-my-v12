"""CLI-to-UI remote-control package (spec 54).

Adapted from the Antigravity Manager CLI-UI chain: the CLI posts action
packets to the backend, the frontend hook polls and performs the real DOM
action through the same code path as a user click. This app has no Tauri
event bus, so the backend holds an in-memory packet queue the browser
polls (see `queue.py`).

The registry is the single source of truth for addressable elements.
Every entry is verified against a real page source: `id` is the stable
identifier, `name` is the visible label, `xpath` resolves the live DOM
node. Ids are never invented. Screens without addressable attributes
(vision marking canvases) are follow-ups, not fabrications.
"""

from BE.ui_remote import queue, registry
from BE.ui_remote.registry import ELEMENTS, find_by_id, find_by_xpath, list_elements

__all__ = ["ELEMENTS", "find_by_id", "find_by_xpath", "list_elements", "queue", "registry"]
