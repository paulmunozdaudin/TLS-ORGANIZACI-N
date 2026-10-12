export const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
