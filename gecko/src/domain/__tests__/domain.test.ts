import assert from 'node:assert/strict';
import { test } from 'node:test';

import { commitmentProgress, resolveStatus } from '../commitments';
import { computeStreak, levelFromXp, rankFor, xpForLevel } from '../gamification';
import { routeDistance } from '../geo';
import * as ledger from '../ledger';
import type { Activity, Commitment, TrackPoint } from '../types';
import { verifyActivity, type VerificationInput } from '../verification';

const T0 = Date.UTC(2026, 10, 16, 8, 0, 0);

/** Ruta hacia el norte a `speed` m/s con un punto por segundo y un ligero ruido de velocidad. */
function makeRoute(speed: number, seconds: number, opts: { jitter?: number; mocked?: boolean } = {}): TrackPoint[] {
  const pts: TrackPoint[] = [];
  let lat = 40.4168;
  for (let i = 0; i <= seconds; i++) {
    const v = speed * (1 + (opts.jitter ?? 0.08) * Math.sin(i * 1.7));
    if (i > 0) lat += v / 111_320;
    pts.push({ lat, lon: -3.7038, t: T0 + i * 1000, acc: 6, alt: 650, speed: v, seg: 0, mocked: opts.mocked });
  }
  return pts;
}

function input(type: VerificationInput['type'], route: TrackPoint[], over: Partial<VerificationInput> = {}): VerificationInput {
  const sec = (route[route.length - 1].t - route[0].t) / 1000;
  return {
    type,
    startedAt: route[0].t,
    endedAt: route[route.length - 1].t,
    movingTimeSec: sec,
    distanceM: routeDistance(route),
    steps: null,
    route,
    ...over,
  };
}

const ctx = { existing: [], now: T0 + 3 * 3600_000 };

test('una carrera normal queda verificada', () => {
  const r = verifyActivity(input('run', makeRoute(3, 1200)), ctx);
  assert.equal(r.status, 'verified');
  assert.ok(Math.abs(r.verifiedDistanceM - 3600) < 40);
});

test('ir en coche registrando "running" se rechaza por velocidad', () => {
  const r = verifyActivity(input('run', makeRoute(20, 600)), ctx);
  assert.equal(r.status, 'rejected');
  assert.ok(r.flags.some((f) => f.code === 'SPEED_TOO_HIGH'));
});

test('ubicación simulada se rechaza', () => {
  const r = verifyActivity(input('run', makeRoute(3, 600, { mocked: true })), ctx);
  assert.equal(r.status, 'rejected');
  assert.ok(r.flags.some((f) => f.code === 'MOCK_LOCATION'));
});

test('un salto de posición se detecta', () => {
  const route = makeRoute(3, 600);
  for (let i = 300; i < route.length; i++) route[i].lat += 0.02; // +2,2 km instantáneos
  const r = verifyActivity(input('run', route), ctx);
  assert.ok(r.flags.some((f) => f.code === 'TELEPORT'));
  assert.notEqual(r.status, 'verified');
});

test('distancia declarada inflada: cuenta solo la recalculada', () => {
  const route = makeRoute(3, 600);
  const r = verifyActivity(input('run', route, { distanceM: 10_000 }), ctx);
  assert.equal(r.status, 'suspicious');
  assert.ok(r.verifiedDistanceM < 2000);
});

test('actividad solapada con otra se rechaza como duplicado', () => {
  const route = makeRoute(3, 600);
  const r = verifyActivity(input('run', route), {
    ...ctx,
    existing: [{ startedAt: T0 + 60_000, endedAt: T0 + 120_000 }],
  });
  assert.ok(r.flags.some((f) => f.code === 'DUPLICATE_WINDOW'));
});

test('velocidad perfectamente constante es sospechosa', () => {
  const r = verifyActivity(input('run', makeRoute(3, 600, { jitter: 0 })), ctx);
  assert.ok(r.flags.some((f) => f.code === 'CONSTANT_SPEED'));
});

test('las pausas no suman distancia', () => {
  const a = makeRoute(3, 100);
  const b = makeRoute(3, 100).map((p) => ({ ...p, lat: p.lat + 0.05, t: p.t + 500_000, seg: 1 }));
  const d = routeDistance([...a, ...b]);
  assert.ok(Math.abs(d - 600) < 20);
});

const verified = (m: number) => ({ status: 'verified' as const, score: 100, flags: [], verifiedDistanceM: m, checkedAt: T0 });

function activity(over: Partial<Activity>): Activity {
  return {
    id: 'a',
    type: 'run',
    startedAt: T0,
    endedAt: T0 + 1800_000,
    movingTimeSec: 1800,
    distanceM: 5000,
    steps: null,
    calories: 0,
    route: [],
    commitmentId: null,
    verification: verified(5000),
    ...over,
  };
}

const commitment: Commitment = {
  id: 'c',
  activityType: 'run',
  metric: 'distance',
  target: 10_000,
  stakeCents: 1000,
  createdAt: T0 - 1000,
  deadline: T0 + 12 * 3600_000,
  status: 'active',
  resolvedAt: null,
  holdId: 'h',
};

test('progreso y resolución de compromisos', () => {
  const one = [activity({})];
  assert.equal(commitmentProgress(commitment, one).value, 5000);
  assert.equal(resolveStatus(commitment, one, T0 + 3600_000), 'active');
  assert.equal(resolveStatus(commitment, one, commitment.deadline + 1), 'failed');

  const second = { id: 'b', startedAt: T0 + 2 * 3600_000, endedAt: T0 + 3 * 3600_000 };
  assert.equal(resolveStatus(commitment, [...one, activity(second)], T0 + 4 * 3600_000), 'completed');

  const suspicious = activity({ ...second, verification: { ...verified(5000), status: 'suspicious' } });
  assert.equal(resolveStatus(commitment, [...one, suspicious], T0 + 4 * 3600_000), 'pending_verification');

  const wrongType = [activity({ type: 'ride', verification: verified(50_000) })];
  assert.equal(commitmentProgress(commitment, wrongType).value, 0);

  const late = activity({
    startedAt: commitment.deadline + 1,
    endedAt: commitment.deadline + 1800_000,
    verification: verified(20_000),
  });
  assert.equal(commitmentProgress(commitment, [late]).value, 0);
});

test('libro mayor: retener, liberar y penalizar cuadran', () => {
  let w = ledger.deposit({ availableCents: 0, heldCents: 0, ledger: [] }, 10_000, T0);
  w = ledger.hold(w, 1000, 'c1', T0);
  w = ledger.hold(w, 2000, 'c2', T0);
  assert.deepEqual([w.availableCents, w.heldCents], [7000, 3000]);
  w = ledger.release(w, 1000, 'c1', T0);
  w = ledger.forfeit(w, 2000, 'c2', T0);
  assert.deepEqual([w.availableCents, w.heldCents], [8000, 0]);
  assert.throws(() => ledger.hold(w, 9000, 'c3', T0), ledger.InsufficientFundsError);
});

test('niveles, rangos y rachas', () => {
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(xpForLevel(5)).level, 5);
  assert.equal(rankFor(4).rank.id, 'hatchling');
  assert.equal(rankFor(5).rank.id, 'rookie');
  assert.equal(rankFor(100).rank.id, 'legend');

  const day = 86_400_000;
  const now = new Date(2026, 10, 16, 18, 0).getTime();
  const acts = [0, 1, 2, 4].map((d) => activity({ id: `d${d}`, startedAt: now - d * day }));
  assert.deepEqual(computeStreak(acts, now), { current: 3, best: 3 });
  assert.equal(computeStreak(acts.slice(1), now).current, 2); // hoy sin entrenar: la racha sigue viva
});
