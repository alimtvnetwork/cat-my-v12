import React from "react";
import { IssueCategoryType, type BugReportSummary } from "@/lib/recorder/types";

interface RecorderSummaryFormProps {
  summary: BugReportSummary;
  onChange: (updated: BugReportSummary) => void;
}

export function RecorderSummaryForm({
  summary,
  onChange,
}: RecorderSummaryFormProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div>
        <label className="block mb-1 font-semibold text-slate-300">
          Issue Title / One-line Summary
        </label>
        <input
          type="text"
          value={summary.title}
          onChange={(e) => onChange({ ...summary, title: e.target.value })}
          placeholder="e.g. Pocket 2 inspection false reject on high threshold"
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 font-semibold text-slate-300">Category</label>
          <select
            value={summary.category}
            onChange={(e) =>
              onChange({ ...summary, category: e.target.value as IssueCategoryType })
            }
            className="w-full rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value={IssueCategoryType.UiGlitch}>UI Glitch / Layout</option>
            <option value={IssueCategoryType.InspectionDefect}>Inspection Accuracy / Defect</option>
            <option value={IssueCategoryType.Performance}>Performance / Lag</option>
            <option value={IssueCategoryType.CrashOrError}>Crash or Error</option>
            <option value={IssueCategoryType.Other}>Other</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold text-slate-300">
            Reporter Name (Optional)
          </label>
          <input
            type="text"
            value={summary.reporterName ?? ""}
            onChange={(e) => onChange({ ...summary, reporterName: e.target.value })}
            placeholder="Operator / Tester"
            className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1 font-semibold text-slate-300">
          What went wrong? (Observed Behavior)
        </label>
        <textarea
          rows={2}
          value={summary.actualBehavior}
          onChange={(e) =>
            onChange({ ...summary, actualBehavior: e.target.value, description: e.target.value })
          }
          placeholder="Describe what happened when you clicked or ran the test..."
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none resize-none"
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold text-slate-300">
          What was expected? (Expected Behavior)
        </label>
        <textarea
          rows={2}
          value={summary.expectedBehavior}
          onChange={(e) => onChange({ ...summary, expectedBehavior: e.target.value })}
          placeholder="What should have happened instead?"
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-white focus:border-cyan-400 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
