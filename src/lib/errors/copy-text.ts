// Shared clipboard write for error surfaces.
// The async Clipboard API rejects inside embedded browsers and after a
// toast unmounts, and a floating promise becomes another global error.
// A synchronous selection copy runs inside the click, then the async
// API is the second attempt. The result always carries the failure text.

export interface CopyTextResult {
  isCopied: boolean;
  failureMessage: string;
}

function failureMessageOf(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) {
    return err.message;
  }

  if (typeof err === "string" && err.length > 0) {
    return err;
  }

  return "Clipboard write failed";
}

function copyWithSelection(text: string): CopyTextResult {
  if (typeof document === "undefined") {
    return {
      isCopied: false,
      failureMessage: "Clipboard is unavailable in this environment",
    };
  }

  window.focus();

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "0";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.focus();
  field.select();

  let isCopied = false;
  let failureMessage = "";

  try {
    isCopied = document.execCommand("copy");

    if (!isCopied) {
      failureMessage = "The browser refused the copy command";
    }
  } catch (err) {
    failureMessage = failureMessageOf(err);
  } finally {
    document.body.removeChild(field);
  }

  return { isCopied, failureMessage };
}

async function copyWithClipboardApi(text: string): Promise<CopyTextResult> {
  if (typeof navigator === "undefined" || navigator.clipboard?.writeText === undefined) {
    return { isCopied: false, failureMessage: "Clipboard API is unavailable" };
  }

  try {
    await navigator.clipboard.writeText(text);

    return { isCopied: true, failureMessage: "" };
  } catch (err) {
    return { isCopied: false, failureMessage: failureMessageOf(err) };
  }
}

export async function copyText(text: string): Promise<CopyTextResult> {
  const selected = copyWithSelection(text);

  if (selected.isCopied) {
    return selected;
  }

  const apiResult = await copyWithClipboardApi(text);

  if (apiResult.isCopied) {
    return apiResult;
  }

  const parts = [selected.failureMessage, apiResult.failureMessage].filter(
    (part) => part.length > 0,
  );

  return {
    isCopied: false,
    failureMessage: parts.length > 0 ? parts.join("; ") : "Copy failed",
  };
}
