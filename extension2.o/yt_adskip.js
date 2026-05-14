// ============================================================
// EXTENSIVE Z v2.0 — yt_adskip.js
// YouTube Ad Cosmetic Filter + Auto-Skip
// Only injected on youtube.com pages
// ============================================================

(function () {
  // ── Cosmetic CSS — hide ad UI overlays (NOT the video or skip button) ──
  const css = `
    /* Pre-roll / mid-roll info overlays — keep skip button visible for auto-click */
    .ytp-ad-overlay-container,
    .ytp-ad-text-overlay,
    .ytp-ad-tray,
    .ytp-ad-image-overlay,
    .ytp-ad-player-overlay-instream-info,
    .ytp-ad-info-dialog-container { display: none !important; }

    /* Top banner ad on homepage */
    #masthead-ad,
    ytd-banner-promo-renderer,
    tp-yt-paper-dialog ytd-mealbar-promo-renderer { display: none !important; }

    /* Sidebar / in-feed promoted videos */
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-ad-slot-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-display-ad-renderer,
    ytd-action-companion-ad-renderer,
    .ytd-display-ad-renderer { display: none !important; }

    /* Shopping / branded cards */
    ytd-promoted-sparkles-text-search-renderer,
    ytd-search-pyv-renderer { display: none !important; }
  `;

  const style = document.createElement("style");
  style.id = "ez-yt-adblock";
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // ── Auto-skip + mute during ads ────────────────────────────
  let wasMuted = false;

  function skipAds() {
    // Click skip button the moment it appears (before hiding it)
    const skipBtn = document.querySelector(
      ".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button-container button"
    );
    if (skipBtn && skipBtn.offsetParent !== null) {
      skipBtn.click();
      return;
    }

    const player   = document.querySelector(".html5-video-player");
    const video    = document.querySelector("video");
    const adActive = player?.classList.contains("ad-showing");

    if (adActive && video) {
      // Just mute audio during unskippable ads — don't touch playback or currentTime
      // (setting those causes the black screen)
      if (!video.muted) {
        wasMuted = false;
        video.muted = true;
      }
    } else if (!adActive && video && video.muted && !wasMuted) {
      // Restore sound after ad ends
      video.muted = false;
    }
  }

  setInterval(skipAds, 300);

  const observer = new MutationObserver(() => skipAds());
  observer.observe(document.body, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ["class"]
  });
})();
