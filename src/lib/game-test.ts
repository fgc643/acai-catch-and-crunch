import { addDays, wins } from "./game-rules";

export type GameResult =
  | { status: "won"; score: number; code: string; expiresAt: string; discount: number }
  | { status: "lost"; score: number }
  | { status: "already_played" };

type RewardSettings = { min_score: number; coupon_days: number; discount_percent: number };

export function isDebugMode(value: unknown): boolean {
  return value === 1 || value === "1";
}

/** URL testing never consumes a play or issues a redeemable coupon. */
export async function resolveRound(
  debug: boolean,
  score: number,
  settings: RewardSettings,
  submit: () => Promise<GameResult>,
): Promise<GameResult> {
  if (!debug) return submit();
  if (!wins(score, settings.min_score)) return { status: "lost", score };
  return {
    status: "won",
    score,
    code: "TESTE",
    expiresAt: addDays(new Date(), settings.coupon_days).toISOString(),
    discount: settings.discount_percent,
  };
}