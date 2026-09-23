// Short vibration for touch feedback. iOS Safari has no Vibration API and
// silently ignores the call; wrapped in try/catch since some browsers throw
// when called outside a user gesture.
export function vibrate(pattern = 15) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // haptics are a nice-to-have, never worth surfacing an error for
  }
}
