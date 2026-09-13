// HBO Max streaming begins at the Eastern premiere, not the later Pacific cable feed.
// Schedule: https://dknetwork.draftkings.com/2026/09/07/when-does-lanterns-episode-5-come-out-on-hbo/
export const RELEASE_AT = Date.parse('2026-09-13T21:00:00-04:00');

export function countdownAt(now) {
  const remaining = Math.max(0, RELEASE_AT - now);
  return {
    remaining,
    hours: Math.floor(remaining / 3600000),
    minutes: Math.floor(remaining / 60000) % 60,
    seconds: Math.floor(remaining / 1000) % 60,
    milliseconds: Math.floor(remaining % 1000),
    streaming: remaining === 0
  };
}
