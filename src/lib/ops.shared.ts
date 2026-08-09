export enum OpsEventCodeType {
  I_SEC_AUDIT_PRUNED = "I_SEC_AUDIT_PRUNED",
  E_SEC_RETENTION_FAILED = "E_SEC_RETENTION_FAILED",
  E_SEC_DENIAL_BURST = "E_SEC_DENIAL_BURST",
  I_SEC_ADMIN_WRITE = "I_SEC_ADMIN_WRITE",
  E_SEC_ROLE_DENIED = "E_SEC_ROLE_DENIED",
  E_SEC_DENIED = "E_SEC_DENIED",
  E_CFG_UNKNOWN_DEVICE = "E_CFG_UNKNOWN_DEVICE",
  AuditBundleExportRequested = "AuditBundleExportRequested",
  AuditBundleExported = "AuditBundleExported",
  AuditBundleExportDenied = "AuditBundleExportDenied",
  AuditBundleExportFailed = "AuditBundleExportFailed",
  AuditBundleDownloadUrlIssued = "AuditBundleDownloadUrlIssued",
}
export type OpsEventCode = OpsEventCodeType;

export type OpsEvent = {
  id: number;
  ts: string;
  code: OpsEventCode;
  subject: string;
  detail: string;
  actor?: string;
  prior?: string;
  next?: string;
  correlationId?: string;
};
