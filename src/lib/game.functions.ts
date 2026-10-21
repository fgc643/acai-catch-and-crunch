import { createServerFn } from "@tanstack/react-start";
import {
  MAX_PLAUSIBLE_SCORE,
  addDays,
  generateCouponCode,
  isValidPhone,
  normalizePhone,
  wins,
} from "./game-rules";

function todaySaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export const checkEligibility = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string }) => {
    if (!isValidPhone(d.phone)) throw new Error("WhatsApp inválido");
    return { phone: normalizePhone(d.phone) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("phone", data.phone)
      .eq("played_on", todaySaoPaulo());
    return { canPlay: (count ?? 0) === 0 };
  });

export const submitPlay = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; phone: string; consent: boolean; score: number }) => {
    const name = String(d.name ?? "").trim().slice(0, 80);
    if (!name) throw new Error("Nome obrigatório");
    if (!isValidPhone(d.phone)) throw new Error("WhatsApp inválido");
    if (d.consent !== true) throw new Error("Consentimento obrigatório");
    const score = Math.round(Number(d.score));
    if (!Number.isFinite(score) || score > MAX_PLAUSIBLE_SCORE) throw new Error("Pontuação inválida");
    return { name, phone: normalizePhone(d.phone), score: Math.max(0, score) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin.from("settings").select("*").eq("id", 1).single();
    const minScore = settings?.min_score ?? 150;
    const days = settings?.coupon_days ?? 7;
    const discount = settings?.discount_percent ?? 10;

    const { data: player, error } = await supabaseAdmin
      .from("players")
      .insert({ name: data.name, phone: data.phone, score: data.score, consent: true, played_on: todaySaoPaulo() })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { status: "already_played" as const };
      throw new Error("Não foi possível salvar a jogada");
    }

    if (!wins(data.score, minScore)) return { status: "lost" as const, score: data.score };

    const expires = addDays(new Date(), days);
    for (let i = 0; i < 6; i++) {
      const code = generateCouponCode();
      const { error: cErr } = await supabaseAdmin.from("coupons").insert({
        code,
        phone: data.phone,
        player_id: player.id,
        discount_percent: discount,
        expires_at: expires.toISOString(),
      });
      if (!cErr) {
        return { status: "won" as const, score: data.score, code, expiresAt: expires.toISOString(), discount };
      }
      if (cErr.code !== "23505") break;
    }
    throw new Error("Não foi possível gerar o cupom");
  });
