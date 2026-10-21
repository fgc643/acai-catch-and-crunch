import { describe, expect, it } from "vitest";
import { addDays, effectiveStatus, generateCouponCode, wins } from "@/lib/game-rules";

describe("game rules", () => {
  it("coupon code is 8 letters/digits", () => {
    expect(generateCouponCode()).toMatch(/^[A-Z0-9]{8}$/);
  });
  it("150 points wins, 149 does not", () => {
    expect(wins(150, 150)).toBe(true);
    expect(wins(149, 150)).toBe(false);
  });
  it("expired coupon is not active", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    expect(effectiveStatus({ status: "ativo", expires_at: "2026-01-09T00:00:00Z" }, now)).toBe("expirado");
    expect(effectiveStatus({ status: "ativo", expires_at: "2026-01-11T00:00:00Z" }, now)).toBe("ativo");
  });
  it("used coupon stays used", () => {
    expect(effectiveStatus({ status: "usado", expires_at: "2099-01-01T00:00:00Z" })).toBe("usado");
  });
  it("coupon valid 7 days", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    expect(addDays(d, 7).toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });
});
