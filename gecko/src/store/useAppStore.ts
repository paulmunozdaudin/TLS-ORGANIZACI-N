import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { resolveStatus, STAKE_LIMITS } from '@/domain/commitments';
import { estimateCalories } from '@/domain/gamification';
import { deposit } from '@/domain/ledger';
import type {
  Activity,
  ActivityType,
  Commitment,
  GoalMetric,
  TrackPoint,
  UserProfile,
  Wallet,
} from '@/domain/types';
import { verifyActivity } from '@/domain/verification';
import { createSimulatedPaymentProvider } from '@/services/payments/SimulatedPaymentProvider';

const SIMULATION_STARTING_BALANCE_CENTS = 10_000;
const MAX_STORED_ROUTE_POINTS = 200;

export interface Comment {
  id: string;
  author: string;
  text: string;
  at: number;
}

export interface ActivityDraft {
  type: ActivityType;
  startedAt: number;
  endedAt: number;
  movingTimeSec: number;
  distanceM: number;
  steps: number | null;
  route: TrackPoint[];
  commitmentId: string | null;
}

export interface NewCommitment {
  activityType: ActivityType;
  metric: GoalMetric;
  target: number;
  stakeCents: number;
  deadline: number;
}

interface AppState {
  hydrated: boolean;
  user: UserProfile | null;
  activities: Activity[];
  commitments: Commitment[];
  wallet: Wallet;
  liked: Record<string, boolean>;
  following: Record<string, boolean>;
  comments: Record<string, Comment[]>;

  completeOnboarding: (name: string) => void;
  createCommitment: (input: NewCommitment) => Promise<Commitment>;
  saveActivity: (draft: ActivityDraft) => Promise<Activity>;
  /** Recalcula el estado de los compromisos abiertos y liquida los que se resuelven. */
  settleCommitments: () => Promise<void>;
  toggleLike: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  addComment: (postId: string, text: string) => void;
  resetAll: () => void;
}

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const emptyWallet = (): Wallet => ({ availableCents: 0, heldCents: 0, ledger: [] });

function simplifyRoute(route: TrackPoint[]): { lat: number; lon: number }[] {
  const step = Math.max(1, Math.ceil(route.length / MAX_STORED_ROUTE_POINTS));
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  return route
    .filter((_, i) => i % step === 0 || i === route.length - 1)
    .map((p) => ({ lat: round(p.lat), lon: round(p.lon) }));
}

const initialData = () => ({
  user: null as UserProfile | null,
  activities: [] as Activity[],
  commitments: [] as Commitment[],
  wallet: emptyWallet(),
  liked: {} as Record<string, boolean>,
  following: {} as Record<string, boolean>,
  comments: {} as Record<string, Comment[]>,
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const payments = createSimulatedPaymentProvider({
        read: () => get().wallet,
        write: (wallet) => set({ wallet }),
      });

      return {
        hydrated: false,
        ...initialData(),

        completeOnboarding(name) {
          const clean = name.trim();
          const now = Date.now();
          set({
            user: {
              name: clean,
              username: clean.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'gecko',
              weightKg: 70,
              joinedAt: now,
            },
            wallet: deposit(emptyWallet(), SIMULATION_STARTING_BALANCE_CENTS, now),
          });
        },

        async createCommitment(input) {
          const now = Date.now();
          if (input.stakeCents < STAKE_LIMITS.minCents || input.stakeCents > STAKE_LIMITS.maxCents) {
            throw new Error('Importe fuera de los límites permitidos');
          }
          if (input.deadline <= now) throw new Error('La fecha límite debe ser futura');
          if (input.target <= 0) throw new Error('Objetivo no válido');

          const id = uid('cm');
          const holdId = await payments.hold(input.stakeCents, id);
          const commitment: Commitment = {
            id,
            ...input,
            createdAt: now,
            status: 'active',
            resolvedAt: null,
            holdId,
          };
          set({ commitments: [commitment, ...get().commitments] });
          return commitment;
        },

        async saveActivity(draft) {
          const now = Date.now();
          const verification = verifyActivity(draft, {
            existing: get().activities.map((a) => ({ startedAt: a.startedAt, endedAt: a.endedAt })),
            now,
          });
          const activity: Activity = {
            id: uid('ac'),
            type: draft.type,
            startedAt: draft.startedAt,
            endedAt: draft.endedAt,
            movingTimeSec: draft.movingTimeSec,
            distanceM: draft.distanceM,
            steps: draft.steps,
            calories: estimateCalories(draft.type, verification.verifiedDistanceM, get().user?.weightKg ?? 70),
            route: simplifyRoute(draft.route),
            verification,
            commitmentId: draft.commitmentId,
          };
          set({ activities: [activity, ...get().activities] });
          await get().settleCommitments();
          return activity;
        },

        async settleCommitments() {
          const now = Date.now();
          for (const c of get().commitments) {
            if (c.status === 'completed' || c.status === 'failed') continue;
            const status = resolveStatus(c, get().activities, now);
            if (status === c.status) continue;
            if (status === 'completed') await payments.release(c.stakeCents, c.id);
            if (status === 'failed') await payments.forfeit(c.stakeCents, c.id);
            const resolvedAt = status === 'completed' || status === 'failed' ? now : null;
            set({
              commitments: get().commitments.map((x) => (x.id === c.id ? { ...x, status, resolvedAt } : x)),
            });
          }
        },

        toggleLike(postId) {
          set({ liked: { ...get().liked, [postId]: !get().liked[postId] } });
        },

        toggleFollow(userId) {
          set({ following: { ...get().following, [userId]: !get().following[userId] } });
        },

        addComment(postId, text) {
          const clean = text.trim();
          const user = get().user;
          if (!clean || !user) return;
          const comment: Comment = { id: uid('co'), author: user.name, text: clean, at: Date.now() };
          set({ comments: { ...get().comments, [postId]: [...(get().comments[postId] ?? []), comment] } });
        },

        resetAll() {
          set(initialData());
        },
      };
    },
    {
      name: 'gecko-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ user, activities, commitments, wallet, liked, following, comments }) => ({
        user,
        activities,
        commitments,
        wallet,
        liked,
        following,
        comments,
      }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);
