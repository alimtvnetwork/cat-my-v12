"""Supabase storage quota governance and retention pruning policies.

Enforces:
1. 450MB Storage Limit Invariant: 450 * 1024 * 1024 = 471,859,200 bytes across
   relational tables and binary storage objects.
2. 14-Day Rolling Eviction Policy: deletes records older than 14 days prior to uploads.
3. Emergency Oldest-Record Pruning: frees space sequentially if 14-day pruning does not
   yield sufficient quota, falling back safely to local storage if quota remains breached.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import logging
from typing import Any

logger = logging.getLogger("BE.bug_reports.supabase_retention")

MAX_STORAGE_BYTES: int = 450 * 1024 * 1024  # 471,859,200 bytes (450MB)
DEFAULT_RETENTION_DAYS: int = 14
ESTIMATED_ROW_BYTES: int = 8192


@dataclass(frozen=True)
class QuotaStatus:
    """Storage quota status representation."""

    total_bytes: int
    quota_bytes: int
    is_quota_exceeded: bool
    available_bytes: int
    attachment_bytes: int = 0
    storage_object_bytes: int = 0
    report_count: int = 0

    def __getitem__(self, key: str) -> Any:
        """Backward-compatibility helper for dictionary-style subscripting."""
        if key == "is_over_quota":
            return self.is_quota_exceeded

        if key == "total_mb":
            return round(self.total_bytes / (1024 * 1024), 2)

        if key == "attachment_count":
            return self.report_count

        return getattr(self, key)

    def get(self, key: str, default: Any = None) -> Any:
        """Safe getter for backward-compatibility with dicts."""
        try:
            return self[key]
        except (AttributeError, KeyError):
            return default

    @property
    def is_over_quota(self) -> bool:
        """Alias for is_quota_exceeded."""
        return self.is_quota_exceeded

    @property
    def total_mb(self) -> float:
        """Total megabytes rounded to 2 decimals."""
        return round(self.total_bytes / (1024 * 1024), 2)

    def to_dict(self) -> dict[str, Any]:
        """Convert status to a standard dictionary."""
        return {
            "total_bytes": self.total_bytes,
            "total_mb": self.total_mb,
            "quota_bytes": self.quota_bytes,
            "is_quota_exceeded": self.is_quota_exceeded,
            "is_over_quota": self.is_quota_exceeded,
            "available_bytes": self.available_bytes,
            "attachment_bytes": self.attachment_bytes,
            "storage_object_bytes": self.storage_object_bytes,
            "report_count": self.report_count,
        }


@dataclass(frozen=True)
class PruningSummary:
    """Summary of records pruned during retention eviction."""

    deleted_reports_count: int
    deleted_attachments_count: int
    freed_bytes: int
    is_pruned: bool
    cutoff_timestamp: str = ""

    def __getitem__(self, key: str) -> Any:
        """Backward-compatibility helper for dictionary-style subscripting."""
        if key == "has_deleted":
            return self.is_pruned

        return getattr(self, key)

    def get(self, key: str, default: Any = None) -> Any:
        """Safe getter for backward-compatibility with dicts."""
        try:
            return self[key]
        except (AttributeError, KeyError):
            return default

    @property
    def has_deleted(self) -> bool:
        """Alias for is_pruned."""
        return self.is_pruned

    def to_dict(self) -> dict[str, Any]:
        """Convert pruning summary to dictionary."""
        return {
            "deleted_reports_count": self.deleted_reports_count,
            "deleted_attachments_count": self.deleted_attachments_count,
            "freed_bytes": self.freed_bytes,
            "is_pruned": self.is_pruned,
            "has_deleted": self.is_pruned,
            "cutoff_timestamp": self.cutoff_timestamp,
        }


@dataclass(frozen=True)
class QuotaCheckParams:
    """Input parameter struct for pre-upload quota verification."""

    incoming_bytes: int = 0
    has_auto_prune: bool = True
    retention_days: int = DEFAULT_RETENTION_DAYS


@dataclass(frozen=True)
class QuotaCheckResult:
    """Result of pre-upload quota verification."""

    is_allowed: bool
    current_usage_bytes: int
    max_bytes: int
    is_pruned: bool
    available_bytes: int
    message: str = ""
    pruning_summary: PruningSummary | None = None


class SupabaseRetentionManager:
    """Manages storage accounting and 14-day rolling eviction policies."""

    def __init__(
        self,
        client: Any,
        max_storage_bytes: int = MAX_STORAGE_BYTES,
        retention_days: int = DEFAULT_RETENTION_DAYS,
    ) -> None:
        self._client = client
        self._max_storage_bytes = max_storage_bytes
        self._retention_days = retention_days

    def get_storage_usage(self) -> QuotaStatus:
        """Query aggregate storage usage via RPC or direct PostgREST calculation."""
        # 1. Attempt server-side RPC computation
        try:
            rpc_res = self._client.rpc("get_telemetry_storage_usage", {})

            if isinstance(rpc_res, dict) and "total_bytes" in rpc_res:
                total_b = int(rpc_res.get("total_bytes", 0))
                quota_b = int(rpc_res.get("quota_bytes", self._max_storage_bytes))
                is_exceeded = bool(rpc_res.get("is_quota_exceeded", total_b >= quota_b))
                avail_b = int(rpc_res.get("available_bytes", max(0, quota_b - total_b)))

                return QuotaStatus(
                    total_bytes=total_b,
                    quota_bytes=quota_b,
                    is_quota_exceeded=is_exceeded,
                    available_bytes=avail_b,
                    attachment_bytes=int(rpc_res.get("attachment_bytes", 0)),
                    storage_object_bytes=int(rpc_res.get("storage_object_bytes", 0)),
                    report_count=int(rpc_res.get("report_count", 0)),
                )
        except Exception as exc:
            logger.debug("RPC get_telemetry_storage_usage unavailable, using direct query fallback: %s", exc)

        # 2. Fallback: manual query aggregation across tables
        total_bytes = 0
        attachment_bytes = 0
        report_count = 0

        try:
            attachments = self._client.select("bug_attachments", "?select=size_bytes")

            for att in attachments:
                if isinstance(att, dict) and att.get("size_bytes"):
                    val = int(att["size_bytes"])
                    attachment_bytes += val
                    total_bytes += val
        except Exception as exc:
            logger.debug("Storage check bug_attachments query error: %s", exc)

        try:
            reports = self._client.select("bug_reports", "?select=id")
            report_count = len(reports)
            total_bytes += report_count * ESTIMATED_ROW_BYTES
        except Exception as exc:
            logger.debug("Storage check bug_reports query error: %s", exc)

        is_quota_exceeded = total_bytes >= self._max_storage_bytes
        available_bytes = max(0, self._max_storage_bytes - total_bytes)

        return QuotaStatus(
            total_bytes=total_bytes,
            quota_bytes=self._max_storage_bytes,
            is_quota_exceeded=is_quota_exceeded,
            available_bytes=available_bytes,
            attachment_bytes=attachment_bytes,
            storage_object_bytes=0,
            report_count=report_count,
        )

    def prune_older_than(self, days: int = DEFAULT_RETENTION_DAYS) -> PruningSummary:
        """Evict diagnostic records and cascade attachments older than specified days."""
        # 1. Attempt server-side RPC procedure
        try:
            rpc_res = self._client.rpc("prune_expired_bug_reports", {"p_retention_days": days})

            if isinstance(rpc_res, dict) and "deleted_reports_count" in rpc_res:
                return PruningSummary(
                    deleted_reports_count=int(rpc_res.get("deleted_reports_count", 0)),
                    deleted_attachments_count=int(rpc_res.get("deleted_attachments_count", 0)),
                    freed_bytes=int(rpc_res.get("freed_bytes", 0)),
                    is_pruned=bool(rpc_res.get("is_pruned", False)),
                    cutoff_timestamp=str(rpc_res.get("cutoff_timestamp", "")),
                )
        except Exception as exc:
            logger.debug("RPC prune_expired_bug_reports unavailable, using direct delete fallback: %s", exc)

        # 2. Fallback: manual cascading delete via PostgREST
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=days)
        cutoff_iso = cutoff_dt.isoformat()
        deleted_reports = 0
        deleted_attachments = 0
        freed_bytes = 0

        # Delete expired attachments first
        try:
            del_att = self._client.delete(
                "bug_attachments", f"?created_at=lt.{cutoff_iso}"
            )

            if isinstance(del_att, list):
                deleted_attachments = len(del_att)
                for item in del_att:
                    if isinstance(item, dict) and item.get("size_bytes"):
                        freed_bytes += int(item["size_bytes"])
        except Exception as exc:
            logger.debug("Direct delete bug_attachments error: %s", exc)

        # Delete expired reports (cascades any remaining attachments)
        try:
            del_rep = self._client.delete(
                "bug_reports", f"?created_at=lt.{cutoff_iso}"
            )

            if isinstance(del_rep, list):
                deleted_reports = len(del_rep)
                freed_bytes += deleted_reports * ESTIMATED_ROW_BYTES
        except Exception as exc:
            logger.debug("Direct delete bug_reports error: %s", exc)

        # Clean audit events if table exists
        try:
            self._client.delete("audit_events", f"?CreatedAt=lt.{cutoff_iso}")
        except Exception:
            pass

        is_pruned = (deleted_reports > 0) or (deleted_attachments > 0)

        return PruningSummary(
            deleted_reports_count=deleted_reports,
            deleted_attachments_count=deleted_attachments,
            freed_bytes=freed_bytes,
            is_pruned=is_pruned,
            cutoff_timestamp=cutoff_iso,
        )

    def prune_oldest_until_budget(self, target_free_bytes: int) -> PruningSummary:
        """Evict oldest diagnostic records sequentially until target_free_bytes is freed."""
        # 1. Attempt server-side RPC procedure
        try:
            rpc_res = self._client.rpc("prune_oldest_bug_reports", {"p_target_bytes": target_free_bytes})

            if isinstance(rpc_res, dict) and "deleted_reports_count" in rpc_res:
                return PruningSummary(
                    deleted_reports_count=int(rpc_res.get("deleted_reports_count", 0)),
                    deleted_attachments_count=0,
                    freed_bytes=int(rpc_res.get("freed_bytes", 0)),
                    is_pruned=bool(rpc_res.get("is_pruned", False)),
                )
        except Exception as exc:
            logger.debug("RPC prune_oldest_bug_reports unavailable, using direct query fallback: %s", exc)

        # 2. Fallback: manual sequential deletion of oldest reports
        freed_bytes = 0
        deleted_reports = 0

        try:
            oldest_rows = self._client.select(
                "bug_reports", "?select=id,created_at&order=created_at.asc&limit=50"
            )

            for row in oldest_rows:
                if freed_bytes >= target_free_bytes:
                    break

                if not isinstance(row, dict) or not row.get("id"):
                    continue

                row_id = str(row["id"])

                # Query attachments for this report to track freed bytes
                try:
                    atts = self._client.select("bug_attachments", f"?report_id=eq.{row_id}&select=size_bytes")
                    for att in atts:
                        if isinstance(att, dict) and att.get("size_bytes"):
                            freed_bytes += int(att["size_bytes"])
                except Exception:
                    pass

                # Delete report (cascades to attachments)
                self._client.delete("bug_reports", f"?id=eq.{row_id}")
                deleted_reports += 1
                freed_bytes += ESTIMATED_ROW_BYTES
        except Exception as exc:
            logger.debug("Sequential oldest pruning error: %s", exc)

        is_pruned = deleted_reports > 0

        return PruningSummary(
            deleted_reports_count=deleted_reports,
            deleted_attachments_count=0,
            freed_bytes=freed_bytes,
            is_pruned=is_pruned,
        )

    def check_quota_and_prepare(self, params: QuotaCheckParams) -> QuotaCheckResult:
        """Verify storage ceiling; trigger 14-day and emergency eviction if required."""
        usage = self.get_storage_usage()
        projected_bytes = usage.total_bytes + params.incoming_bytes
        has_pruned = False
        latest_summary: PruningSummary | None = None

        if projected_bytes > self._max_storage_bytes and params.has_auto_prune:
            logger.info(
                "Supabase projected storage %d exceeds 450MB quota. Triggering 14-day retention eviction.",
                projected_bytes,
            )
            retention_summary = self.prune_older_than(days=params.retention_days)
            has_pruned = retention_summary.is_pruned
            latest_summary = retention_summary

            # Re-evaluate usage after 14-day pruning
            usage = self.get_storage_usage()
            projected_bytes = usage.total_bytes + params.incoming_bytes

            # If still over budget, attempt emergency oldest pruning
            if projected_bytes > self._max_storage_bytes:
                deficit = projected_bytes - self._max_storage_bytes
                logger.warning(
                    "Storage still over quota after 14-day pruning. Deficit: %d bytes. Evicting oldest records.",
                    deficit,
                )
                emergency_summary = self.prune_oldest_until_budget(deficit)
                has_pruned = has_pruned or emergency_summary.is_pruned
                latest_summary = emergency_summary

                # Final usage re-assessment
                usage = self.get_storage_usage()
                projected_bytes = usage.total_bytes + params.incoming_bytes

        is_allowed = projected_bytes <= self._max_storage_bytes
        available = max(0, self._max_storage_bytes - projected_bytes)
        message = ""

        if not is_allowed:
            mb_projected = round(projected_bytes / (1024 * 1024), 1)
            mb_max = round(self._max_storage_bytes / (1024 * 1024), 1)
            message = (
                f"Supabase storage limit of {mb_max}MB exceeded "
                f"({mb_projected}MB projected). Upload deferred to local queue."
            )

        return QuotaCheckResult(
            is_allowed=is_allowed,
            current_usage_bytes=usage.total_bytes,
            max_bytes=self._max_storage_bytes,
            is_pruned=has_pruned,
            available_bytes=available,
            message=message,
            pruning_summary=latest_summary,
        )


__all__ = [
    "DEFAULT_RETENTION_DAYS",
    "ESTIMATED_ROW_BYTES",
    "MAX_STORAGE_BYTES",
    "PruningSummary",
    "QuotaCheckParams",
    "QuotaCheckResult",
    "QuotaStatus",
    "SupabaseRetentionManager",
]
