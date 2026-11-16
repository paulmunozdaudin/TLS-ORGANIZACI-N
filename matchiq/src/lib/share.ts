import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { toast } from './feedback';

export async function shareText(message: string) {
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ message });
      return;
    }
    await Clipboard.setStringAsync(message);
    toast('Copied to clipboard.');
  } catch {
    toast('Sharing is not available on this device.', 'error');
  }
}

export async function copy(text: string, done = 'Copied.') {
  try {
    await Clipboard.setStringAsync(text);
    toast(done);
  } catch {
    toast('Could not copy.', 'error');
  }
}

/** Deep link that opens the join screen with the code filled in. */
export const joinLink = (code: string) => Linking.createURL(`/join/${code}`);
