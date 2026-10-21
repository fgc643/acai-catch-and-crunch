import { useEffect, useRef, useState } from "react";
import { BAD_POINTS, GAME_SECONDS, GOOD_POINTS } from "@/lib/game-rules";

const GOOD = [
  { e: "🍓", n: "morango" },
  { e: "🍌", n: "banana" },
  { e: "🥣", n: "granola" },
  { e: "🍯", n: "leite condensado" },
  { e: "🥛", n: "leite em pó" },
];
const BAD = [
  { e: "🍅", n: "tomate" },
  { e: "🧅", n: "cebola" },
];

type Item = { id: number; e: string; good: boolean; x: number; dur: number };
type Pop = { id: number; x: number; y: number; v: number };

// Tuned so roughly 1 in 4 players reach 150: spawn speeds up and items fall faster over time.
const START_INTERVAL = 780;
const END_INTERVAL = 360;
const START_FALL = 2700;
const END_FALL = 1350;
const BAD_CHANCE = 0.36;

export function FallingGame({ onEnd }: { onEnd: (score: number) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(GAME_SECONDS);
  const scoreRef = useRef(0);
  const idRef = useRef(0);
  const ended = useRef(false);

  useEffect(() => {
    const start = performance.now();
    let spawnTimer: ReturnType<typeof setTimeout>;
    const spawn = () => {
      const t = Math.min(1, (performance.now() - start) / (GAME_SECONDS * 1000));
      const good = Math.random() > BAD_CHANCE;
      const pool = good ? GOOD : BAD;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const dur = START_FALL - (START_FALL - END_FALL) * t;
      setItems((s) => [...s, { id: ++idRef.current, e: pick.e, good, x: 8 + Math.random() * 84, dur }]);
      spawnTimer = setTimeout(spawn, START_INTERVAL - (START_INTERVAL - END_INTERVAL) * t);
    };
    spawnTimer = setTimeout(spawn, 300);
    const tick = setInterval(() => {
      const remaining = Math.max(0, GAME_SECONDS - Math.floor((performance.now() - start) / 1000));
      setLeft(remaining);
      if (remaining <= 0 && !ended.current) {
        ended.current = true;
        clearTimeout(spawnTimer);
        clearInterval(tick);
        setTimeout(() => onEnd(scoreRef.current), 400);
      }
    }, 200);
    return () => {
      clearTimeout(spawnTimer);
      clearInterval(tick);
    };
  }, [onEnd]);

  const hit = (it: Item, ev: React.PointerEvent) => {
    if (ended.current) return;
    const v = it.good ? GOOD_POINTS : BAD_POINTS;
    scoreRef.current = Math.max(0, scoreRef.current + v);
    setScore(scoreRef.current);
    setItems((s) => s.filter((i) => i.id !== it.id));
    const rect = (ev.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const pop = { id: it.id, x: ev.clientX - rect.left, y: ev.clientY - rect.top, v };
    setPops((p) => [...p, pop]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 600);
    if (navigator.vibrate && !it.good) navigator.vibrate(60);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-brand-gradient text-brand-foreground select-none touch-none">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 font-display">
        <div className="rounded-2xl bg-brand-foreground/15 px-4 py-2">
          <div className="text-xs uppercase opacity-80">Pontos</div>
          <div className="text-3xl font-bold leading-none">{score}</div>
        </div>
        <div className={`rounded-2xl px-4 py-2 text-right ${left <= 5 ? "bg-destructive" : "bg-brand-foreground/15"}`}>
          <div className="text-xs uppercase opacity-80">Tempo</div>
          <div className="text-3xl font-bold leading-none tabular-nums">{left}s</div>
        </div>
      </div>
      <div className="h-2 mx-5 rounded-full bg-brand-foreground/20 overflow-hidden">
        <div className="h-full bg-brand-2 transition-[width] duration-200" style={{ width: `${(left / GAME_SECONDS) * 100}%` }} />
      </div>
      <div className="relative flex-1 overflow-hidden">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            aria-label={it.good ? "ingrediente bom" : "ingrediente ruim"}
            onPointerDown={(e) => hit(it, e)}
            onAnimationEnd={() => setItems((s) => s.filter((i) => i.id !== it.id))}
            className="absolute top-0 -translate-x-1/2 text-5xl leading-none p-2 drop-shadow-lg"
            style={{ left: `${it.x}%`, animation: `fall ${it.dur}ms linear forwards` }}
          >
            {it.e}
          </button>
        ))}
        {pops.map((p) => (
          <span
            key={p.id}
            className={`pointer-events-none absolute font-display text-2xl font-bold animate-float-up ${p.v > 0 ? "text-brand-2" : "text-destructive"}`}
            style={{ left: p.x, top: p.y }}
          >
            {p.v > 0 ? `+${p.v}` : p.v}
          </span>
        ))}
      </div>
      <style>{`@keyframes fall { from { transform: translate(-50%, -80px) } to { transform: translate(-50%, calc(100vh)) } }`}</style>
    </div>
  );
}
