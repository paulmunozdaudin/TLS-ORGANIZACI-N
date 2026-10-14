"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { deck, nearby, swipe, zones, type SwipeProfile, type Zone } from "@/content/landing";
import { SECTORS, SKILLS, countryName, type Sector, type Skill } from "@/content/options";
import { normalizeCity } from "@/lib/waitlist";
import AppTabBar from "./AppTabBar";
import Phone from "./Phone";
import { useWaitlist } from "./WaitlistProvider";

const THRESHOLD = 90;
const skillLabel = (s: Skill) => SKILLS.find((o) => o.value === s)!.label.toLowerCase();

type Leaving = { dir: 1 | -1; profile: SwipeProfile } | null;

/** El móvil de la portada: un mazo que se desliza de verdad, con filtros de zona e intereses. */
export default function SwipeDeck() {
  const { draft } = useWaitlist();
  const city = normalizeCity(draft.city);
  const mySkill = draft.skill;

  const [zone, setZone] = useState<Zone>("mundo");
  const [interests, setInterests] = useState<Sector[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Leaving>(null);
  const [match, setMatch] = useState<SwipeProfile | null>(null);
  const [note, setNote] = useState("");
  const [likedOnce, setLikedOnce] = useState(false);
  const start = useRef<{ x: number; id: number } | null>(null);

  // Los intereses marcados en el formulario se aplican como filtro.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sigue al formulario
    setInterests(draft.interests);
  }, [draft.interests]);

  // Si cambian los filtros o el perfil, el mazo vuelve a empezar.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reinicio del mazo */
    setSeen([]);
    setMatch(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [zone, interests, mySkill, draft.seeking]);

  const cards = useMemo(() => {
    const maxKm = zones.find((z) => z.value === zone)!.maxKm;
    // En "Mundo" se alternan perfiles de otros países y cercanos.
    const all =
      zone === "mundo"
        ? deck.flatMap((p, i) => (nearby[i] ? [p, nearby[i]] : [p]))
        : nearby;
    const pool = all.filter(
      (p) => (p.km ?? Infinity) <= maxKm && (interests.length === 0 || interests.includes(p.sector)),
    );
    const score = (p: SwipeProfile) =>
      (mySkill && p.seeks === mySkill ? 2 : 0) +
      (draft.seeking === "aprender" && p.skill === mySkill ? 2 : 0);
    return pool
      .map((p, i) => ({ p, i }))
      .sort((a, b) => score(b.p) - score(a.p) || a.i - b.i)
      .map(({ p }) => p);
  }, [zone, interests, mySkill, draft.seeking]);

  const remaining = cards.filter((p) => !seen.includes(p.name));
  const top = remaining[0];
  const next = remaining[1];

  function decide(dir: 1 | -1) {
    if (!top || leaving) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLeaving({ dir, profile: top });
    setDx(0);
    window.setTimeout(() => finish(dir, top), reduce ? 0 : 280);
  }

  function finish(dir: 1 | -1, p: SwipeProfile) {
    setSeen((s) => [...s, p.name]);
    setLeaving(null);
    if (dir === 1) {
      if (!likedOnce || (mySkill && p.seeks === mySkill)) {
        setMatch(p);
      } else {
        setNote(swipe.sent(p.name));
        window.setTimeout(() => setNote(""), 1800);
      }
      setLikedOnce(true);
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (leaving) return;
    start.current = { x: e.clientX, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!start.current || start.current.id !== e.pointerId) return;
    setDx(e.clientX - start.current.x);
  }
  function onPointerUp() {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (Math.abs(dx) > THRESHOLD) decide(dx > 0 ? 1 : -1);
    else setDx(0);
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (match) return;
    if (e.key === "ArrowRight") { e.preventDefault(); decide(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); decide(-1); }
  }

  const where = (p: SwipeProfile) =>
    p.km !== undefined ? `${swipe.away(p.km)} · ${city || swipe.yourCity}` : `${p.city}, ${countryName(p.country)}`;

  const shown = leaving?.profile ?? top;
  const offset = leaving ? leaving.dir * 420 : dx;
  const hint = Math.min(Math.abs(offset) / THRESHOLD, 1);

  return (
    <Phone label="Demo de la app: desliza perfiles" interactive onKeyDown={onKeyDown}>
      <div className="flex items-baseline justify-between px-5 pt-2 pb-3">
        <p className="text-[22px] font-semibold tracking-[-0.02em]">{swipe.header}</p>
        <p className="text-[13px] text-muted" aria-live="polite">{note}</p>
      </div>

      {/* Filtros */}
      <div className="grid gap-2 px-3 pb-3">
        <div role="radiogroup" aria-label={swipe.zoneLabel} className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-1">
          {zones.map((z) => (
            <button
              key={z.value}
              type="button"
              role="radio"
              aria-checked={zone === z.value}
              onClick={() => setZone(z.value)}
              className={`h-8 rounded-md text-[13px] transition-colors duration-200 ${
                zone === z.value ? "bg-bg font-semibold text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label={swipe.interestsLabel} className="-mx-3 flex gap-1 overflow-x-auto px-3 [scrollbar-width:none]">
          {SECTORS.map((s) => {
            const on = interests.includes(s.value);
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={on}
                onClick={() => setInterests((cur) => (on ? cur.filter((x) => x !== s.value) : [...cur, s.value]))}
                className={`h-8 shrink-0 rounded-full px-3 text-[13px] transition-colors duration-200 ${
                  on ? "bg-accent text-on-accent" : "bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mazo */}
      <div className="relative mx-3 min-h-0 flex-1">
        {match ? (
          <div className="swap absolute inset-0 flex flex-col justify-between rounded-2xl bg-accent p-5 text-on-accent">
            <div className="flex -space-x-3 pt-2" aria-hidden="true">
              <span className="flex size-14 items-center justify-center rounded-full bg-bg text-[15px] font-semibold text-accent ring-4 ring-accent">Tú</span>
              <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-[20px] font-semibold text-accent ring-4 ring-accent">
                {match.name[0]}
              </span>
            </div>
            <div>
              <p className="text-[30px] leading-none font-semibold tracking-[-0.03em]">{swipe.match.title}</p>
              <p className="mt-3 text-[15px] leading-snug">{swipe.match.text(match.name)}</p>
            </div>
            <div className="grid gap-1.5">
              <a href="#lista" className="flex h-11 items-center justify-center rounded-lg bg-bg text-[14px] font-medium text-accent">
                {swipe.match.write}
              </a>
              <button type="button" onClick={() => setMatch(null)} className="h-11 rounded-lg text-[14px] font-medium underline-offset-4 hover:underline">
                {swipe.match.keep}
              </button>
            </div>
          </div>
        ) : !shown ? (
          <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 rounded-2xl bg-surface p-5">
            {cards.length === 0 ? (
              <>
                <p className="text-[20px] leading-tight font-semibold">{swipe.empty.title}</p>
                <p className="text-[14px] text-muted">{swipe.empty.text}</p>
              </>
            ) : (
              <>
                <p className="text-[20px] leading-tight font-semibold">{swipe.end.title}</p>
                <p className="text-[14px] text-muted">{swipe.end.text}</p>
                <button type="button" onClick={() => setSeen([])} className="mt-2 h-10 rounded-lg bg-ink px-4 text-[14px] font-medium text-bg">
                  {swipe.end.restart}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {next && !leaving && (
              <div aria-hidden="true" className="absolute inset-0 translate-y-2 scale-[0.95] rounded-2xl bg-surface-2" />
            )}
            {leaving && next && (
              <Card p={next} where={where(next)} mySkill={mySkill} className="absolute inset-0" />
            )}
            <div
              key={shown.name}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="absolute inset-0 cursor-grab touch-pan-y select-none active:cursor-grabbing"
              style={{
                transform: `translateX(${offset}px) rotate(${offset / 18}deg)`,
                transition: dragging ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <Card p={shown} where={where(shown)} mySkill={mySkill} className="h-full" />
              <span
                aria-hidden="true"
                style={{ opacity: hint }}
                className={`pointer-events-none absolute top-4 rounded-md px-3 py-1.5 text-[15px] font-semibold ${
                  offset >= 0 ? "left-4 bg-accent text-on-accent" : "right-4 bg-ink text-bg"
                }`}
              >
                {offset >= 0 ? swipe.connect : swipe.pass}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Botones */}
      <div className="grid grid-cols-2 gap-1.5 px-3 pt-3">
        <button
          type="button"
          onClick={() => decide(-1)}
          disabled={!top || !!match}
          className="h-11 rounded-lg bg-surface text-[14px] font-medium text-ink transition-[transform,background-color] duration-150 active:scale-[0.97] disabled:opacity-40 hover:bg-surface-2"
        >
          {swipe.pass}
        </button>
        <button
          type="button"
          onClick={() => decide(1)}
          disabled={!top || !!match}
          className="h-11 rounded-lg bg-accent text-[14px] font-medium text-on-accent transition-[transform,background-color] duration-150 active:scale-[0.97] disabled:opacity-40 hover:bg-accent-strong"
        >
          {swipe.connect}
        </button>
      </div>

      <AppTabBar active="Descubrir" />
    </Phone>
  );
}

function Card({
  p,
  where,
  mySkill,
  className = "",
}: {
  p: SwipeProfile;
  where: string;
  mySkill: Skill | "";
  className?: string;
}) {
  const forYou = mySkill !== "" && p.seeks === mySkill;
  const sector = SECTORS.find((s) => s.value === p.sector)!.label;
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl bg-surface ${className}`}>
      <div className="flex flex-1 flex-col justify-between gap-3 bg-accent-soft p-4">
        <div className="flex items-start justify-end gap-2">
          <span className="rounded-md bg-bg px-2 py-1 text-[13px] text-ink">{where}</span>
        </div>
        <div>
          <p className="text-[13px] text-accent">
            {swipe.ideaLabel} · {sector}
          </p>
          <p className="mt-1 text-[20px] leading-[1.15] font-semibold tracking-[-0.02em] text-accent">{p.idea}</p>
        </div>
      </div>
      <div className="grid gap-2 p-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-[17px] font-semibold text-on-accent">
            {p.name[0]}
          </span>
          <div className="min-w-0">
            <p className="text-[17px] leading-tight font-semibold">
              {p.name}, {p.age}
            </p>
            <p className="text-[13px] leading-snug text-muted">
              Sabe de {skillLabel(p.skill)} · Habla {p.languages}
            </p>
          </div>
        </div>
        <p className={`text-[14px] leading-snug ${forYou ? "font-medium text-accent" : "text-ink"}`}>
          {forYou ? swipe.seeksYou(skillLabel(p.seeks)) : swipe.seeks(skillLabel(p.seeks))}
        </p>
      </div>
    </article>
  );
}
