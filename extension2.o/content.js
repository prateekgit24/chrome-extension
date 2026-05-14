// ============================================================
// EXTENSIVE Z v2.0 — content.js
// ============================================================

(() => {
  const domain = location.hostname.replace(/^www\./, "");
  if (!domain || domain === "newtab" || location.href.includes("chrome-extension://")) return;

  // ---- Site block redirect ----
  chrome.runtime.sendMessage({ action: "isUnlocked", site: domain }, response => {
    if (response?.unlocked) return;
    chrome.runtime.sendMessage({ action: "checkBlocked", site: domain }, res => {
      if (res?.blocked) {
        chrome.runtime.sendMessage({ action: "incrementBlockStat", domain });
        window.location.href = chrome.runtime.getURL("lock.html") + `?site=${encodeURIComponent(domain)}`;
      }
    });
  });

  // ---- HTTPS Warning Banner ----
  // Runs at document_start so we poll for body availability
  if (
    location.protocol === "http:" &&
    location.hostname !== "localhost" &&
    !location.hostname.match(/^(127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/)
  ) {
    function injectBanner() {
      if (document.getElementById("ez-https-banner")) return; // already injected
      const target = document.body || document.documentElement;
      if (!target) { setTimeout(injectBanner, 50); return; } // body not ready yet
      const banner = document.createElement("div");
      banner.id = "ez-https-banner";
      banner.innerHTML = `
        <span style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">⚠️</span>
          <strong>Insecure Connection</strong> — This site uses HTTP. Your data could be intercepted.
        </span>
        <button id="ez-banner-close" style="
          background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);
          color:#fef3c7;padding:3px 12px;border-radius:5px;cursor:pointer;
          font-size:12px;font-family:Inter,sans-serif;margin-left:12px;white-space:nowrap;
        ">Dismiss</button>
      `;
      Object.assign(banner.style, {
        position:"fixed",top:"0",left:"0",right:"0",zIndex:"2147483647",
        background:"linear-gradient(90deg,#78350f,#92400e)",color:"#fef3c7",
        padding:"9px 16px",fontFamily:"Inter,system-ui,sans-serif",fontSize:"13px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        boxShadow:"0 2px 12px rgba(0,0,0,0.5)"
      });
      target.insertBefore(banner, target.firstChild);
      document.getElementById("ez-banner-close").onclick = () => banner.remove();
    }
    // Try immediately, then on DOMContentLoaded as fallback
    injectBanner();
    document.addEventListener("DOMContentLoaded", injectBanner);
  }

  // ---- Listen for Dark Mode toggle from popup ----
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "darkModeChanged") {
      // Background handles CSS injection, content script just reacts if needed
    }
  });
})();
