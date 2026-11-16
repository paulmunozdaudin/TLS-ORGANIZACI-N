import { View } from 'react-native';

import type { RankRow } from '@/lib/types';
import { color, signed, space } from '@/theme/tokens';

import { Avatar, Row, Txt } from './ui';

export function RankingTable({ rows }: { rows: RankRow[] }) {
  return (
    <View>
      <Row gap={space.sm} style={{ paddingBottom: space.sm }}>
        <Txt v="caption" c={color.faint} style={{ width: 26 }}>#</Txt>
        <Txt v="caption" c={color.faint} style={{ flex: 1 }}>Player</Txt>
        <Txt v="caption" c={color.faint} style={{ width: 56, textAlign: 'right' }}>Won</Txt>
        <Txt v="caption" c={color.faint} style={{ width: 70, textAlign: 'right' }}>Profit</Txt>
      </Row>
      {rows.map((r) => (
        <Row
          key={r.user_id}
          gap={space.sm}
          style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: r.is_me ? color.accentDim : 'transparent', marginHorizontal: -space.lg, paddingHorizontal: space.lg }}>
          <Txt v="num" c={Number(r.rank) === 1 ? color.accent : color.muted} style={{ width: 26, fontSize: 14 }}>{r.rank}</Txt>
          <Row gap={space.sm} style={{ flex: 1 }}>
            <Avatar person={r} size={30} />
            <Txt v="bodyBold" numberOfLines={1} style={{ flexShrink: 1, fontSize: 14 }}>
              {r.username}
              {r.is_me ? ' · you' : ''}
            </Txt>
          </Row>
          <Txt v="small" c={color.muted} style={{ width: 56, textAlign: 'right' }}>{r.won}/{r.predictions}</Txt>
          <Txt v="num" c={Number(r.net_profit) > 0 ? color.accent : Number(r.net_profit) < 0 ? color.danger : color.text} style={{ width: 70, textAlign: 'right', fontSize: 15 }}>
            {signed(Number(r.net_profit))}
          </Txt>
        </Row>
      ))}
    </View>
  );
}
