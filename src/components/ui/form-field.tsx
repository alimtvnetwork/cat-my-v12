import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// FormField: opinionated wrapper around Label + control slot + helper/error.
// Consumers pass the actual control (Input, Select, Combobox) as children and
// this component handles a11y wiring (aria-describedby, aria-invalid, ids)
// via a render-prop so we do not need to clone children implicitly.

export interface FormFieldRenderArgs {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

export interface FormFieldProps {
  label: React.ReactNode;
  required?: boolean;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: (args: FormFieldRenderArgs) => React.ReactNode;
}

export function FormField({
  label,
  required,
  helper,
  error,
  htmlFor,
  className,
  children,
}: FormFieldProps) {
  const autoId = React.useId();
  const id = htmlFor ?? autoId;
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label
        htmlFor={id}
        className={cn(
          "text-xs font-medium tracking-wide uppercase text-muted-foreground",
          invalid && "text-destructive",
        )}
      >
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children({ id, describedBy, invalid })}
      {helper && !error ? (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
