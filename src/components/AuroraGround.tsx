import React, { useEffect, useState } from 'react';

/*
 * The drifting hue behind the whole app.
 *
 * Built deliberately without `filter: blur()`. A blurred layer has to be
 * re-rasterised whenever it changes, which is what makes an animated blur
 * expensive enough to warm a phone and cost battery — and this is an app
 * people leave open for hours.
 *
 * Two choices avoid that entirely:
 *
 *   1. The softness comes from `radial-gradient` itself, which is soft by
 *      construction. No filter, so nothing to re-rasterise.
 *   2. Only `transform` is animated. The browser paints each layer once,
 *      promotes it, and the compositor moves it on the GPU from then on —
 *      no repaint and no style recalculation per frame.
 *
 * The result costs about what a static background costs.
 */
export const AuroraGround: React.FC = () => {
  const [paused, setPaused] = useState(false);

  /*
   * Stop drifting while nobody is looking. Browsers throttle animations in a
   * hidden tab, but that is not dependable inside a WebView, which is where
   * this ends up once the app is wrapped with Capacitor — and a background
   * animation nobody can see is pure battery.
   */
  useEffect(() => {
    const sync = () => setPaused(document.hidden);

    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return (
    <div className="aurora-ground" data-paused={paused} aria-hidden="true">
      <span className="aurora-field aurora-field--plum" />
      <span className="aurora-field aurora-field--teal" />
      <span className="aurora-field aurora-field--ember" />
    </div>
  );
};
