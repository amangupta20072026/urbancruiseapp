/* eslint-disable no-void */
/**
 * Turning caller ID on — the steps behind "Turn on caller ID".
 *
 *   1. Android's own dialog: "Set Urban Cruise as your caller ID app?"
 *   2. If accepted: download the customer list straight away.
 *   3. If "Display over other apps" is still off: open that settings
 *      page, so the overlay card can show. (Without it the phone still
 *      gets the notification backup.)
 */
import { toast } from '@services/toast';
import { callerIdNative } from '@/native/callerId';

import { syncCallerId } from './sync';

export type TurnOnResult = 'on' | 'declined';

export async function turnOnCallerId(): Promise<TurnOnResult> {
  const granted = await callerIdNative.requestRole();
  if (!granted) {
    toast.info('Caller ID is off', {
      description: 'You can turn it on any time from Settings › Caller ID.',
    });
    return 'declined';
  }

  void syncCallerId({ force: true });

  const status = await callerIdNative.getStatus();
  if (!status.canDrawOverlays) {
    toast.info('One more step', {
      description:
        'Allow "Display over other apps" for Urban Cruise to see the caller card.',
    });
    await callerIdNative.openOverlaySettings();
  } else {
    toast.success('Caller ID is on');
  }
  return 'on';
}
