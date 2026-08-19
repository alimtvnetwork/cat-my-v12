// OCR results bus: subscribable last-read cache per rule id.
// Populated by the OCR evaluator (future primitive slice) and consumed
// by the OCR rule editor to surface the "current read" in-panel.

export interface OcrResult {
  ruleId: string;
  text: string;
  confidence: number; // 0..1
  at: number; // epoch ms
}

type Listener = () => void;

const results = new Map<string, OcrResult>();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function publishOcrResult(result: OcrResult): void {
  results.set(result.ruleId, result);
  emit();
}

export function clearOcrResult(ruleId: string): void {
  if (results.delete(ruleId)) emit();
}

export function getOcrResult(ruleId: string): OcrResult | undefined {
  
  return results.get(ruleId);
}

export function subscribeOcrResults(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

// Test-only reset helper.
export function __resetOcrResultsForTests(): void {
  results.clear();
  listeners.clear();
}
