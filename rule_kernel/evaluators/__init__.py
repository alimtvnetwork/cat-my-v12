"""Rule evaluators package (Plan 90 Step 82+).

Importing this package registers concrete predicates with
`rule_kernel.predicates`, replacing the `NotImplemented` stubs
seeded in Step 81. Registration is side-effecting at import time so
downstream call sites need only `import rule_kernel.evaluators` once
(typically from the CLI entrypoint or a route module) to activate the
real dispatch table.

Currently registered:
  - PresenceAbsence (Step 82)
  - FlawDetect (Step 85)
  - Count (Step 86)
  - GraphicDisplayCheck (Step 87)
  - MathExpression (Step 88)
"""

from __future__ import annotations

from rule_kernel.evaluators import count as _count  # noqa: F401
from rule_kernel.evaluators import flaw_detect as _flaw_detect  # noqa: F401
from rule_kernel.evaluators import graphic_display_check as _gdc  # noqa: F401
from rule_kernel.evaluators import math_expression as _math_expression  # noqa: F401
from rule_kernel.evaluators import presence_absence as _presence_absence  # noqa: F401

__all__: list[str] = []
