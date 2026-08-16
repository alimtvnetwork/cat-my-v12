/**
 * User-layer config writer form (Plan 90 Step 121).
 *
 * Publishes only the fields present in the server-provided
 * `UserFieldSchemaMap`, so unknown keys cannot be typed into the DOM.
 * The BE (`POST /api/cli/config/user`) is authoritative and rejects any
 * key not in `_USER_LAYER_SCHEMA` with `E_BE_BAD_REQUEST`; this UI is a
 * usability layer, not a trust boundary. Empty inputs post `null` to
 * clear the field.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useAppQuery } from "@/lib/wrappers/use-app-query";
import { useAppMutation } from "@/lib/wrappers/use-app-mutation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getUserConfig,
  setUserConfig,
  type UserFieldSchemaMap,
  type UserLayer,
} from "@/lib/observability/config.functions";

type Draft = Record<string, string>;

function toDraft(values: Record<string, unknown>, schema: UserFieldSchemaMap): Draft {
  const draft: Draft = {};
  for (const field of Object.keys(schema)) {
    const v = values[field];
    draft[field] = v === undefined || v === null ? "" : String(v);
  }

  return draft;
}

function coerceForWire(
  field: string,
  raw: string,
  schema: UserFieldSchemaMap,
): { value: unknown; error: string | null } {
  if (raw === "") return { value: null, error: null };
  const spec = schema[field];

  if (!spec) return { value: null, error: `Unknown field '${field}'` };

  if (spec.type === "integer") {
    if (/^-?\d+$/.test(raw) === false) return { value: null, error: "must be an integer" };

    return { value: Number.parseInt(raw, 10), error: null };
  }

  if (spec.type === "number") {
    const n = Number(raw);

    if (Number.isFinite(n) === false) return { value: null, error: "must be a number" };

    return { value: n, error: null };
  }

  return { value: raw, error: null };
}

export function UserConfigForm() {
  const qc = useQueryClient();
  const query = useAppQuery<UserLayer>({
    queryKey: ["cli", "config", "user"],
    queryFn: () => getUserConfig({ data: {} }),
  });
  const [draft, setDraft] = useState<Draft>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (query.data) setDraft(toDraft(query.data.values, query.data.schema));
  }, [query.data]);

  const mutation = useAppMutation({
    mutationFn: (values: Record<string, unknown>) => setUserConfig({ data: { values } }),
    onSuccess: (data) => {
      qc.setQueryData(["cli", "config", "user"], data);
      qc.invalidateQueries({ queryKey: ["cli", "config", "effective"] });
      toast.success("User config saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading user config…</p>;
  }

  if (query.isFail === true || !query.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load user config</AlertTitle>
        <AlertDescription>
          {query.error instanceof Error ? query.error.message : "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  const schema = query.data.schema;
  const fields = Object.keys(schema);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: Record<string, unknown> = {};
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      const { value, error } = coerceForWire(field, draft[field] ?? "", schema);

      if (error) {
        nextErrors[field] = error;
        continue;
      }

      payload[field] = value;
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {query.data.note && (
        <Alert>
          <AlertTitle>Note</AlertTitle>
          <AlertDescription>{query.data.note}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const spec = schema[field];
          const value = draft[field] ?? "";
          const stored = Object.prototype.hasOwnProperty.call(query.data.values, field);
          const err = fieldErrors[field];
          const enumValues = spec.enum;

          return (
            <div key={field} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`user-cfg-${field}`} className="font-mono text-xs">
                  {field}
                </Label>
                {stored && (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    stored
                  </Badge>
                )}
              </div>
              {enumValues ? (
                <Select
                  value={value}
                  onValueChange={(v) => setDraft((d) => ({ ...d, [field]: v }))}
                >
                  <SelectTrigger id={`user-cfg-${field}`}>
                    <SelectValue placeholder={`(inherit) — pick a ${spec.type}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {enumValues.map((opt) => (
                      <SelectItem key={String(opt)} value={String(opt)}>
                        {String(opt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`user-cfg-${field}`}
                  value={value}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  placeholder={`(inherit) — ${spec.type}${
                    spec.minimum !== undefined ? ` >=${spec.minimum}` : ""
                  }${spec.maximum !== undefined ? ` <=${spec.maximum}` : ""}`}
                  inputMode={spec.type === "integer" || spec.type === "number" ? "numeric" : "text"}
                />
              )}
              {err ? (
                <p className="text-xs text-destructive">{err}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Blank clears this field.</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save user config"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={mutation.isPending}
          onClick={() => setDraft(toDraft(query.data.values, schema))}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
