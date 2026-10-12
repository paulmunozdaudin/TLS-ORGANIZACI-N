import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { useSession } from './store/session';

export function App() {
  const screen = useSession((s) => s.screen);
  switch (screen) {
    case 'session':
      return <SessionScreen />;
    case 'summary':
      return <SummaryScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <HomeScreen />;
  }
}
