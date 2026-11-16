import { useState } from 'react';

import { QueryState } from '@/components/status';
import { Avatar, Button, Card, Empty, Field, NavHeader, Pill, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { ApiError, call, invalidate, useQuery } from '@/lib/api';
import { toast } from '@/lib/feedback';
import { useSession } from '@/lib/session';
import { shareText } from '@/lib/share';
import { color, space } from '@/theme/tokens';

interface Friend {
  user_id: string;
  username: string;
  avatar_color: string;
  status: 'pending' | 'accepted';
  incoming: boolean;
}

export default function Friends() {
  const { profile } = useSession();
  const { data, loading, error, reload } = useQuery<Friend[]>('my_friends');
  const [username, setUsername] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const done = () => invalidate('my_friends', 'get_rankings');
  const add = async () => {
    try {
      await call('request_friend', { p_username: username.trim() });
      toast(`Request sent to ${username.trim()}.`);
      setUsername('');
      done();
    } catch (e) {
      setFieldError((e as ApiError).message);
    }
  };
  const respond = (f: Friend, accept: boolean) =>
    call('respond_friend', { p_user_id: f.user_id, p_accept: accept }).then(done, (e: ApiError) => toast(e.message, 'error'));

  return (
    <Screen header={<NavHeader title="Friends" />}>
      <Card tone="accent">
        <Txt v="h3">Add a friend by username</Txt>
        <Field placeholder="their_username" icon="at" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={(t) => { setUsername(t); setFieldError(null); }} error={fieldError} onSubmitEditing={add} />
        <Row>
          <Button label="Send request" small onPress={add} disabled={username.trim().length < 3} style={{ flex: 1 }} />
          <Button label="Share my username" small kind="secondary" icon="share-outline" onPress={() => shareText(`Add me on MATCH.IQ: ${profile?.username}`)} style={{ flex: 1 }} />
        </Row>
      </Card>
      <SectionTitle title="Your friends" />
      {data ? (
        data.length ? (
          <Card pad={space.md} style={{ gap: 0 }}>
            {data.map((f, i) => (
              <Row key={f.user_id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
                <Avatar person={f} size={36} />
                <Txt v="bodyBold" style={{ flex: 1 }}>{f.username}</Txt>
                {f.status === 'accepted' ? (
                  <Button label="Remove" small kind="ghost" onPress={() => respond(f, false)} />
                ) : f.incoming ? (
                  <Row gap={space.sm}>
                    <Button label="Accept" small onPress={() => respond(f, true)} />
                    <Button label="Decline" small kind="ghost" onPress={() => respond(f, false)} />
                  </Row>
                ) : (
                  <Pill label="REQUEST SENT" />
                )}
              </Row>
            ))}
          </Card>
        ) : (
          <Card>
            <Empty icon="people" title="No friends yet" body="Friends appear in your Friends ranking so you can compare weeks." />
          </Card>
        )
      ) : (
        <QueryState loading={loading} error={error} onRetry={reload} rows={1} />
      )}
    </Screen>
  );
}
