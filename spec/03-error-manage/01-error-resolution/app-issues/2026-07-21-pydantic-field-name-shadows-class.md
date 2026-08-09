# Issue: Pydantic Field Name Shadows Same-Module Class

**Date:** 2026-07-21
**Severity:** Medium
**Status:** Resolved

---

## Error Description

Defining `Envelope.Errors: Errors | None = None` inside `BE/envelope.py`, where a sibling class was also named `Errors`, crashed model construction under pytest with:

```
TypeError: unsupported operand type(s) for |: 'NoneType' and 'NoneType'
Unable to evaluate type annotation 'Navigation | None'.
```

The same crash appeared for `Navigation` and `MethodsStack`. It reproduced only inside `pytest` collection order, not `python -c "import BE.envelope"`, which made it easy to miss.

## Root Cause

The file used `from __future__ import annotations`, so all annotations are strings and Pydantic evaluates them lazily via `typing.get_type_hints(cls, globalns, localns)`. Pydantic passes `localns=cls.__dict__`. The class body contained field descriptors named `Errors`, `Navigation`, `MethodsStack`, which shadowed the sibling classes of the same name in that local namespace. Evaluation of `"Navigation | None"` resolved `Navigation` to the field descriptor (effectively `None` after Pydantic processing), giving `None | None` and the TypeError. The reason it did not fail on plain import is that isolated import order kept the module namespace clean, while pytest's collection triggered a different resolution path that exercised the local namespace.

## Solution

Renamed the shadowed Pydantic fields to lowercase Python attributes and used `Field(alias=...)` to preserve the PascalCase wire keys required by `02-error-architecture/05-response-envelope`:

```python
class Envelope(BaseModel):
    model_config = ConfigDict(frozen=True, populate_by_name=True)
    status: Status = Field(alias="Status")
    attributes: Attributes = Field(alias="Attributes")
    results: list[Any] = Field(alias="Results")
    navigation: Navigation | None = Field(default=None, alias="Navigation")
    errors: Errors | None = Field(default=None, alias="Errors")
    methods_stack: MethodsStack | None = Field(default=None, alias="MethodsStack")

    def to_wire(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True, by_alias=True)
```

All 110 backend tests pass.

## Prevention

- Plan 89 Step 6: `scripts/lint/no-shadowing-field-names.py` walks every Pydantic model and fails if any field name matches a class defined in the same module.
- Rule: with `from __future__ import annotations`, Pydantic field names in a model MUST NOT collide with any class defined in the same module. Use `Field(alias=...)` when the wire format needs the colliding name.
- Reproduction rule: for envelope-touching changes, always run the full pytest suite, not just the touching test file, because collection order surfaces these shadowing crashes.

## Related

- `BE/envelope.py`
- `spec/03-error-manage/02-error-architecture/05-response-envelope/04-response-envelope-reference.md`
- Pydantic v2 `_typing_extra.get_model_type_hints`
- `.lovable/plans/pending/89-error-manage-01-error-resolution.md` (S6)
