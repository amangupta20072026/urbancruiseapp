/* eslint-disable no-void */
/**
 * Turning caller ID on — the steps behind "Turn on caller ID".
 *
 *   1. Android's own dialog: "Set Urban Cruise as your caller ID app?"
 *   2. If accepted: download the caller list straight away.
 *   3. Saved contacts: ask for contacts access (the app's rationale sheet,
 *      then Android's dialog). Without it Android never passes calls from
 *      numbers saved in the phone's contacts to caller ID (24 Nov 2026).
 *      Asked BEFORE step 4 because Android can only show the dialog while
 *      the app is open, and step 4 leaves the app.
 *   4. If "Display over other apps" is still off: open that settings
 *      page, so the overlay card can show. (Without it the phone still
 *      gets the notification backup.)
 */
import { toast } from '@services/toast';
import { ensureCapability } from '@services/permissions';
import { callerIdNative } from '@/native/callerId';

import { syncCallerId } from './sync';

export type TurnOnResult = 'on' | 'declined';

/**
 * Asks for contacts access for caller ID. Caller ID is a UC-only
 * feature, so the role is always 'uc'. Returns true when allowed.
 * A refusal is fine: caller ID still works for numbers that aren't saved.
 */
export async function allowSavedContacts(): Promise<boolean> {
  const result = await ensureCapability('callerIdContacts', 'uc');
  return result.status === 'granted';
}

export async function turnOnCallerId(): Promise<TurnOnResult> {
  const granted = await callerIdNative.requestRole();
  if (!granted) {
    toast.info('Caller ID is off', {
      description: 'You can turn it on any time from Settings › Caller ID.',
    });
    return 'declined';
  }

  void syncCallerId({ force: true });

  let status = await callerIdNative.getStatus();
  if (!status.contactsGranted) {
    await allowSavedContacts();
    status = await callerIdNative.getStatus();
  }

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
