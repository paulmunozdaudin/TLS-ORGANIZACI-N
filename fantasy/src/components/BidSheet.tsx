import { useState } from 'react';
import { View } from 'react-native';

import type { League, Player } from '@/domain/types';
import { actions, attempt } from '@/state/store';
import { color, money, space } from '@/theme/tokens';

import { PlayerRow, RatingBadge } from './game';
import { Button, Chip, Field, Row, Sheet, Txt } from './ui';

interface Props {
  league: League;
  /** Budget free for this bid (already includes the current bid, if any). */
  available: number;
  currentBid?: number;
  onClose: () => void;
}

/** Place or update a blind bid. Validation happens in the repository, not here. */
export function BidSheet({ player, ...rest }: Props & { player: Player | null }) {
  return player ? <BidForm key={player.id} player={player} {...rest} /> : null;
}

function BidForm({ player, league, available, currentBid, onClose }: Props & { player: Player }) {
  const [amount, setAmount] = useState(String(currentBid ?? player.price));
  const value = Number(amount);
  const bump = (d: number) => setAmount(String(Math.max(player.price, (Number.isFinite(value) ? value : player.price) + d)));

  return (
    <Sheet visible onClose={onClose} title={currentBid ? 'Update your bid' : 'Place a bid'}>
      <PlayerRow player={player} right={<RatingBadge rating={player.rating} />} onPress={() => {}} />
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Txt v="caption" c={color.muted}>Minimum bid</Txt>
          <Txt v="h3">{money(player.price)}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="caption" c={color.muted}>You can spend</Txt>
          <Txt v="h3" c={color.accent}>{money(available)}</Txt>
        </View>
      </Row>
      <Field
        label="Your bid (€M)"
        keyboardType="number-pad"
        value={amount}
        onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
        maxLength={3}
        hint="Bids are blind. When the round closes the highest bid signs the player; ties go to the earliest bid."
      />
      <Row gap={space.sm}>
        {[-5, -1, 1, 5, 10].map((d) => (
          <Chip key={d} label={d > 0 ? `+${d}` : `${d}`} onPress={() => bump(d)} />
        ))}
      </Row>
      <Button
        label={`${currentBid ? 'Update bid' : 'Bid'} ${Number.isFinite(value) && value > 0 ? money(value) : ''}`}
        icon="hammer"
        onPress={() => {
          const done = attempt(
            actions.placeBid({ leagueId: league.id, playerId: player.id, amount: value }),
            `Bid placed on ${player.name}.`
          );
          if (done) onClose();
        }}
      />
    </Sheet>
  );
}
