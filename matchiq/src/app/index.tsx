import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';
import { isConfigured } from '@/lib/supabase';

/** Entry gate: backend configured → signed in → app. */
export default function Index() {
  const { session } = useSession();
  if (!isConfigured) return <Redirect href="/setup" />;
  return <Redirect href={session ? '/home' : '/onboarding'} />;
}
