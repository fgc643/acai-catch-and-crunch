import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FallingGame } from "@/components/FallingGame";
import { DEFAULT_SETTINGS, brandStyle, settingsQuery } from "@/lib/settings";
import { checkEligibility, submitPlay } from "@/lib/game.functions";
import { isValidPhone } from "@/lib/game-rules";
import { isDebugMode, resolveRound, type GameResult } from "@/lib/game-test";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({ debug: isDebugMode(search.debug) ? 1 : 0 }),
  head: () => ({
    meta: [
      { title: "Monte o seu Açaí — jogue e ganhe desconto" },
      { name: "description", content: "Jogue 45 segundos, faça pontos e ganhe um cupom de desconto." },
      { property: "og:title", content: "Monte o seu Açaí — jogue e ganhe desconto" },
      { property: "og:description", content: "Jogue 45 segundos, faça pontos e ganhe um cupom de desconto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Step = "home" | "form" | "blocked" | "play" | "saving" | "result";
type Result = GameResult;

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function Index() {
  const { debug: debugParam } = Route.useSearch();
  const debug = debugParam === 1;
  const { data: s = DEFAULT_SETTINGS } = useQuery(settingsQuery);
  const [step, setStep] = useState<Step>("home");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const check = useServerFn(checkEligibility);
  const submit = useServerFn(submitPlay);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Digite seu nome"); return; }
    if (!isValidPhone(phone)) { toast.error("WhatsApp inválido"); return; }
    if (!consent) { toast.error("Marque a caixa de consentimento"); return; }
    if (debug) { setStep("play"); return; }
    setBusy(true);
    try {
      const r = await check({ data: { phone } });
      setStep(r.canPlay ? "play" : "blocked");
    } catch {
      toast.error("Erro ao verificar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const onEnd = useCallback(
    async (score: number) => {
      setStep("saving");
      try {
        const r = await resolveRound(debug, score, s, () => submit({ data: { name, phone, consent, score } }));
        if (r.status === "already_played") setStep("blocked");
        else {
          setResult(r as Result);
          setStep("result");
        }
      } catch {
        toast.error("Erro ao salvar sua jogada");
        setStep("home");
      }
    },
    [submit, name, phone, consent, debug, s],
  );

  const forceWin = useCallback(() => {
    if (debug) void onEnd(Math.max(150, s.min_score));
  }, [debug, onEnd, s.min_score]);

  return (
    <main style={brandStyle(s)} className="min-h-dvh bg-brand-gradient text-brand-foreground">
      {step === "play" && <FallingGame onEnd={onEnd} onForceWin={debug ? forceWin : undefined} />}
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 py-8 text-center">
        <header className="flex flex-col items-center gap-2">
          {s.logo_url ? (
            <img src={s.logo_url} alt={s.business_name} className="h-28 w-28 rounded-3xl object-cover ring-4 ring-brand-2 shadow-xl" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-brand-foreground/15 text-5xl ring-4 ring-brand-2">🍇</div>
          )}
          <p className="font-display text-lg opacity-90">{s.business_name}</p>
        </header>

        {step === "home" && (
          <section className="flex flex-1 flex-col items-center justify-center gap-6 animate-pop">
            <h1 className="font-display text-5xl font-bold leading-[1.05]">{s.game_title}</h1>
            <p className="text-lg font-semibold">
              Faça <span className="text-brand-2">{s.min_score} pontos</span> ou mais e ganhe{" "}
              <span className="text-brand-2">{s.discount_percent}% de desconto!</span>
            </p>
            <div className="text-4xl tracking-widest">🍓🍌🥣🥛</div>
            <Button variant="game" size="xl" onClick={() => setStep("form")}>
              Jogar
            </Button>
            {debug && <Button variant="glass" onClick={forceWin}>Forçar vitória</Button>}
            <p className="text-sm opacity-80">Toque nos ingredientes bons (+10). Evite 🍅 e 🧅 (−15).</p>
          </section>
        )}

        {step === "form" && (
          <form onSubmit={start} className="mt-8 flex w-full flex-1 flex-col gap-4 text-left animate-pop">
            <h2 className="font-display text-3xl font-bold text-center">Antes de jogar</h2>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Seu nome</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-14 rounded-2xl bg-background text-foreground text-lg" placeholder="Maria" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">WhatsApp</span>
              <Input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="tel" className="h-14 rounded-2xl bg-background text-foreground text-lg" placeholder="(11) 99999-9999" />
            </label>
            <label className="flex items-start gap-3 rounded-2xl bg-brand-foreground/10 p-4">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5 h-6 w-6 border-brand-foreground data-[state=checked]:bg-brand-2 data-[state=checked]:text-brand" />
              <span>Concordo em receber promoções deste estabelecimento</span>
            </label>
            <Button type="submit" variant="game" size="xl" disabled={busy} className="mt-2">
              {busy ? "Verificando..." : "Começar"}
            </Button>
            <Button type="button" variant="glass" onClick={() => setStep("home")}>Voltar</Button>
          </form>
        )}

        {step === "blocked" && (
          <section className="flex flex-1 flex-col items-center justify-center gap-6 animate-pop">
            <div className="text-6xl">⏰</div>
            <h2 className="font-display text-4xl font-bold">Volte amanhã para jogar novamente!</h2>
            <p className="opacity-90">Cada WhatsApp pode jogar uma vez por dia.</p>
            <Button variant="glass" size="lg" onClick={() => setStep("home")}>Início</Button>
          </section>
        )}

        {step === "saving" && (
          <section className="flex flex-1 items-center justify-center font-display text-2xl">Calculando...</section>
        )}

        {step === "result" && result?.status === "won" && (
          <section className="flex flex-1 flex-col items-center justify-center gap-5 animate-pop">
            <div className="text-6xl">🎉</div>
            <h2 className="font-display text-4xl font-bold">Parabéns! Você ganhou {result.discount}% de desconto!</h2>
            <p className="text-lg">Você fez <b>{result.score}</b> pontos</p>
            <div className="w-full rounded-3xl bg-background p-6 text-foreground shadow-pop">
              <p className="text-sm uppercase text-muted-foreground">{debug ? "Cupom de teste — sem validade" : "Seu cupom"}</p>
              <p className="font-mono text-4xl font-bold tracking-[0.2em] text-brand">{result.code}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Válido até {new Date(result.expiresAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            {!debug && <p className="font-display text-xl">Mostre este código no balcão</p>}
            {!debug && <p className="text-sm opacity-80">Tire um print desta tela para não perder.</p>}
            {debug && <Button variant="glass" onClick={() => setStep("home")}>Testar novamente</Button>}
          </section>
        )}

        {step === "result" && result?.status === "lost" && (
          <section className="flex flex-1 flex-col items-center justify-center gap-5 animate-pop">
            <div className="text-6xl">💜</div>
            <h2 className="font-display text-4xl font-bold">Quase lá! Tente de novo amanhã</h2>
            <p className="text-lg">Você fez <b>{result.score}</b> pontos — faltaram {Math.max(0, s.min_score - result.score)}.</p>
            <Button variant="game" size="xl" onClick={() => setStep("form")}>Jogar novamente</Button>
          </section>
        )}
      </div>
    </main>
  );
}
