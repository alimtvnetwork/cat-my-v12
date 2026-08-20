import { useForm, type UseFormProps, type UseFormReturn, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z, ZodType } from "zod";

/**
 * useSetupForm: thin wrapper that wires react-hook-form + zod with the
 * defaults every Setup form should share (validate on blur, revalidate on
 * change, keep dirty values across schema swaps).
 *
 * We deliberately keep this generic and un-opinionated so RULE SET and
 * NEW PROJECT forms both use it without special-casing.
 */
export function useSetupForm<S extends ZodType<FieldValues>>(
  schema: S,
  options: Omit<UseFormProps<z.output<S>>, "resolver"> = {},
): UseFormReturn<z.output<S>> {
  return useForm<z.output<S>>({
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
    ...options,
    resolver: zodResolver(schema as any),
  });
}
