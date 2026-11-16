import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Button, Card, Confirm, NavHeader, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { footballData } from '@/data/provider';
import { APP_NAME } from '@/lib/backend';
import type { Settings } from '@/state/game';
import { RULES } from '@/state/game';
import { actions, toast, useGameState } from '@/state/store';
import { color, space } from '@/theme/tokens';

function Toggle({ label, detail, field }: { label: string; detail: string; field: keyof Settings }) {
  const s = useGameState();
  return (
    <Row style={{ paddingVertical: space.sm }}>
      <View style={{ flex: 1 }}>
        <Txt v="bodyBold">{label}</Txt>
        <Txt v="small" c={color.muted}>{detail}</Txt>
      </View>
      <Switch
        accessibilityLabel={label}
        value={s.settings[field]}
        onValueChange={(v) => void actions.updateSettings({ [field]: v })}
        trackColor={{ true: color.accent, false: color.surfaceHi }}
        thumbColor={color.text}
      />
    </Row>
  );
}

export default function SettingsScreen() {
  const [confirm, setConfirm] = useState(false);
  const sc = RULES.scoring;
  const rules: [string, string][] = [
    ['Appearance / 60+ minutes', `+${sc.appearance} / +${sc.sixtyMinutes}`],
    ['Goal (GK · DEF · MID · FWD)', `+${sc.goal.GK} · +${sc.goal.DEF} · +${sc.goal.MID} · +${sc.goal.FWD}`],
    ['Assist', `+${sc.assist}`],
    ['Clean sheet (GK · DEF · MID)', `+${sc.cleanSheet.GK} · +${sc.cleanSheet.DEF} · +${sc.cleanSheet.MID}`],
    [`Every ${sc.savesPerPoint} saves`, '+1'],
    ['Penalty saved / missed', `+${sc.penaltySaved} / ${sc.penaltyMissed}`],
    [`Every ${sc.concededStep} goals conceded (GK, DEF)`, `${sc.conceded.GK}`],
    ['Yellow / red card', `${sc.yellowCard} / ${sc.redCard}`],
    ['Own goal', `${sc.ownGoal}`],
    ['Captain', `×${sc.captainMultiplier}`],
    ['Fantasy goals', `1 per ${sc.goalConversion.step} pts above ${sc.goalConversion.baseline}`],
  ];
  return (
    <Screen header={<NavHeader title="Settings" />}>
      <SectionTitle title="Notifications" />
      <Card style={{ gap: 0 }}>
        <Toggle label="Match results" detail="When your head-to-head is scored" field="notifyResults" />
        <Toggle label="Transfer market" detail="Auction wins and losses" field="notifyMarket" />
        <Toggle label="League chat" detail="New messages in your leagues" field="notifyChat" />
        <Txt v="small" c={color.faint} style={{ paddingTop: space.sm }}>
          Preferences are saved now. Push delivery is switched on together with the backend; until then updates appear
          in the in-app notification list.
        </Txt>
      </Card>

      <SectionTitle title="Feel" />
      <Card style={{ gap: 0 }}>
        <Toggle label="Haptics" detail="Light vibration on actions (phones only)" field="haptics" />
      </Card>

      <SectionTitle title="Scoring rules" />
      <Card style={{ gap: 0 }}>
        {rules.map(([label, value], i) => (
          <Row key={label} style={{ justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
            <Txt v="small" c={color.muted} style={{ flex: 1 }}>{label}</Txt>
            <Txt v="small">{value}</Txt>
          </Row>
        ))}
      </Card>

      <SectionTitle title="Data" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="small" c={color.muted}>Football data</Txt>
          <Txt v="small" c={color.warn}>{footballData.isReal ? footballData.id : 'Demo (fictional)'}</Txt>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="small" c={color.muted}>Storage</Txt>
          <Txt v="small">This device only</Txt>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="small" c={color.muted}>Version</Txt>
          <Txt v="small">{APP_NAME} {Constants.expoConfig?.version ?? '–'}</Txt>
        </Row>
      </Card>

      <Button label="Reset demo and sign out" icon="refresh" kind="danger" onPress={() => setConfirm(true)} />
      <Txt v="small" c={color.faint} center>
        {APP_NAME} is free to play. Budgets are virtual: there is no betting and no cash prize.
      </Txt>

      <Confirm
        visible={confirm}
        danger
        title="Reset the demo?"
        body="Your demo profile, leagues, squads and chat on this device are deleted. This cannot be undone."
        confirmLabel="Reset"
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await actions.resetDemo();
          toast('Demo reset.', 'info');
          router.replace('/');
        }}
      />
    </Screen>
  );
}
