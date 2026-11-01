import { describe, expect, it } from "vitest";
import { assertRoundReady, validatePlayInput } from "@/lib/game-session";
import { MAX_PLAUSIBLE_SCORE, maximumSpawnCount } from "@/lib/game-rules";

const input = { name: "Teste", phone: "11987654321", consent: true, score: 150, token: "7b5692a6-dfae-47d6-9f9e-01ed91a612fd" };
const start = Date.parse("2026-11-01T12:00:00Z");
const session = { phone: input.phone, played_on: "2026-11-01", started_at: new Date(start).toISOString(), consumed_at: null };

describe("server round validation", () => {
  it("requires a valid token", () => {
    for (const token of [undefined, "", "forged"]) {
      expect(() => validatePlayInput({ ...input, token: token as string })).toThrow("Token");
    }
  });
  it("rejects submission at 44.999 seconds", () => {
    expect(() => assertRoundReady(session, input.phone, session.played_on, start + 44999)).toThrow("ainda não terminou");
  });
  it("accepts submission at the full 45 seconds", () => {
    expect(() => assertRoundReady(session, input.phone, session.played_on, start + 45000)).not.toThrow();
  });
  it("rejects nonexistent tokens", () => {
    expect(() => assertRoundReady(null, input.phone, session.played_on, start + 45000)).toThrow("inválida");
  });
  it("rejects tokens belonging to another phone", () => {
    expect(() => assertRoundReady(session, "11912345678", session.played_on, start + 45000)).toThrow("inválida");
  });
  it("rejects replay of consumed tokens", () => {
    expect(() => assertRoundReady({ ...session, consumed_at: new Date(start + 45000).toISOString() }, input.phone, session.played_on, start + 46000)).toThrow("já utilizada");
  });
  it("rejects a token from another São Paulo day", () => {
    expect(() => assertRoundReady(session, input.phone, "2026-11-02", start + 86400000)).toThrow("inválida");
  });
  it("rejects invalid or future start times", () => {
    for (const started_at of ["invalid", new Date(start + 1000).toISOString()]) {
      expect(() => assertRoundReady({ ...session, started_at }, input.phone, session.played_on, start)).toThrow("ainda não terminou");
    }
  });
  it("caps scores at the actual 63 items times 10 points", () => {
    expect(maximumSpawnCount()).toBe(63);
    expect(MAX_PLAUSIBLE_SCORE).toBe(630);
    expect(validatePlayInput({ ...input, score: 630 }).score).toBe(630);
    expect(() => validatePlayInput({ ...input, score: 631 })).toThrow("Pontuação");
  });
  it("rejects negative, fractional, non-numeric and non-finite scores", () => {
    for (const score of [-1, 150.5, NaN, Infinity, "150"]) {
      expect(() => validatePlayInput({ ...input, score: score as number })).toThrow("Pontuação");
    }
  });
});