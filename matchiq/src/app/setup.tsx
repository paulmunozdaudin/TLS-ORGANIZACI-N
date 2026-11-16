import { View } from 'react-native';

import { Wordmark } from '@/components/brand';
import { Card, Icon, Row, Screen, Txt } from '@/components/ui';
import { color, space } from '@/theme/tokens';

const STEPS = [
  ['Create a Supabase project', 'Apply supabase/migrations and deploy the sync function.'],
  ['Add provider keys as function secrets', 'API_FOOTBALL_KEY, THE_ODDS_API_KEY and CRON_SECRET. They never go in the app.'],
  ['Point the app at the project', 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then rebuild.'],
] as const;

/** Shown when the build has no backend. The app has no offline or mock mode. */
export default function Setup() {
  return (
    <Screen gap={space.xl}>
      <View style={{ marginTop: space.xxl, gap: space.lg }}>
        <Wordmark size={26} />
        <Txt v="h1">Not connected yet</Txt>
        <Txt c={color.muted}>
          This build is not linked to a backend, so there are no matches or odds to show. MATCH.IQ only displays real
          fixtures and real bookmaker prices from its data providers; it does not fall back to sample data.
        </Txt>
      </View>
      {STEPS.map(([title, body], i) => (
        <Card key={title}>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color.accentDim, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="bodyBold" c={color.accent}>{i + 1}</Txt>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">{title}</Txt>
              <Txt v="small" c={color.muted}>{body}</Txt>
            </View>
          </Row>
        </Card>
      ))}
      <Row gap={space.sm}>
        <Icon name="document-text" size={16} c={color.muted} />
        <Txt v="small" c={color.muted}>Full instructions: matchiq/README.md</Txt>
      </Row>
    </Screen>
  );
}
