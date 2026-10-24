import { describe, expect, it, vi } from "vitest";
import { isDebugMode, resolveRound } from "@/lib/game-test";

const settings = { min_score: 150, coupon_days: 7, discount_percent: 10 };

describe("safe test mode", () => {
  it("enables only for debug=1", () => {
    expect(isDebugMode("1")).toBe(true);
    expect(isDebugMode(1)).toBe(true);
    for (const value of [undefined, 0, "0", "true", true, 2]) expect(isDebugMode(value)).toBe(false);
  });
  it("simulates a 150-point victory without saving a play or real coupon", async () => {
    const submit = vi.fn();
    const result = await resolveRound(true, 150, settings, submit);
    expect(result).toMatchObject({ status: "won", score: 150, code: "TESTE", discount: 10 });
    expect(submit).not.toHaveBeenCalled();
    await resolveRound(true, 150, settings, submit);
    expect(submit).not.toHaveBeenCalled();
  });
  it("uses business reward settings for simulated coupons", async () => {
    const result = await resolveRound(true, 200, { min_score: 200, coupon_days: 3, discount_percent: 25 }, vi.fn());
    expect(result).toMatchObject({ status: "won", discount: 25 });
    expect(await resolveRound(true, 150, { ...settings, min_score: 200 }, vi.fn())).toEqual({ status: "lost", score: 150 });
  });
  it("keeps the real submission path for ordinary URLs", async () => {
    const submit = vi.fn().mockResolvedValue({ status: "already_played" });
    expect(await resolveRound(false, 150, settings, submit)).toEqual({ status: "already_played" });
    expect(submit).toHaveBeenCalledOnce();
  });
});