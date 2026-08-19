import { BarcodeSymbologyType, BarcodeMatchModeType } from "@/lib/editor/primitives/barcode";
import { describe, it, expect } from "vitest";
import {
  BARCODE_DEFAULTS,
  evaluateBarcode,
  validateBarcodeParams,
  type BarcodeDecoder,
  type BarcodeParams,
} from "../barcode";

function stubDecoder(
  result: { text: string; symbology: BarcodeParams["symbology"] } | null,
): BarcodeDecoder {
  
  return {
    async decode() {
      return result;
    },
  };
}

function throwingDecoder(msg: string): BarcodeDecoder {
  
  return {
    async decode() {
      throw new Error(msg);
    },
  };
}

const roi = { pixels: new Uint8Array(4 * 4), width: 4, height: 4 };

describe("validateBarcodeParams", () => {
  it("accepts defaults", () => {
    expect(validateBarcodeParams(BARCODE_DEFAULTS)).toEqual([]);
  });

  it("rejects unknown symbology", () => {
    const errs = validateBarcodeParams({
      ...BARCODE_DEFAULTS,
      symbology: "unknown-symbology" as BarcodeParams["symbology"],
    });
    expect(errs.map((e) => e.code)).toContain("barcode.symbology.unknown");
  });

  it("rejects unknown matchMode", () => {
    const errs = validateBarcodeParams({
      ...BARCODE_DEFAULTS,
      matchMode: "invalid-mode" as BarcodeParams["matchMode"],
    });
    expect(errs.map((e) => e.code)).toContain("barcode.matchMode.unknown");
  });

  it("rejects invalid regex when matchMode is regex", () => {
    const errs = validateBarcodeParams({
      ...BARCODE_DEFAULTS,
      matchMode: BarcodeMatchModeType.Regex,
      expected: "(",
    });
    expect(errs.map((e) => e.code)).toContain("barcode.regex.invalid");
  });

  it("accepts empty expected regex without validation", () => {
    const errs = validateBarcodeParams({
      ...BARCODE_DEFAULTS,
      matchMode: BarcodeMatchModeType.Regex,
      expected: "",
    });
    expect(errs).toEqual([]);
  });
});

describe("evaluateBarcode", () => {
  it("passes when a code is decoded and no expected text is set", async () => {
    const r = await evaluateBarcode(
      roi,
      BARCODE_DEFAULTS,
      stubDecoder({ text: "hello", symbology: BarcodeSymbologyType.Qr }),
    );
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("ok");
    expect(r.decoded?.text).toBe("hello");
  });

  it("fails no-code when decoder returns null", async () => {
    const r = await evaluateBarcode(roi, BARCODE_DEFAULTS, stubDecoder(null));
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("no-code");
  });

  it("fails symbology-mismatch when filter narrower than result", async () => {
    const r = await evaluateBarcode(
      roi,
      { ...BARCODE_DEFAULTS, symbology: BarcodeSymbologyType.Code128 },
      stubDecoder({ text: "abc", symbology: BarcodeSymbologyType.Qr }),
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("symbology-mismatch");
  });

  it("expected exact match passes only on exact string", async () => {
    const p: BarcodeParams = { ...BARCODE_DEFAULTS, expected: "SN-42" };
    expect(
      (
        await evaluateBarcode(
          roi,
          p,
          stubDecoder({ text: "SN-42", symbology: BarcodeSymbologyType.Qr }),
        )
      ).pass,
    ).toBe(true);
    expect(
      (
        await evaluateBarcode(
          roi,
          p,
          stubDecoder({ text: "SN-43", symbology: BarcodeSymbologyType.Qr }),
        )
      ).pass,
    ).toBe(false);
  });

  it("prefix / contains / regex modes match as documented", async () => {
    const pre = await evaluateBarcode(
      roi,
      { ...BARCODE_DEFAULTS, matchMode: BarcodeMatchModeType.Prefix, expected: "SN-" },
      stubDecoder({ text: "SN-42", symbology: BarcodeSymbologyType.Qr }),
    );
    expect(pre.pass).toBe(true);

    const con = await evaluateBarcode(
      roi,
      { ...BARCODE_DEFAULTS, matchMode: BarcodeMatchModeType.Contains, expected: "42" },
      stubDecoder({ text: "SN-42-END", symbology: BarcodeSymbologyType.Qr }),
    );
    expect(con.pass).toBe(true);

    const rex = await evaluateBarcode(
      roi,
      { ...BARCODE_DEFAULTS, matchMode: BarcodeMatchModeType.Regex, expected: "^SN-\\d+$" },
      stubDecoder({ text: "SN-42", symbology: BarcodeSymbologyType.Qr }),
    );
    expect(rex.pass).toBe(true);
  });

  it("trim option strips padding before matching", async () => {
    const p: BarcodeParams = { ...BARCODE_DEFAULTS, expected: "OK", trim: true };
    const r = await evaluateBarcode(
      roi,
      p,
      stubDecoder({ text: "  OK  ", symbology: BarcodeSymbologyType.Qr }),
    );
    expect(r.pass).toBe(true);
  });

  it("surfaces decoder errors as decoder-error with message, not silent pass", async () => {
    const r = await evaluateBarcode(roi, BARCODE_DEFAULTS, throwingDecoder("wasm not ready"));
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("decoder-error");
    expect(r.error).toBe("wasm not ready");
    expect(r.decoded).toBeNull();
  });
});
