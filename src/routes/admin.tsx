import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { effectiveStatus, type CouponStatus } from "@/lib/game-rules";
import { DEFAULT_SETTINGS, settingsQuery, type Settings } from "@/lib/settings";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel do lojista — cupons e jogadores" },
      { name: "description", content: "Valide cupons, veja jogadores e configure o jogo." },
      { property: "og:title", content: "Painel do lojista" },
      { property: "og:description", content: "Valide cupons, veja jogadores e configure o jogo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setIsAdmin(null);
    supabase
      .rpc("has_role", { _user_id: session.user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (session === undefined) return <Shell><p>Carregando...</p></Shell>;
  if (!session) return <Shell><Login /></Shell>;
  if (isAdmin === null) return <Shell><p>Carregando...</p></Shell>;
  if (!isAdmin)
    return (
      <Shell>
        <p className="mb-4">Esta conta não tem acesso de administrador.</p>
        <Button onClick={() => supabase.auth.signOut()}>Sair</Button>
      </Shell>
    );
  return <Dashboard email={session.user.email ?? ""} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-muted px-4 py-10">
      <div className="mx-auto max-w-sm rounded-3xl bg-card p-6 shadow-lg">{children}</div>
    </main>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) toast.error("E-mail ou senha incorretos");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Confira seu e-mail para confirmar a conta.");
    }
    setBusy(false);
  };
  return (
    <form onSubmit={go} className="flex flex-col gap-3">
      <h1 className="font-display text-2xl font-bold">Painel do lojista</h1>
      <Input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
      <Input type="password" required minLength={6} placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)} className="h-12" />
      <Button type="submit" size="lg" disabled={busy}>{mode === "in" ? "Entrar" : "Criar conta"}</Button>
      <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
      </button>
      <p className="text-xs text-muted-foreground">A primeira conta criada vira a administradora.</p>
    </form>
  );
}

type Coupon = { id: string; code: string; phone: string; created_at: string; expires_at: string; status: string; used_at: string | null; discount_percent: number };
type Player = { id: string; name: string; phone: string; score: number; created_at: string };

const STATUS_LABEL: Record<CouponStatus, string> = { ativo: "Válido", usado: "Já usado", expirado: "Vencido" };
const STATUS_CLASS: Record<CouponStatus, string> = {
  ativo: "bg-primary/10 text-primary",
  usado: "bg-muted text-muted-foreground",
  expirado: "bg-destructive/10 text-destructive",
};

function Dashboard({ email }: { email: string }) {
  const qc = useQueryClient();
  const coupons = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false }).limit(1000)).data as Coupon[] ?? [],
  });
  const players = useQuery({
    queryKey: ["players"],
    queryFn: async () => (await supabase.from("players").select("*").order("created_at", { ascending: false }).limit(1000)).data as Player[] ?? [],
  });
  const playCount = useQuery({
    queryKey: ["playCount"],
    queryFn: async () => (await supabase.from("players").select("id", { count: "exact", head: true })).count ?? 0,
  });
  const all = coupons.data ?? [];
  const used = all.filter((c) => c.status === "usado").length;

  const signOut = async () => {
    qc.clear();
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-dvh bg-muted px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Painel</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>Sair</Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Jogadas" value={playCount.data ?? 0} />
          <Stat label="Cupons gerados" value={all.length} />
          <Stat label="Cupons usados" value={used} />
        </div>
        <Tabs defaultValue="validar">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="validar">Validar</TabsTrigger>
            <TabsTrigger value="cupons">Cupons</TabsTrigger>
            <TabsTrigger value="jogadores">Jogadores</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>
          <TabsContent value="validar"><Validate onChange={() => qc.invalidateQueries({ queryKey: ["coupons"] })} /></TabsContent>
          <TabsContent value="cupons"><CouponList coupons={all} /></TabsContent>
          <TabsContent value="jogadores"><PlayerList players={players.data ?? []} /></TabsContent>
          <TabsContent value="config"><Config /></TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 rounded-2xl bg-card p-5 shadow-sm">{children}</div>;
}

function Validate({ onChange }: { onChange: () => void }) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Coupon | null | "none">(null);
  const [busy, setBusy] = useState(false);
  const lookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    const { data } = await supabase.from("coupons").select("*").eq("code", c).maybeSingle();
    setFound((data as Coupon) ?? "none");
  };
  const markUsed = async () => {
    if (!found || found === "none") return;
    setBusy(true);
    const { data, error } = await supabase
      .from("coupons")
      .update({ status: "usado", used_at: new Date().toISOString() })
      .eq("id", found.id)
      .eq("status", "ativo")
      .gt("expires_at", new Date().toISOString())
      .select()
      .maybeSingle();
    setBusy(false);
    if (error || !data) toast.error("Não foi possível usar este cupom");
    else {
      toast.success("Cupom marcado como usado");
      setFound(data as Coupon);
      onChange();
    }
  };
  const st = found && found !== "none" ? effectiveStatus(found) : null;
  return (
    <Card>
      <form onSubmit={lookup} className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="CÓDIGO" className="h-14 font-mono text-2xl tracking-widest uppercase" />
        <Button type="submit" className="h-14 px-6">Verificar</Button>
      </form>
      {found === "none" && <p className="mt-4 rounded-xl bg-destructive/10 p-4 font-semibold text-destructive">Cupom não encontrado</p>}
      {found && found !== "none" && st && (
        <div className="mt-4 space-y-3">
          <div className={`rounded-xl p-4 text-xl font-bold ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Desconto: {found.discount_percent}%</p>
            <p>WhatsApp: {found.phone}</p>
            <p>Validade: {new Date(found.expires_at).toLocaleDateString("pt-BR")}</p>
            {found.used_at && <p>Usado em: {new Date(found.used_at).toLocaleString("pt-BR")}</p>}
          </div>
          {st === "ativo" && <Button size="lg" className="w-full h-14 text-lg" disabled={busy} onClick={markUsed}>Marcar como usado</Button>}
        </div>
      )}
    </Card>
  );
}

function CouponList({ coupons }: { coupons: Coupon[] }) {
  const [filter, setFilter] = useState<"todos" | CouponStatus>("todos");
  const rows = coupons.filter((c) => filter === "todos" || effectiveStatus(c) === filter);
  return (
    <Card>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["todos", "ativo", "usado", "expirado"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "todos" ? "Todos" : STATUS_LABEL[f]}
          </Button>
        ))}
      </div>
      <div className="divide-y">
        {rows.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhum cupom.</p>}
        {rows.map((c) => {
          const st = effectiveStatus(c);
          return (
            <div key={c.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-mono font-bold">{c.code}</div>
                <div className="text-muted-foreground">{c.phone} · até {new Date(c.expires_at).toLocaleDateString("pt-BR")}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[st]}`}>{STATUS_LABEL[st]}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PlayerList({ players }: { players: Player[] }) {
  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Nome", "WhatsApp", "Pontuação", "Data"].join(","), ...players.map((p) => [esc(p.name), esc(p.phone), p.score, esc(new Date(p.created_at).toLocaleString("pt-BR"))].join(","))];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `jogadores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  return (
    <Card>
      <div className="mb-3 flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{players.length} jogadores</span>
        <Button size="sm" onClick={exportCsv} disabled={!players.length}>Exportar CSV</Button>
      </div>
      <div className="divide-y">
        {players.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-muted-foreground">{p.phone} · {new Date(p.created_at).toLocaleString("pt-BR")}</div>
            </div>
            <span className="font-display text-lg font-bold">{p.score}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

async function resizeImage(file: File, max = 512): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

function Config() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [f, setF] = useState<Settings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF(data); }, [data]);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("settings").update({
      business_name: f.business_name, game_title: f.game_title, primary_color: f.primary_color,
      secondary_color: f.secondary_color, logo_url: f.logo_url, discount_percent: f.discount_percent,
      min_score: f.min_score, coupon_days: f.coupon_days, updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setBusy(false);
    if (error) toast.error("Erro ao salvar");
    else { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["settings"] }); }
  };
  const field = "flex flex-col gap-1 text-sm font-semibold";
  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>Nome do negócio<Input value={f.business_name} onChange={(e) => set("business_name", e.target.value)} /></label>
        <label className={field}>Título do jogo<Input value={f.game_title} onChange={(e) => set("game_title", e.target.value)} /></label>
        <label className={field}>Cor principal<Input type="color" value={f.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-12" /></label>
        <label className={field}>Cor de destaque<Input type="color" value={f.secondary_color} onChange={(e) => set("secondary_color", e.target.value)} className="h-12" /></label>
        <label className={field}>Desconto (%)<Input type="number" min={1} max={100} value={f.discount_percent} onChange={(e) => set("discount_percent", Number(e.target.value))} /></label>
        <label className={field}>Pontuação mínima<Input type="number" min={10} step={10} value={f.min_score} onChange={(e) => set("min_score", Number(e.target.value))} /></label>
        <label className={field}>Validade do cupom (dias)<Input type="number" min={1} value={f.coupon_days} onChange={(e) => set("coupon_days", Number(e.target.value))} /></label>
        <label className={field}>Logo ou fachada
          <Input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) set("logo_url", await resizeImage(file)); }} />
        </label>
      </div>
      {f.logo_url && (
        <div className="mt-4 flex items-center gap-3">
          <img src={f.logo_url} alt="Logo" className="h-20 w-20 rounded-2xl object-cover" />
          <Button variant="outline" size="sm" onClick={() => set("logo_url", null)}>Remover</Button>
        </div>
      )}
      <Button className="mt-5 w-full h-12" disabled={busy} onClick={save}>Salvar</Button>
    </Card>
  );
}
