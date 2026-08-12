import { z } from "zod";

export const EnvelopeStatusSchema = z.object({
  IsSuccess: z.boolean(),
  IsFailed: z.boolean(),
  Code: z.number(),
  Message: z.string(),
  Timestamp: z.string(),
});

export const EnvelopeAttributesSchema = z.object({
  RequestedAt: z.string(),
  RequestDelegatedAt: z.string().optional(),
  HasAnyErrors: z.boolean(),
  IsSingle: z.boolean(),
  IsMultiple: z.boolean(),
  IsEmpty: z.boolean(),
  TotalRecords: z.number().optional(),
  PerPage: z.number().optional(),
  TotalPages: z.number().optional(),
  CurrentPage: z.number().optional(),
  TraceId: z.string().optional().nullable(),
});

export const EnvelopeErrorsWireSchema = z.object({
  Code: z.string(),
  BackendMessage: z.string(),
  DelegatedServiceErrorStack: z.array(z.string()).optional(),
  Backend: z.array(z.string()).optional(),
  Frontend: z.array(z.string()).optional(),
  Details: z.record(z.unknown()).optional(),
});

export const EnvelopeSchema = z.object({
  Status: EnvelopeStatusSchema,
  Attributes: EnvelopeAttributesSchema,
  Results: z.array(z.unknown()),
  Navigation: z.unknown().optional(),
  Errors: EnvelopeErrorsWireSchema.nullable().optional(),
  MethodsStack: z.unknown().optional(),
});
