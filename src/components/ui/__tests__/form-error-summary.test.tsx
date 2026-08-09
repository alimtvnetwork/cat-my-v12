// Verifies the aria-live summary renders visibly with errors and stays
// silent (sr-only) with none. Server-rendered to avoid a DOM environment.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormErrorSummary } from "../form-error-summary";

describe("FormErrorSummary", () => {
  it("renders sr-only when there are no errors", () => {
    const html = renderToStaticMarkup(<FormErrorSummary errors={{}} />);
    expect(html).toContain("sr-only");
    expect(html).not.toContain("Please fix");
  });

  it("aggregates messages under human labels", () => {
    const html = renderToStaticMarkup(
      <FormErrorSummary
        errors={{
          name: { type: "required", message: "Name is required" },
          categoryName: { type: "invalid", message: "Pick a category" },
        }}
        labels={{ name: "Project name", categoryName: "Category" }}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Project name");
    expect(html).toContain("Name is required");
    expect(html).toContain("Category");
    expect(html).toContain("Pick a category");
  });

  it("walks nested error trees", () => {
    const html = renderToStaticMarkup(
      <FormErrorSummary
        errors={{
          categories: {
            "0": { message: "Empty category" },
          } as never,
        }}
      />,
    );
    expect(html).toContain("Empty category");
  });
});
