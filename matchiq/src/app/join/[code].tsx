import { Redirect, useLocalSearchParams } from 'expo-router';

import { useSession } from '@/lib/session';

/** Invitation links (matchiq://join/CODE) land here. */
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session } = useSession();
  if (!session) return <Redirect href="/" />;
  return <Redirect href={{ pathname: '/league/join', params: { code } }} />;
}
