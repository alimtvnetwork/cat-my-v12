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
  rules: {
    list(): Promise<Envelope<{ items: CatRuleWire[]; total: number; provider?: string }>>;
    create(payload: Partial<CatRuleWire>): Promise<Envelope<CatRuleWire>>;
  };
  samples: {
    list(): Promise<Envelope<{ items: CatSampleWire[]; total: number; provider?: string }>>;
  };
}

export interface CatRuleWire {
  RuleId: number;
  LegacyRuleId?: string;
  RuleKind: string;
  OrderIndex: number;
  ParamsJson: string;
  IsActive: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface CatSampleWire {
  SampleId: number;
  LegacySampleId?: string;
  Label: string;
  ImageFilePath: string;
  WidthPx?: number;
  HeightPx?: number;
  Channels?: number;
  SizeBytes?: number;
  Sha256?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}
