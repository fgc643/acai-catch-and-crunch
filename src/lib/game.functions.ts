import { createServerFn } from "@tanstack/react-start";
import {
  addDays,
  generateCouponCode,
  isValidPhone,
  normalizePhone,
  wins,
} from "./game-rules";
import { assertRoundReady, validatePlayInput } from "./game-session";

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
    const { count, error } = await supabaseAdmin
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("phone", data.phone)
      .eq("played_on", todaySaoPaulo());
    if (error) throw new Error("Não foi possível verificar a jogada");
    return { canPlay: (count ?? 0) === 0 };
  });

export const startPlay = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string }) => {
    if (!isValidPhone(d.phone)) throw new Error("WhatsApp inválido");
    return { phone: normalizePhone(d.phone) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const day = todaySaoPaulo();
    const { count, error } = await supabaseAdmin.from("players")
      .select("id", { count: "exact", head: true }).eq("phone", data.phone).eq("played_on", day);
    if (error) throw new Error("Não foi possível verificar a jogada");
    if ((count ?? 0) > 0) return { canPlay: false as const };
    const token = crypto.randomUUID();
    const { data: session, error: startError } = await supabaseAdmin.from("game_sessions")
      .insert({ token, phone: data.phone, played_on: day }).select("token, started_at").single();
    if (startError || !session) throw new Error("Não foi possível iniciar a partida");
    return { canPlay: true as const, token: session.token, startedAt: session.started_at };
  });

export const submitPlay = createServerFn({ method: "POST" })
  .inputValidator(validatePlayInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const day = todaySaoPaulo();
    const { data: session, error: sessionError } = await supabaseAdmin.from("game_sessions")
      .select("phone, started_at, played_on, consumed_at").eq("token", data.token).maybeSingle();
    if (sessionError) throw new Error("Não foi possível validar a partida");
    const now = new Date();
    assertRoundReady(session, data.phone, day, now.getTime());
    // Compare-and-set ensures concurrent submissions cannot reuse the same token.
    const { data: claimed, error: claimError } = await supabaseAdmin.from("game_sessions")
      .update({ consumed_at: now.toISOString() }).eq("token", data.token)
      .eq("phone", data.phone).is("consumed_at", null).select("token").maybeSingle();
    if (claimError || !claimed) throw new Error("Partida inválida ou já utilizada");
    const { data: settings } = await supabaseAdmin.from("settings").select("*").eq("id", 1).single();
    const minScore = settings?.min_score ?? 150;
    const days = settings?.coupon_days ?? 7;
    const discount = settings?.discount_percent ?? 10;

    const { data: player, error } = await supabaseAdmin
      .from("players")
      .insert({ name: data.name, phone: data.phone, score: data.score, consent: true, played_on: day })
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
