import {
  generateV6LetterlyPrompt,
  formatDiagnosticEvidenceLink,
  sanitizeIdentifier,
  type PromptBuilderParams,
  type SplitDbErrorEntry,
} from "./prompt-v6-v7-builder";

export type { PromptBuilderParams, SplitDbErrorEntry };

export const formatScreenshotLink = formatDiagnosticEvidenceLink;

export function buildV6Prompt(params: PromptBuilderParams): string {
  return generateV6LetterlyPrompt(params.session, {
    summary: params.summary || params.options?.summary,
    splitDbErrors: params.splitDbErrors || params.options?.splitDbErrors,
    baseDir: params.baseDir || params.options?.baseDir,
    isTimeRestricted: params.isTimeRestricted || params.options?.isTimeRestricted,
    targetTimezone: params.targetTimezone || params.options?.targetTimezone,
    botAgentName: params.botAgentName || params.options?.botAgentName,
  });
}
