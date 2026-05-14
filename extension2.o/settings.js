// ============================================================
// EXTENSIVE Z v2.0 — settings.js
// ============================================================

const THEMES = {
  deepocean: { "--bg":"#0a0f1e","--surface":"#111827","--surface-2":"#1a2236","--surface-3":"#0d1424","--accent":"#6366f1","--accent-2":"#22d3ee","--text":"#e5e7eb","--text-muted":"#6b7280" },
  midnight:  { "--bg":"#1a0533","--surface":"#240a45","--surface-2":"#2d1054","--surface-3":"#150328","--accent":"#a855f7","--accent-2":"#f0abfc","--text":"#f3e8ff","--text-muted":"#a78bfa" },
  forest:    { "--bg":"#0d1f0d","--surface":"#162616","--surface-2":"#1a3320","--surface-3":"#0a180a","--accent":"#22c55e","--accent-2":"#4ade80","--text":"#dcfce7","--text-muted":"#6b7280" },
  synthwave: { "--bg":"#1a0533","--surface":"#220840","--surface-2":"#2d0d52","--surface-3":"#130228","--accent":"#ff0090","--accent-2":"#ffd700","--text":"#f9e8ff","--text-muted":"#c084fc" },
  slate:     { "--bg":"#0f172a","--surface":"#1e293b","--surface-2":"#334155","--surface-3":"#0f172a","--accent":"#6366f1","--accent-2":"#38bdf8","--text":"#e2e8f0","--text-muted":"#64748b" },
  nord:      { "--bg":"#2e3440","--surface":"#3b4252","--surface-2":"#434c5e","--surface-3":"#2e3440","--accent":"#88c0d0","--accent-2":"#81a1c1","--text":"#eceff4","--text-muted":"#d8dee9" },
  rosedark:  { "--bg":"#1c0e0e","--surface":"#2a1010","--surface-2":"#3d1515","--surface-3":"#160a0a","--accent":"#fb7185","--accent-2":"#f43f5e","--text":"#ffe4e6","--text-muted":"#9f1239" },
  light:     { "--bg":"#f8fafc","--surface":"#ffffff","--surface-2":"#f1f5f9","--surface-3":"#e2e8f0","--accent":"#6366f1","--accent-2":"#22d3ee","--text":"#1e293b","--text-muted":"#64748b","--border":"rgba(0,0,0,0.08)","--border-2":"rgba(0,0,0,0.12)" }
};

// ── Toast helper ──────────────────────────────────────────────
function showToast(msg = "✅ Saved", color = "var(--success)") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = color;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

// ============================================================
// ── LOAD ALL SETTINGS ────────────────────────────────────────
// ============================================================
chrome.storage.local.get(null, data => {
  // Theme
  const activeTheme = data.activeTheme || "deepocean";
  document.querySelectorAll(".theme-swatch").forEach(s => s.classList.toggle("active", s.dataset.theme === activeTheme));
  applyThemeVars(THEMES[activeTheme] || THEMES.deepocean);

  // Gradient
  if (data.customGradient) {
    document.getElementById("gradStart").value = data.customGradient.start || "#0a0f1e";
    document.getElementById("gradEnd").value   = data.customGradient.end   || "#1e293b";
    updateGradPreview();
  }

  // BG image
  if (data.bgImage) {
    const img = document.getElementById("bgPreview");
    img.src = data.bgImage;
    img.style.display = "block";
    document.getElementById("bgActions").style.display = "flex";
  }

  // Search engine
  const eng = data.searchEngine || "google";
  document.querySelectorAll("#engineGroup .radio-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.engine === eng));

  // Widget visibility
  const wgtVis = data.widgetVisibility || {};
  document.querySelectorAll("[data-wgt]").forEach(cb => {
    cb.checked = wgtVis[cb.dataset.wgt] !== false; // default visible
  });

  // Extra card visibility (clock, gold, INR, cricket, clusters, sidebar)
  const extVis = data.extraCardVisibility || {};
  document.querySelectorAll("[data-extra]").forEach(cb => {
    cb.checked = extVis[cb.dataset.extra] !== false; // default visible
  });

  // Advanced
  if (data.httpsWarning !== undefined) document.getElementById("httpsToggle").checked  = data.httpsWarning;
  if (data.ctxMenuEnabled !== undefined) document.getElementById("ctxMenuToggle").checked = data.ctxMenuEnabled;
  
  // Ask background script for ground-truth ad block status (checks actual applied rules)
  chrome.runtime.sendMessage({ action: "getAdBlockStatus" }, res => {
    if (res) document.getElementById("adToggleSettings").checked = res.enabled;
  });
});

// ============================================================
// ── THEME SWATCHES ───────────────────────────────────────────
// ============================================================
document.querySelectorAll(".theme-swatch").forEach(swatch => {
  swatch.addEventListener("click", () => {
    const name = swatch.dataset.theme;
    const vars = THEMES[name];
    if (!vars) return;
    document.querySelectorAll(".theme-swatch").forEach(s => s.classList.remove("active"));
    swatch.classList.add("active");
    applyThemeVars(vars);
    chrome.storage.local.set({ activeTheme: name, bgImage: null, customGradient: null });
    showToast("🎨 Theme applied");
  });
});

function applyThemeVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

// ============================================================
// ── CUSTOM GRADIENT ──────────────────────────────────────────
// ============================================================
function updateGradPreview() {
  const s = document.getElementById("gradStart").value;
  const e = document.getElementById("gradEnd").value;
  document.getElementById("gradPreview").style.background = `linear-gradient(135deg, ${s}, ${e})`;
}
document.getElementById("gradStart").addEventListener("input", updateGradPreview);
document.getElementById("gradEnd").addEventListener("input",   updateGradPreview);
updateGradPreview();

document.getElementById("applyGradient").addEventListener("click", () => {
  const start = document.getElementById("gradStart").value;
  const end   = document.getElementById("gradEnd").value;
  const vars  = { "--bg": start, "--surface": end, "--surface-2": end + "88" };
  applyThemeVars(vars);
  chrome.storage.local.set({ customGradient: { start, end }, activeTheme: "custom", bgImage: null });
  document.querySelectorAll(".theme-swatch").forEach(s => s.classList.remove("active"));
  showToast("🌈 Gradient applied");
});

// ============================================================
// ── BACKGROUND IMAGE ─────────────────────────────────────────
// ============================================================
const uploadArea = document.getElementById("uploadArea");
const bgUpload   = document.getElementById("bgUpload");
const bgPreview  = document.getElementById("bgPreview");
const bgActions  = document.getElementById("bgActions");

uploadArea.addEventListener("click", () => bgUpload.click());
uploadArea.addEventListener("dragover", e => { e.preventDefault(); uploadArea.style.borderColor = "var(--accent)"; });
uploadArea.addEventListener("dragleave", () => { uploadArea.style.borderColor = ""; });
uploadArea.addEventListener("drop", e => { e.preventDefault(); uploadArea.style.borderColor = ""; processBgFile(e.dataTransfer.files[0]); });
bgUpload.addEventListener("change", e => { if (e.target.files[0]) processBgFile(e.target.files[0]); });

function processBgFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 4 * 1024 * 1024) { showToast("⚠️ Image too large (max 4MB)", "var(--warning)"); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    bgPreview.src = dataUrl;
    bgPreview.style.display = "block";
    bgActions.style.display = "flex";
    chrome.storage.local.set({ bgImage: dataUrl, activeTheme: "custom", customGradient: null });
    document.querySelectorAll(".theme-swatch").forEach(s => s.classList.remove("active"));
    showToast("🖼 Background applied");
  };
  reader.readAsDataURL(file);
}

document.getElementById("clearBg").addEventListener("click", () => {
  bgPreview.style.display = "none";
  bgActions.style.display = "none";
  chrome.storage.local.remove("bgImage");
  document.querySelectorAll(".wp-thumb").forEach(t => t.classList.remove("active"));
  showToast("Background removed");
});

// ── Stock Wallpapers (bg1–bg8) ──────────────────────────────
function applyBgImage(url) {
  bgPreview.src = url;
  bgPreview.style.display = "block";
  bgActions.style.display = "flex";
  chrome.storage.local.set({ bgImage: url, activeTheme: "custom", customGradient: null });
  document.querySelectorAll(".theme-swatch").forEach(s => s.classList.remove("active"));
  showToast("🖼 Wallpaper applied");
}

document.querySelectorAll(".wp-thumb").forEach(thumb => {
  thumb.addEventListener("click", () => {
    document.querySelectorAll(".wp-thumb").forEach(t => t.classList.remove("active"));
    thumb.classList.add("active");
    const url = chrome.runtime.getURL(thumb.dataset.bg);
    applyBgImage(url);
  });
});

// Load active wallpaper state
chrome.storage.local.get("bgImage", d => {
  if (d.bgImage) {
    document.querySelectorAll(".wp-thumb").forEach(t => {
      if (d.bgImage.endsWith(t.dataset.bg)) t.classList.add("active");
    });
  }
});

// ── Image URL input ─────────────────────────────────────────
document.getElementById("applyBgUrl")?.addEventListener("click", () => {
  const url = document.getElementById("bgUrlInput").value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) { showToast("⚠️ Please enter a full URL (https://…)", "var(--warning)"); return; }
  applyBgImage(url);
  document.getElementById("bgUrlInput").value = "";
});
document.getElementById("bgUrlInput")?.addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("applyBgUrl").click();
});

// ── Animation picker ────────────────────────────────────────
chrome.storage.local.get("bgAnimation", d => {
  const saved = d.bgAnimation || "none";
  document.querySelectorAll(".anim-btn").forEach(b => b.classList.toggle("active", b.dataset.anim === saved));
});

document.querySelectorAll(".anim-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".anim-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    chrome.storage.local.set({ bgAnimation: btn.dataset.anim });
    showToast("✨ Animation: " + (btn.dataset.anim === "none" ? "Off" : btn.textContent.trim()));
  });
});


// ============================================================
// ── SEARCH ENGINE ────────────────────────────────────────────
// ============================================================
document.querySelectorAll("#engineGroup .radio-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#engineGroup .radio-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    chrome.storage.local.set({ searchEngine: btn.dataset.engine });
    showToast("🔍 Search engine saved");
  });
});

// ============================================================
// ── PASSWORD CHANGE ──────────────────────────────────────────
// ============================================================
document.getElementById("changePwdBtn").addEventListener("click", () => {
  const cur     = document.getElementById("currentPwd").value;
  const newPwd  = document.getElementById("newPwd").value;
  const confirm = document.getElementById("confirmPwd").value;
  const msgEl   = document.getElementById("pwdMsg");

  chrome.storage.local.get("masterPassword", data => {
    const saved = data.masterPassword || "1234";
    if (cur !== saved) { msgEl.style.color = "var(--danger)"; msgEl.textContent = "❌ Current password is incorrect"; return; }
    if (!newPwd || newPwd.length < 4) { msgEl.style.color = "var(--danger)"; msgEl.textContent = "❌ New password must be at least 4 characters"; return; }
    if (newPwd !== confirm) { msgEl.style.color = "var(--danger)"; msgEl.textContent = "❌ Passwords do not match"; return; }
    chrome.storage.local.set({ masterPassword: newPwd }, () => {
      msgEl.style.color = "var(--success)";
      msgEl.textContent = "✅ Password changed successfully";
      document.getElementById("currentPwd").value = "";
      document.getElementById("newPwd").value      = "";
      document.getElementById("confirmPwd").value  = "";
      setTimeout(() => { msgEl.textContent = ""; }, 3000);
    });
  });
});

// ============================================================
// ── WIDGET VISIBILITY ────────────────────────────────────────
// ============================================================
document.querySelectorAll("[data-wgt]").forEach(cb => {
  cb.addEventListener("change", () => {
    chrome.storage.local.get("widgetVisibility", d => {
      const vis = d.widgetVisibility || {};
      vis[cb.dataset.wgt] = cb.checked;
      chrome.storage.local.set({ widgetVisibility: vis });
    });
  });
});

// Extra card visibility (info-row cards + sidebar)
document.querySelectorAll("[data-extra]").forEach(cb => {
  cb.addEventListener("change", () => {
    chrome.storage.local.get("extraCardVisibility", d => {
      const vis = d.extraCardVisibility || {};
      vis[cb.dataset.extra] = cb.checked;
      chrome.storage.local.set({ extraCardVisibility: vis });
      showToast(cb.checked ? "✅ Card shown" : "🚫 Card hidden");
    });
  });
});

// Reset All Visibility — restores every widget and card
document.getElementById("resetVisibilityBtn")?.addEventListener("click", () => {
  chrome.storage.local.set({ widgetVisibility: {}, extraCardVisibility: {} }, () => {
    document.querySelectorAll("[data-wgt], [data-extra]").forEach(cb => { cb.checked = true; });
    showToast("↺ All cards & widgets restored");
  });
});

// ============================================================
// ── ADVANCED TOGGLES ─────────────────────────────────────────
// ============================================================
document.getElementById("httpsToggle").addEventListener("change", e =>
  chrome.storage.local.set({ httpsWarning: e.target.checked }));

document.getElementById("ctxMenuToggle").addEventListener("change", e =>
  chrome.storage.local.set({ ctxMenuEnabled: e.target.checked }));

document.getElementById("adToggleSettings").addEventListener("change", e => {
  const desired = e.target.checked;
  chrome.runtime.sendMessage({ action: "toggleAdBlock", enabled: desired }, () => {
    // Re-verify ground truth after toggling
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "getAdBlockStatus" }, res => {
        document.getElementById("adToggleSettings").checked = res.enabled;
        showToast(res.enabled ? "🛡️ Ad Blocker enabled" : "Ad Blocker disabled");
      });
    }, 100);
  });
});

// CricAPI key
chrome.storage.local.get("cricApiKey", d => {
  if (d.cricApiKey) document.getElementById("cricApiKeyInput").value = d.cricApiKey;
});
document.getElementById("saveCricKey").addEventListener("click", () => {
  const key = document.getElementById("cricApiKeyInput").value.trim();
  chrome.storage.local.set({ cricApiKey: key }, () => {
    const msg = document.getElementById("cricKeyMsg");
    msg.textContent = key ? "✅ Key saved — cricket scores will load on next new tab" : "Key cleared";
    setTimeout(() => { msg.textContent = ""; }, 3000);
  });
});

// ============================================================
// ── DATA MANAGEMENT ──────────────────────────────────────────
// ============================================================
document.getElementById("exportBtn").addEventListener("click", () => {
  chrome.storage.local.get(null, data => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `extensive-z-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("⬇️ Data exported");
  });
});

document.getElementById("importBtn").addEventListener("click", () =>
  document.getElementById("importFile").click());

document.getElementById("importFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      chrome.storage.local.set(data, () => showToast("⬆️ Data imported — reload to apply"));
    } catch { showToast("❌ Invalid backup file", "var(--danger)"); }
  };
  reader.readAsText(file);
});

document.getElementById("clearAllBtn").addEventListener("click", () => {
  const confirmed = confirm("⚠️ This will permanently delete ALL your data — blocked sites, sessions, clusters, notes, and settings.\n\nAre you sure?");
  if (!confirmed) return;
  chrome.storage.local.clear(() => {
    chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: Array.from({ length: 9100 }, (_, i) => i + 1), addRules: [] }, () => {});
    showToast("🗑 All data cleared");
    setTimeout(() => location.reload(), 1500);
  });
});
