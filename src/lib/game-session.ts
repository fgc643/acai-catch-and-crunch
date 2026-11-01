import { GAME_SECONDS, MAX_PLAUSIBLE_SCORE, isValidPhone, normalizePhone } from "./game-rules";

export function validatePlayInput(d: { name: string; phone: string; consent: boolean; score: number; token: string }) {
  const name = String(d.name ?? "").trim().slice(0, 80);
  if (!name) throw new Error("Nome obrigatório");
  if (!isValidPhone(d.phone)) throw new Error("WhatsApp inválido");
  if (d.consent !== true) throw new Error("Consentimento obrigatório");
  if (typeof d.token !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.token)) {
    throw new Error("Token de partida inválido");
  }
  if (!Number.isInteger(d.score) || d.score < 0 || d.score > MAX_PLAUSIBLE_SCORE) throw new Error("Pontuação inválida");
  return { name, phone: normalizePhone(d.phone), score: d.score, token: d.token };
}

export function assertRoundReady(
  session: { phone: string; started_at: string; played_on: string; consumed_at: string | null } | null,
  phone: string,
  day: string,
  nowMs: number,
) {
  if (!session || session.phone !== phone || session.played_on !== day || session.consumed_at !== null) {
    throw new Error("Partida inválida ou já utilizada");
  }
  const startedMs = Date.parse(session.started_at);
  if (!Number.isFinite(startedMs) || nowMs - startedMs < GAME_SECONDS * 1000) {
    throw new Error("A partida ainda não terminou");
  }
}