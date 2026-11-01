export const GAME_SECONDS = 45;
export const GOOD_POINTS = 10;
export const BAD_POINTS = -15;
export const FIRST_SPAWN_MS = 300;
export const START_SPAWN_INTERVAL_MS = 950;
export const END_SPAWN_INTERVAL_MS = 520;

export function spawnIntervalMs(elapsedMs: number): number {
  const progress = Math.min(1, Math.max(0, elapsedMs / (GAME_SECONDS * 1000)));
  return Math.floor(START_SPAWN_INTERVAL_MS - (START_SPAWN_INTERVAL_MS - END_SPAWN_INTERVAL_MS) * progress);
}

/** Fastest possible schedule, with every item good and hit exactly once. */
export function maximumSpawnCount(): number {
  let elapsed = FIRST_SPAWN_MS;
  let count = 0;
  while (elapsed < GAME_SECONDS * 1000) {
    count++;
    elapsed += spawnIntervalMs(elapsed);
  }
  return count;
}

export const MAX_PLAUSIBLE_SCORE = maximumSpawnCount() * GOOD_POINTS;

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCouponCode(rand: (n: number) => number = secureRandomInt): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET.charAt(rand(CODE_ALPHABET.length));
  return out;
}

function secureRandomInt(n: number): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return (a[0] ?? 0) % n;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidPhone(raw: string): boolean {
  const d = normalizePhone(raw);
  return d.length >= 10 && d.length <= 13;
}

export type CouponStatus = "ativo" | "usado" | "expirado";

export function effectiveStatus(
  c: { status: string; expires_at: string },
  now: Date = new Date(),
): CouponStatus {
  if (c.status === "usado") return "usado";
  if (c.status === "expirado" || new Date(c.expires_at).getTime() <= now.getTime()) return "expirado";
  return "ativo";
}

export function wins(score: number, minScore: number): boolean {
  return score >= minScore;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}
