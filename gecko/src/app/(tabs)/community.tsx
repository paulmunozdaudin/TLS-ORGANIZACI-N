import { useState } from 'react';
import { Pressable, Share, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { paceLabel } from '@/components/cards/ActivityRow';
import { ActivityBadge, Avatar, Segmented, Stat } from '@/components/cards/common';
import { lastSevenDays } from '@/components/cards/WeekChart';
import { RouteSketch } from '@/components/map/RouteSketch';
import { tap } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { CHALLENGES, POSTS, userById, USERS, type CommunityPost } from '@/data/community';
import { openChallenge } from '@/data/openChallenge';
import type { LatLon } from '@/domain/geo';
import { ACTIVITY_LABEL, formatDuration, formatGoalValue, formatInt, formatKm, formatMoney, formatRelative } from '@/domain/format';
import { computeStats } from '@/domain/gamification';
import type { ActivityType } from '@/domain/types';
import { useNow } from '@/hooks/useNow';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, space } from '@/theme/tokens';

type Tab = 'feed' | 'challenges' | 'ranking';

interface FeedItem {
  id: string;
  authorId: string | null;
  author: string;
  subtitle: string;
  color: string;
  at: number;
  type: ActivityType;
  title: string;
  distanceM: number;
  movingTimeSec: number;
  likes: number;
  stakeCents?: number;
  route: LatLon[];
}

function PostCard({ item, width, now }: { item: FeedItem; width: number; now: number }) {
  const liked = useAppStore((s) => !!s.liked[item.id]);
  const following = useAppStore((s) => (item.authorId ? !!s.following[item.authorId] : false));
  const comments = useAppStore((s) => s.comments[item.id]);
  const toggleLike = useAppStore((s) => s.toggleLike);
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  const addComment = useAppStore((s) => s.addComment);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const send = () => {
    addComment(item.id, draft);
    setDraft('');
  };
  const share = () => {
    Share.share({
      message: `${item.author}: ${item.title} · ${formatKm(item.distanceM)} km en ${formatDuration(item.movingTimeSec)} — en Gecko.`,
    }).catch(() => {});
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.row}>
        <Avatar name={item.author} color={item.color} />
        <View style={styles.flex}>
          <T variant="heading">{item.author}</T>
          <T variant="caption">{item.subtitle} · {formatRelative(item.at, now)}</T>
        </View>
        {item.authorId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={following ? `Dejar de seguir a ${item.author}` : `Seguir a ${item.author}`}
            onPress={() => {
              tap();
              toggleFollow(item.authorId as string);
            }}
            style={[styles.follow, following && styles.following]}
          >
            <T style={[styles.followText, following && { color: colors.textMuted }]}>{following ? 'Siguiendo' : 'Seguir'}</T>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.row}>
        <ActivityBadge type={item.type} size={32} />
        <T variant="heading" style={styles.flex}>{item.title}</T>
        {item.stakeCents ? (
          <View style={styles.won}>
            <Icon name="check" size={12} color={colors.onLime} strokeWidth={3} />
            <T style={styles.wonText}>{formatMoney(item.stakeCents)}</T>
          </View>
        ) : null}
      </View>

      <View style={styles.row}>
        <Stat label="Distancia" value={formatKm(item.distanceM)} unit="km" />
        <Stat label="Tiempo" value={formatDuration(item.movingTimeSec)} />
        <Stat label={item.type === 'ride' ? 'Velocidad' : 'Ritmo'} value={paceLabel(item, item.distanceM).split(' ')[0]} unit={item.type === 'ride' ? 'km/h' : '/km'} />
      </View>

      {item.route.length > 1 ? <RouteSketch points={item.route} width={width} height={150} /> : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Quitar me gusta' : 'Me gusta'}
          accessibilityState={{ selected: liked }}
          onPress={() => {
            tap();
            toggleLike(item.id);
          }}
          style={styles.action}
        >
          <Icon name="heart" size={20} color={liked ? colors.lime : colors.textMuted} filled={liked} />
          <T style={[styles.actionText, liked && { color: colors.lime }]}>{item.likes + (liked ? 1 : 0)}</T>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Comentarios" onPress={() => setOpen(!open)} style={styles.action}>
          <Icon name="comment" size={20} color={open ? colors.text : colors.textMuted} />
          <T style={styles.actionText}>{comments?.length ?? 0}</T>
        </Pressable>
        <View style={styles.flex} />
        <Pressable accessibilityRole="button" accessibilityLabel="Compartir" onPress={share} style={styles.action}>
          <Icon name="share" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {open ? (
        <View style={{ gap: space.sm }}>
          {(comments ?? []).map((c) => (
            <View key={c.id} style={styles.comment}>
              <T style={styles.commentAuthor}>{c.author}</T>
              <T variant="caption" color={colors.text}>{c.text}</T>
            </View>
          ))}
          <View style={styles.row}>
            <TextInput
              accessibilityLabel="Escribe un comentario"
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe un comentario…"
              placeholderTextColor={colors.textDim}
              maxLength={280}
              returnKeyType="send"
              onSubmitEditing={send}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar comentario"
              disabled={!draft.trim()}
              onPress={send}
              style={[styles.send, !draft.trim() && { opacity: 0.35 }]}
            >
              <Icon name="send" size={18} color={colors.onLime} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export default function Community() {
  const now = useNow();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('feed');
  const user = useAppStore((s) => s.user);
  const activities = useAppStore((s) => s.activities);
  const commitments = useAppStore((s) => s.commitments);
  const sketchWidth = Math.min(width, 560) - space.xl * 2 - space.lg * 2 - 2;

  const stats = computeStats(activities, commitments, now);
  const mine: FeedItem[] = activities
    .filter((a) => a.verification.status === 'verified')
    .map((a) => {
      const c = commitments.find((x) => x.id === a.commitmentId && x.status === 'completed');
      return {
        id: `me_${a.id}`,
        authorId: null,
        author: user?.name ?? 'Tú',
        subtitle: stats.rank.name,
        color: colors.lime,
        at: a.startedAt,
        type: a.type,
        title: `${ACTIVITY_LABEL[a.type]} con Gecko`,
        distanceM: a.verification.verifiedDistanceM,
        movingTimeSec: a.movingTimeSec,
        likes: 0,
        stakeCents: c?.stakeCents,
        route: a.route,
      };
    });
  const others: FeedItem[] = POSTS.map((p: CommunityPost) => {
    const u = userById(p.userId);
    return { ...p, authorId: u.id, author: u.name, subtitle: u.rank, color: u.color, at: now - p.hoursAgo * 3_600_000 };
  });
  const feed = [...mine, ...others].sort((a, b) => b.at - a.at);

  const myWeekKm = lastSevenDays(activities, now).reduce((s, d) => s + d.distanceM, 0) / 1000;
  const ranking = [
    ...USERS.map((u) => ({ id: u.id, name: u.name, color: u.color, km: u.weekKm, me: false })),
    { id: 'me', name: user?.name ?? 'Tú', color: colors.lime, km: myWeekKm, me: true },
  ].sort((a, b) => b.km - a.km);

  return (
    <Screen tabbed>
      <View style={{ gap: 4 }}>
        <T variant="display">Comunidad</T>
        <T variant="caption">Vista previa con perfiles de ejemplo hasta conectar el backend.</T>
      </View>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { key: 'feed', label: 'Actividad' },
          { key: 'challenges', label: 'Retos' },
          { key: 'ranking', label: 'Ranking' },
        ]}
      />

      {tab === 'feed' ? (
        <View style={{ gap: space.lg }}>
          {feed.map((item) => (
            <PostCard key={item.id} item={item} width={sketchWidth} now={now} />
          ))}
        </View>
      ) : null}

      {tab === 'challenges' ? (
        <View style={{ gap: space.md }}>
          {CHALLENGES.map((c) => (
            <Card key={c.id} onPress={() => openChallenge(c)} style={styles.row} accessibilityLabel={`Unirse al reto ${c.title}`}>
              <ActivityBadge type={c.activityType} />
              <View style={styles.flex}>
                <T variant="heading">{c.title}</T>
                <T variant="caption">
                  {formatGoalValue(c.metric, c.target)} · {formatInt(c.participants)} participantes
                </T>
              </View>
              <T variant="stat" color={colors.lime}>{formatMoney(c.stakeCents)}</T>
              <Icon name="chevronRight" size={18} color={colors.textDim} />
            </Card>
          ))}
        </View>
      ) : null}

      {tab === 'ranking' ? (
        <Card style={{ gap: space.xs, paddingVertical: space.sm }}>
          <T variant="label" style={{ paddingVertical: space.sm }}>Distancia · últimos 7 días</T>
          {ranking.map((r, i) => (
            <View key={r.id} style={[styles.rankRow, r.me && styles.rankMe]}>
              <T variant="stat" style={styles.rankPos} color={i < 3 ? colors.lime : colors.textDim}>{i + 1}</T>
              <Avatar name={r.name} color={r.color} size={34} />
              <T variant="heading" style={styles.flex} numberOfLines={1}>{r.me ? `${r.name} (tú)` : r.name}</T>
              <T variant="stat">{formatKm(r.km * 1000, 1)}</T>
              <T variant="caption">km</T>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  follow: { paddingHorizontal: 14, height: 32, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: colors.limeSoft },
  following: { backgroundColor: colors.surfaceHigh },
  followText: { fontSize: 12, fontWeight: '800', color: colors.lime },
  won: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
  },
  wonText: { fontSize: 12, fontWeight: '900', color: colors.onLime },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, minWidth: 36 },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  comment: { padding: space.md, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, gap: 2 },
  commentAuthor: { fontSize: 12, fontWeight: '800' },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    fontSize: 14,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radius.md },
  rankMe: { backgroundColor: colors.limeSoft },
  rankPos: { width: 26, textAlign: 'center' },
});
