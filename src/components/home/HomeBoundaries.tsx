export enum HomeBoundariesToneType {
  Muted = "muted",
  Error = "error",
}
// Boundaries + fallbacks for the home route. Keep the HmiShell (top nav)
// mounted so the layout never disappears, even when data fetches fail.
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { HmiShell } from "@/components/hmi";
import { recordHomeError } from "@/lib/diagnostics/home-error-log";
import { AppError, toAppError } from "@/lib/errors/AppError";
import { ErrorCodeType } from "@/types/errors/ErrorCode";

function HomeFallback({
  tone,
  title,
  body,
  action,
}: {
  tone: HomeBoundariesToneType;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const border = tone === HomeBoundariesToneType.Error ? "border-ca-ng/60" : "border-ca-border";

  return (
    <HmiShell title="Home">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-hmi-3 px-hmi-6 py-hmi-8">
        <div
          className={`flex flex-col gap-hmi-2 border ${border} bg-ca-panel p-hmi-6`}
          role={tone === HomeBoundariesToneType.Error ? "alert" : undefined}
        >
          <h1 className="font-display text-hmi-header font-black uppercase tracking-tight text-ca-ink">
            {title}
          </h1>
          <p className="text-hmi-body text-ca-ink-muted">{body}</p>
          {action}
        </div>
      </div>
    </HmiShell>
  );
}

export function HomePending() {
  return (
    <HomeFallback
      tone={HomeBoundariesToneType.Muted}
      title="Loading home..."
      body="Fetching workflow status."
    />
  );
}

export function HomeError({ error, reset }: { error: Error; reset: () => void }) {
  const message = error?.message || "Unknown error";
  // Record for /diagnostics inspection. Safe to call during render: the log
  // is idempotent by latest-wins and does not trigger state updates here.
  try {
    recordHomeError(error instanceof AppError ? error : toAppError(error, ErrorCodeType.HomeLoad));
  } catch {
    /* ignore logging failure */
  }

  return (
    <HomeFallback
      tone={HomeBoundariesToneType.Error}
      title="Home data unavailable"
      body={`Something went wrong loading the home data: ${message}. The rest of the app is still usable via the top menu.`}
      action={<RetryButton reset={reset} />}
    />
  );
}

// Exponential backoff retry: 2s, 4s, 8s, ... capped at 60s.
// Shows a live countdown while auto-retry is armed; user can force a retry
// immediately or cancel the scheduled attempt.
function RetryButton({ reset }: { reset: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [remaining, setRemaining] = useState(0); // seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const scheduleNext = (nextAttempt: number) => {
    const delay = Math.min(60, Math.pow(2, nextAttempt)); // 2,4,8,16,32,60...
    setRemaining(delay);
    clearTimer();
    timerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearTimer();
          reset();

          return 0;
        }

        return s - 1;
      });
    }, 1000);
  };

  const onRetry = () => {
    const next = attempt + 1;
    setAttempt(next);
    reset();
    scheduleNext(next);
  };

  const onCancel = () => {
    clearTimer();
    setRemaining(0);
  };

  return (
    <div className="flex flex-wrap items-center gap-hmi-2">
      <button
        type="button"
        onClick={onRetry}
        className="self-start border border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-focus"
      >
        {attempt === 0
          ? "Try again"
          : remaining > 0
            ? `Retry now (auto in ${remaining}s)`
            : `Retry again`}
      </button>
      {remaining > 0 ? (
        <button
          type="button"
          onClick={onCancel}
          className="self-start border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ink-muted hover:border-ca-focus"
          aria-label="Cancel scheduled retry"
        >
          Cancel
        </button>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {remaining > 0 ? `Next automatic retry in ${remaining} seconds` : ""}
      </span>
    </div>
  );
}

interface HomeBoundaryState {
  error: Error | null;
}

export class HomeErrorBoundary extends Component<{ children: ReactNode }, HomeBoundaryState> {
  state: HomeBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[home] render error", error);
    try {
      recordHomeError(
        error instanceof AppError ? error : toAppError(error, ErrorCodeType.HomeLoad),
      );
    } catch {
      /* ignore logging failure */
    }
  }

  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) return <HomeError error={this.state.error} reset={this.reset} />;

    return this.props.children;
  }
}
