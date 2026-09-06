import { describe, expect, it } from "vitest";

import { DEFAULT_BUSINESS_SETTINGS } from "./constants";
import {
  applyVat,
  marginThresholds,
  marginsAreOrdered,
  paymentTermsAddUp,
  splitByPaymentTerms,
  sumPaymentTerms,
} from "./services";

describe("payment terms", () => {
  it("sums milestones", () => {
    expect(sumPaymentTerms([50, 30, 20])).toBe(100);
  });

  it("accepts the default 50/30/20 split", () => {
    expect(paymentTermsAddUp(DEFAULT_BUSINESS_SETTINGS.paymentTerms)).toBe(true);
  });

  it("rejects splits that do not add up to 100", () => {
    expect(paymentTermsAddUp([50, 30])).toBe(false);
    expect(paymentTermsAddUp([60, 30, 20])).toBe(false);
    expect(paymentTermsAddUp([])).toBe(false);
  });

  it("tolerates floating point noise to 2 decimals", () => {
    expect(paymentTermsAddUp([33.33, 33.33, 33.34])).toBe(true);
    expect(paymentTermsAddUp([0.1 * 3 * 100, 70])).toBe(true); // 30.000000000000004 + 70
  });

  it("splits an amount by milestones", () => {
    expect(splitByPaymentTerms(100000, [50, 30, 20])).toEqual([50000, 30000, 20000]);
  });
});

describe("margins", () => {
  it("requires minimum <= warning <= target", () => {
    expect(marginsAreOrdered({ minimum: 40, warning: 50, target: 60 })).toBe(true);
    expect(marginsAreOrdered({ minimum: 50, warning: 50, target: 50 })).toBe(true);
    expect(marginsAreOrdered({ minimum: 55, warning: 50, target: 60 })).toBe(false);
    expect(marginsAreOrdered({ minimum: 40, warning: 65, target: 60 })).toBe(false);
  });

  it("extracts thresholds from settings", () => {
    expect(marginThresholds(DEFAULT_BUSINESS_SETTINGS)).toEqual({ target: 60, warning: 50, minimum: 40 });
  });
});

describe("VAT", () => {
  it("adds VAT to a net amount", () => {
    expect(applyVat(1000, 21)).toBeCloseTo(1210);
    expect(applyVat(1000, 0)).toBe(1000);
  });
});
