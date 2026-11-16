import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import type { League } from '@/domain/types';
import { toast } from '@/state/store';

import { APP_NAME } from './backend';

/** Native share sheet where available, clipboard everywhere else. */
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

export const shareInvite = (league: League) =>
  shareText(`Join my ${APP_NAME} league "${league.name}". Open the app, tap Join league and enter code ${league.code}.`);

export async function copyCode(code: string) {
  try {
    await Clipboard.setStringAsync(code);
    toast('Invitation code copied.');
  } catch {
    toast('Could not copy the code.', 'error');
  }
}
