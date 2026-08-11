import { z } from "zod";
import {
  EnvelopeSchema,
  EnvelopeErrorsWireSchema,
  EnvelopeStatusSchema,
  EnvelopeAttributesSchema,
} from "./envelope";

export type AppErrorShape = z.infer<typeof EnvelopeErrorsWireSchema>;
export type EnvelopeStatus = z.infer<typeof EnvelopeStatusSchema>;
export type EnvelopeAttributes = z.infer<typeof EnvelopeAttributesSchema>;

export interface Envelope<T = unknown> {
  Status: EnvelopeStatus;
  Attributes: EnvelopeAttributes;
  Results: T[];
  Navigation?: unknown;
  Errors?: AppErrorShape | null;
  MethodsStack?: unknown;
}

export interface BackendClient {
  ping(): Promise<Envelope<{ pong: boolean }>>;
}
