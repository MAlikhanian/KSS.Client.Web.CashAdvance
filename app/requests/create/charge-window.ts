/**
 * Recharge requests can be submitted only inside a daily window, once per fund per day. The
 * server enforces it and refuses with one of the codes below, sent as the error message. The
 * page maps each code to its own text, which tells the user when they can submit next; the
 * timing rule itself lives on the server, not here.
 *
 * Kept free of React, fetch and i18n so it can be asserted without a browser.
 */

export const CHARGE_WINDOW_NOT_YET = 'CHARGE_WINDOW_NOT_YET';
export const CHARGE_WINDOW_CLOSED = 'CHARGE_WINDOW_CLOSED';
export const CHARGE_DAILY_LIMIT = 'CHARGE_DAILY_LIMIT';

const KEYS: Record<string, { key: string; defaultValue: string }> = {
  [CHARGE_WINDOW_NOT_YET]: {
    key: 'ops.requests.create.windowNotYet',
    defaultValue:
      'Recharge requests can be submitted only from 13:00 to 16:00 Tehran time. You can submit today from 13:00.',
  },
  [CHARGE_WINDOW_CLOSED]: {
    key: 'ops.requests.create.windowClosed',
    defaultValue:
      'Recharge requests can be submitted only from 13:00 to 16:00 Tehran time. You can submit tomorrow from 13:00.',
  },
  [CHARGE_DAILY_LIMIT]: {
    key: 'ops.requests.create.windowDailyLimit',
    defaultValue:
      'You have already submitted a recharge request for this fund today. You can submit the next one tomorrow from 13:00 Tehran time.',
  },
};

/** The page's i18n key for a window code, or undefined for any other server message. */
export function chargeWindowMessage(message: string): { key: string; defaultValue: string } | undefined {
  return Object.prototype.hasOwnProperty.call(KEYS, message) ? KEYS[message] : undefined;
}
