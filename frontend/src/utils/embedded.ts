/**
 * True when KidsChores is shown inside another site's frame, for example a Home
 * Assistant dashboard (v0.19.1). Google refuses to run its sign-in inside a frame,
 * so sign-in screens hide that button and offer kiosk pairing instead.
 *
 * Reading `window.top` from a cross-origin frame can throw in some browsers; that
 * only happens inside a frame, so it counts as embedded.
 */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
