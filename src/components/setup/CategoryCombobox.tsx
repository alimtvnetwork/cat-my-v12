import * as React from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface CategoryComboboxProps {
  /** All available category options (typically from useCategoryOptions). */
  options: readonly string[];
  /** Currently selected category names. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** Optional persist callback for freshly created options (project scope). */
  onCreate?: (name: string) => void;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  /** Hard cap on selections (default 32, matches zod schema). */
  max?: number;
  disabled?: boolean;
}

const norm = (s: string) => s.trim().toLowerCase();

export function CategoryCombobox({
  options,
  value,
  onChange,
  onCreate,
  id,
  invalid,
  describedBy,
  placeholder = "Select or create categories",
  max = 32,
  disabled,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedSet = React.useMemo(() => new Set(value.map(norm)), [value]);

  const q = query.trim();
  const qNorm = norm(q);
  const exactMatch = options.some((o) => norm(o) === qNorm) || selectedSet.has(qNorm);
  const canCreate = Boolean(q) && !exactMatch && value.length < max;

  const toggle = (name: string) => {
    const key = norm(name);

    if (selectedSet.has(key)) {
      onChange(value.filter((v) => norm(v) !== key));
    } else {
      if (value.length >= max) return;
      onChange([...value, name]);
    }
  };

  const create = () => {
    if (!canCreate) return;
    onCreate?.(q);
    onChange([...value, q]);
    setQuery("");
  };

  const remove = (name: string) => {
    const key = norm(name);
    onChange(value.filter((v) => norm(v) !== key));
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              value.length === 0 && "text-muted-foreground",
              invalid && "border-destructive ring-destructive/20",
            )}
          >
            <span className="truncate">
              {value.length === 0 ? placeholder : `${value.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter>
            <CommandInput
              placeholder="Search or type to create..."
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (KeyboardKeyType.isEnter(e.key) && canCreate) {
                  e.preventDefault();
                  create();
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                {canCreate ? (
                  <button
                    type="button"
                    onClick={create}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                    Create <span className="font-medium">"{q}"</span>
                  </button>
                ) : (
                  <span className="block px-2 py-3 text-sm text-muted-foreground">
                    No categories found.
                  </span>
                )}
              </CommandEmpty>
              {options.length > 0 ? (
                <CommandGroup heading="Existing">
                  {options.map((opt) => {
                    const checked = selectedSet.has(norm(opt));

                    return (
                      <CommandItem key={opt} value={opt} onSelect={() => toggle(opt)}>
                        <Check
                          className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")}
                        />
                        {opt}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
              {canCreate ? (
                <CommandGroup heading="Create">
                  <CommandItem value={`__create__${q}`} onSelect={create}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{q}"
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => remove(v)}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
