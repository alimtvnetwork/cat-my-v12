"""RulesDb Draft Differentiation

Rules can exist in two states:
- committed: Saved to the backend (IsDraft = False)
- draft: Local-only pending changes (IsDraft = True)

This module provides helper functions for querying each state.
"""


from sqlalchemy.orm import Session

from BE.models.rules import RuleModel


def get_committed_rules(db: Session, project_id: int) -> list[RuleModel]:
    """Return only committed (non-draft) rules for a project."""
    return (
        db.query(RuleModel)
        .filter(
            RuleModel.ProjectId == project_id,
            RuleModel.IsDraft == False,  # noqa: E712
        )
        .all()
    )


def get_draft_rules(db: Session, project_id: int) -> list[RuleModel]:
    """Return only draft rules for a project."""
    return (
        db.query(RuleModel)
        .filter(
            RuleModel.ProjectId == project_id,
            RuleModel.IsDraft == True,  # noqa: E712
        )
        .all()
    )


def promote_draft_to_committed(
    db: Session, rule_id: int
) -> RuleModel | None:
    """Promote a draft rule to committed state."""
    rule = db.query(RuleModel).filter(RuleModel.Id == rule_id).first()
    if rule is not None:
        rule.IsDraft = False
        db.commit()
        db.refresh(rule)
    return rule
