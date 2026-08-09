import * as React from "react";
import type { FieldErrors } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Aggregates react-hook-form errors into a single aria-live region that
// announces validation failures without requiring focus to move.
// Renders nothing when there are no errors so screen readers stay quiet.

export interface FormErrorSummaryProps {
  errors: FieldErrors;
  labels?: Record<string, string>;
  className?: string;
  title?: string;
  "data-testid"?: string;
}

function collect(
  errors: FieldErrors,
  labels: Record<string, string>,
): Array<{ name: string; message: string }> {
  const out: Array<{ name: string; message: string }> = [];
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.length > 0) {
      out.push({ name: labels[path] ?? path, message: rec.message });

      return;
    }
    for (const key of Object.keys(rec)) {
      walk(rec[key], path ? `${path}.${key}` : key);
    }
  };
  walk(errors, "");

  return out;
}

export function FormErrorSummary({
  errors,
  labels = {},
  className,
  title = "Please fix the following before continuing:",
  ...rest
}: FormErrorSummaryProps) {
  const items = collect(errors, labels);
  const hasErrors = items.length > 0;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      data-testid={rest["data-testid"] ?? "form-error-summary"}
      className={cn(
        hasErrors
          ? "flex gap-hmi-2 rounded-sm border border-destructive/40 bg-destructive/10 p-hmi-3 text-hmi-body text-destructive"
          : "sr-only",
        className,
      )}
    >
      {hasErrors ? (
        <>
          <AlertCircle aria-hidden size={16} className="mt-[2px] shrink-0" />
          <div className="space-y-hmi-1">
            <p className="font-semibold">{title}</p>
            <ul className="list-disc pl-hmi-4">
              {items.map((it) => (
                <li key={it.name}>
                  <span className="font-medium">{it.name}:</span> {it.message}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
