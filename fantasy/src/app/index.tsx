import { Redirect } from 'expo-router';

import { useGameState } from '@/state/store';

/** Entry gate: onboarding → sign-in → app. */
export default function Index() {
  const s = useGameState();
  if (s.meId) return <Redirect href="/home" />;
  return <Redirect href={s.onboardingSeen ? '/sign-in' : '/onboarding'} />;
}
