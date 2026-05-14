// ============================================================
// EXTENSIVE Z v2.0 — popup.js
// ============================================================

const CIRC = 2 * Math.PI * 52; // SVG ring circumference

// ── Tab switching ──────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// Sub-tab switching (Tools & Library)
document.querySelectorAll(".sn-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const parent = btn.closest(".tab-panel, .sub-panel");
    btn.closest(".sub-nav, .lib-sub").querySelectorAll(".sn-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const key = btn.dataset.sub || btn.dataset.unit;
    btn.closest(".tab-panel").querySelectorAll(".sub-panel").forEach(p => {
      p.classList.toggle("active", p.id === "sub-" + key);
    });
    if (btn.dataset.unit) populateUnitSelects(btn.dataset.unit);
  });
});

// ── Screenshot Button (header) ─────────────────────────────
(function initScreenshot() {
  const btn = document.getElementById("screenshotBtn");
  const msg = document.getElementById("screenshotMsg");
  if (!btn) return;

  function showMsg(text, isError) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.display = "block";
    msg.style.color = isError ? "var(--danger)" : "var(--success)";
    setTimeout(() => { msg.style.display = "none"; }, 3000);
  }

  btn.addEventListener("click", () => {
    btn.style.transform = "scale(.9)";
    btn.style.opacity = ".6";
    setTimeout(() => { btn.style.transform = ""; btn.style.opacity = ""; }, 300);
    showMsg("📸 Capturing…", false);

    // Get the current window ID (popup shares the same window as the active tab)
    chrome.windows.getCurrent(w => {
      chrome.runtime.sendMessage({ action: "takeScreenshot", windowId: w.id }, res => {
        if (chrome.runtime.lastError || res?.error) {
          showMsg("✗ " + (res?.error || "Could not capture"), true);
        }
      });
    });
  });
})();


// Settings button
document.getElementById("settingsBtn").onclick = () =>
  chrome.runtime.openOptionsPage();

// ============================================================
// ── BLOCK TAB ────────────────────────────────────────────────
// ============================================================

// Load everything when popup opens
loadAdBlockStatus();
loadBlockedSites();
loadActiveUnlocks();
setInterval(loadActiveUnlocks, 10000);

// Add site
document.getElementById("addSiteBtn").addEventListener("click", addSite);
document.getElementById("siteInput").addEventListener("keydown", e => {
  if (e.key === "Enter") addSite();
});

function addSite() {
  let domain = document.getElementById("siteInput").value.trim().toLowerCase();
  if (!domain) return;
  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  chrome.runtime.sendMessage({ action: "addBlockedSite", site: domain }, res => {
    document.getElementById("siteInput").value = "";
    loadBlockedSites();
  });
}

function loadBlockedSites() {
  chrome.storage.local.get(["blockedSites"], data => {
    const sites = data.blockedSites || [];
    const list  = document.getElementById("sitesList");
    const count = document.getElementById("siteCount");
    count.textContent = sites.length;
    if (!sites.length) { list.innerHTML = '<div class="empty">No sites blocked yet</div>'; return; }
    list.innerHTML = "";
    sites.forEach(({ domain, ruleId }) => {
      const li = document.createElement("div");
      li.className = "si";
      li.innerHTML = `<span class="dom">🚫 ${domain}</span><span class="ubadge" id="ub-${domain}" style="display:none"></span><button class="rm" data-d="${domain}" data-r="${ruleId}" title="Remove">×</button>`;
      li.querySelector(".rm").addEventListener("click", e => {
        chrome.runtime.sendMessage({ action: "removeBlockedSite", domain: e.target.dataset.d, ruleId: parseInt(e.target.dataset.r) }, loadBlockedSites);
      });
      list.appendChild(li);
    });
    refreshUnlockBadges(sites);
  });
}

function loadActiveUnlocks() {
  chrome.storage.local.get(null, data => {
    const now = Date.now();
    const unlocks = Object.entries(data).filter(([k, v]) => k.startsWith("unlock_") && v > now);
    const sec = document.getElementById("unlockSection");
    const ul  = document.getElementById("unlockList");
    if (!unlocks.length) { sec.style.display = "none"; return; }
    sec.style.display = "block";
    ul.innerHTML = "";
    unlocks.forEach(([key, expiry]) => {
      const domain = key.replace("unlock_", "");
      const mins   = Math.ceil((expiry - now) / 60000);
      const div    = document.createElement("div");
      div.className = "si";
      div.style.borderColor = "rgba(16,185,129,.3)";
      div.innerHTML = `<span class="dom" style="color:var(--success)">🔓 ${domain}</span><span class="ubadge">${mins}m left</span>`;
      ul.appendChild(div);
    });
    refreshUnlockBadges(null, unlocks);
  });
}

function refreshUnlockBadges(sites, unlocks) {
  if (!unlocks) {
    chrome.storage.local.get(null, data => {
      const now = Date.now();
      const u = Object.entries(data).filter(([k, v]) => k.startsWith("unlock_") && v > now);
      refreshUnlockBadges(sites, u);
    });
    return;
  }
  unlocks.forEach(([key, expiry]) => {
    const domain = key.replace("unlock_", "");
    const el = document.getElementById(`ub-${domain}`);
    if (el) {
      el.textContent = `${Math.ceil((expiry - Date.now()) / 60000)}m left`;
      el.style.display = "inline";
    }
  });
}

// Ad Block
function loadAdBlockStatus() {
  chrome.runtime.sendMessage({ action: "getAdBlockStatus" }, res => {
    if (chrome.runtime.lastError || !res) return;
    const tog = document.getElementById("adToggle");
    const sub = document.getElementById("adSub");
    tog.checked = res.enabled;
    sub.textContent = res.enabled ? "Blocking 48 ad & tracker domains" : "Click to enable ad blocking";
  });
}
loadAdBlockStatus();

document.getElementById("adToggle").addEventListener("change", e => {
  const desired = e.target.checked;
  // Optimistic UI update
  document.getElementById("adSub").textContent = desired ? "Blocking 48 ad & tracker domains" : "Click to enable ad blocking";
  
  chrome.runtime.sendMessage({ action: "toggleAdBlock", enabled: desired }, res => {
    if (chrome.runtime.lastError) console.warn("AdBlock toggle:", chrome.runtime.lastError.message);
    // Re-verify after a short delay to ensure rules were applied
    setTimeout(loadAdBlockStatus, 150);
  });
});

// ============================================================
// ── FOCUS TAB ────────────────────────────────────────────────
// ============================================================

let focusMins    = 25;
let focusTickInt = null;
let focusPaused  = false;
let pausedRemain = 0;
let pomCount     = 0;

const focusRing    = document.getElementById("focusRing");
const focusDisplay = document.getElementById("focusDisplay");
const focusLbl     = document.getElementById("focusLbl");
const focusStart   = document.getElementById("focusStart");
const focusPause   = document.getElementById("focusPause");
const focusStop    = document.getElementById("focusStop");

// Load pomodoro count
chrome.storage.local.get("pomCount", d => { pomCount = d.pomCount || 0; updatePomUI(); });

// Focus duration presets
document.querySelectorAll("[data-fm]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-fm]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const v = parseInt(btn.dataset.fm);
    focusMins = v;
    document.getElementById("focusCustomRow").style.display = v === 0 ? "block" : "none";
    if (v > 0) setRingDisplay(v * 60, v * 60);
  });
});

// On open: check if focus is already running
chrome.runtime.sendMessage({ action: "getFocusStatus" }, res => {
  if (chrome.runtime.lastError || !res) { setRingDisplay(focusMins * 60, focusMins * 60); return; }
  if (res.active) {
    startFocusUI(res.endTime, res.remaining);
  } else {
    setRingDisplay(focusMins * 60, focusMins * 60);
  }
});

focusStart.addEventListener("click", () => {
  let mins = focusMins;
  if (focusMins === 0) {
    mins = parseInt(document.getElementById("focusCustom").value);
    if (!mins || mins < 1) return;
  }
  if (focusPaused) {
    // Resume from paused state — start UI immediately then tell background
    const endTime = Date.now() + pausedRemain * 1000;
    startFocusUI(endTime, pausedRemain);
    chrome.runtime.sendMessage({ action: "startFocus", minutes: pausedRemain / 60 });
    focusPaused = false;
    return;
  }
  // Start UI immediately with calculated endTime, then confirm with background
  const estimatedEnd = Date.now() + mins * 60 * 1000;
  startFocusUI(estimatedEnd, mins * 60);
  chrome.runtime.sendMessage({ action: "startFocus", minutes: mins }, res => {
    if (chrome.runtime.lastError) { console.warn("Focus SW error:", chrome.runtime.lastError.message); }
  });
});

focusPause.addEventListener("click", () => {
  clearInterval(focusTickInt);
  chrome.runtime.sendMessage({ action: "stopFocus" });
  focusPaused = true;
  focusPause.disabled = true;
  focusStop.disabled  = false;
  focusStart.textContent = "▶ Resume";
  focusStart.disabled = false;
  focusLbl.textContent = "Paused";
});

focusStop.addEventListener("click", () => {
  clearInterval(focusTickInt);
  chrome.runtime.sendMessage({ action: "stopFocus" });
  focusPaused = false;
  pausedRemain = 0;
  focusStart.disabled = false;
  focusPause.disabled = true;
  focusStop.disabled  = true;
  focusStart.textContent = "▶ Start";
  focusLbl.textContent = "Ready";
  setRingDisplay(focusMins * 60, focusMins * 60);
});

function startFocusUI(endTime, totalSecs) {
  clearInterval(focusTickInt);
  focusStart.disabled = true;
  focusPause.disabled = false;
  focusStop.disabled  = false;
  focusStart.textContent = "▶ Start";
  focusLbl.textContent = "Focusing…";

  focusTickInt = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    pausedRemain = remaining;
    setRingDisplay(remaining, totalSecs);
    if (remaining <= 0) {
      clearInterval(focusTickInt);
      pomCount++;
      chrome.storage.local.set({ pomCount });
      updatePomUI();
      focusStart.disabled = false;
      focusPause.disabled = true;
      focusStop.disabled  = true;
      focusLbl.textContent = "Done! 🎉";
    }
  }, 1000);
}

function setRingDisplay(remaining, total) {
  const mm  = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss  = String(remaining % 60).padStart(2, "0");
  focusDisplay.textContent = `${mm}:${ss}`;
  const progress = total > 0 ? remaining / total : 1;
  focusRing.style.strokeDashoffset = CIRC * (1 - progress);
}

function updatePomUI() {
  document.querySelectorAll(".tom").forEach((el, i) => {
    el.classList.toggle("done", i < (pomCount % 4));
  });
}

// ============================================================
// ── ALARM TAB ────────────────────────────────────────────────
// ============================================================

let alarmTickInt = null;

// Alarm presets
document.querySelectorAll("[data-alarm]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("alarmMins").value = btn.dataset.alarm;
    document.getElementById("alarmLabel").focus();
  });
});

document.getElementById("setAlarmBtn").addEventListener("click", () => {
  const mins  = parseInt(document.getElementById("alarmMins").value);
  const label = document.getElementById("alarmLabel").value.trim() || "Timer";
  if (!mins || mins < 1) return;
  chrome.runtime.sendMessage({ action: "setAlarm", minutes: mins, label }, res => {
    if (chrome.runtime.lastError || !res) return;
    if (res.success) startAlarmUI(res.endTime, label);
    document.getElementById("alarmMins").value  = "";
    document.getElementById("alarmLabel").value = "";
  });
});

document.getElementById("clearAlarmBtn").addEventListener("click", () => {
  clearInterval(alarmTickInt);
  chrome.runtime.sendMessage({ action: "clearAlarm" }, () => {
    document.getElementById("alarmCard").style.display = "none";
  });
});

// On open: check alarm status
chrome.runtime.sendMessage({ action: "getAlarmStatus" }, res => {
  if (res.active) startAlarmUI(res.endTime, res.label);
});

function startAlarmUI(endTime, label) {
  const card = document.getElementById("alarmCard");
  card.style.display = "block";
  document.getElementById("alarmLblT").textContent = label || "Timer";
  clearInterval(alarmTickInt);
  alarmTickInt = setInterval(() => {
    const rem = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    const mm  = String(Math.floor(rem / 60)).padStart(2, "0");
    const ss  = String(rem % 60).padStart(2, "0");
    document.getElementById("alarmCd").textContent = `${mm}:${ss}`;
    if (rem <= 0) { clearInterval(alarmTickInt); card.style.display = "none"; }
  }, 1000);
}

// ============================================================
// ── TOOLS TAB — CALCULATOR ───────────────────────────────────
// ============================================================

// CSP-safe math evaluator (replaces eval/Function which are blocked in extensions)
function mathEval(raw) {
  const e = raw.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').trim();
  let p = 0;
  const ws  = () => { while (p < e.length && e[p] === ' ') p++; };
  const addSub = () => {
    let v = mulDiv(); ws();
    while (p < e.length && (e[p]==='+' || e[p]==='-')) {
      const op = e[p++]; v = op==='+' ? v+mulDiv() : v-mulDiv(); ws();
    }
    return v;
  };
  const mulDiv = () => {
    let v = unary(); ws();
    while (p < e.length && (e[p]==='*' || e[p]==='/' || e[p]==='%')) {
      const op = e[p++], r = unary();
      if (op==='*') v*=r;
      else if (op==='/') { if(r===0) throw new Error('Division by zero'); v/=r; }
      else v%=r;
      ws();
    }
    return v;
  };
  const unary = () => { ws(); if(e[p]==='-'){p++;return -unary();} if(e[p]==='+'){p++;return unary();} return primary(); };
  const primary = () => {
    ws();
    if (e[p]==='(') { p++; const v=addSub(); ws(); if(e[p]===')') p++; return v; }
    let n=''; while(p<e.length && /[\d.]/.test(e[p])) n+=e[p++];
    if (!n) throw new Error('syntax');
    return parseFloat(n);
  };
  const result = addSub();
  if (!isFinite(result)) throw new Error('Not finite');
  return +result.toFixed(10);
}

let calcExpr = "";
let calcJustEvaled = false;

document.querySelectorAll("[data-c]").forEach(btn => {
  btn.addEventListener("click", () => handleCalc(btn.dataset.c));
});

document.addEventListener("keydown", e => {
  if (!document.getElementById("tab-tools").classList.contains("active")) return;
  if (!document.getElementById("sub-calc").classList.contains("active")) return;
  const map = { Enter: "=", Backspace: "back", Escape: "C", "*": "*", "/": "/", "+": "+", "-": "-" };
  const k = map[e.key] || (e.key.match(/[\d.%]/) ? e.key : null);
  if (k) { e.preventDefault(); handleCalc(k); }
});

function handleCalc(key) {
  const exprEl = document.getElementById("calcExpr");
  const resEl  = document.getElementById("calcRes");

  if (key === "C") { calcExpr = ""; calcJustEvaled = false; resEl.textContent = "0"; exprEl.textContent = ""; return; }
  if (key === "back") { calcExpr = calcExpr.slice(0, -1); if (!calcExpr) resEl.textContent = "0"; }
  else if (key === "=") {
    if (!calcExpr) return;
    try {
      const result = mathEval(calcExpr);
      exprEl.textContent = calcExpr + " =";
      resEl.textContent  = result;
      calcExpr = String(result);
      calcJustEvaled = true;
    } catch(err) { resEl.textContent = err.message || "Error"; calcExpr = ""; }
    return;
  } else {
    if (calcJustEvaled && key.match(/\d|\./)) calcExpr = "";
    calcJustEvaled = false;
    calcExpr += key;
  }
  // Live preview
  try {
    const preview = calcExpr.replace(/[+\-*\/]$/, "");
    if (preview) { const v = mathEval(preview); resEl.textContent = v; }
  } catch { resEl.textContent = calcExpr || "0"; }
  exprEl.textContent = calcExpr || "";
}

// ── UNIT CONVERTER ────────────────────────────────────────────
const UNITS = {
  length:  { m:1, km:0.001, cm:100, mm:1000, ft:3.28084, inch:39.3701, mi:0.000621371, yd:1.09361 },
  weight:  { kg:1, g:1000, mg:1e6, lb:2.20462, oz:35.274, ton:0.001 },
  temp:    { "°C":null, "°F":null, K:null },
  volume:  { L:1, mL:1000, gal:0.264172, qt:1.05669, pt:2.11338, floz:33.814, tsp:202.884, tbsp:67.628 }
};

function populateUnitSelects(type) {
  const from = document.getElementById("unitFrom");
  const to   = document.getElementById("unitTo");
  const keys = Object.keys(UNITS[type] || UNITS.length);
  from.innerHTML = to.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join("");
  to.value = keys[1] || keys[0];
  convertUnit(type);
}

document.getElementById("unitVal").addEventListener("input",  () => convertUnit(getCurrentUnitType()));
document.getElementById("unitFrom").addEventListener("change", () => convertUnit(getCurrentUnitType()));
document.getElementById("unitTo").addEventListener("change",   () => convertUnit(getCurrentUnitType()));

function getCurrentUnitType() {
  const active = document.querySelector("#sub-unit .sn-btn.active");
  return active ? active.dataset.unit : "length";
}

function convertUnit(type) {
  const val  = parseFloat(document.getElementById("unitVal").value);
  const from = document.getElementById("unitFrom").value;
  const to   = document.getElementById("unitTo").value;
  const res  = document.getElementById("unitRes");

  if (isNaN(val)) { res.innerHTML = `—<small id="unitResLbl"></small>`; return; }

  let result;
  if (type === "temp") {
    // Temperature: convert to C first, then to target
    let celsius = val;
    if (from === "°F") celsius = (val - 32) * 5/9;
    if (from === "K")  celsius = val - 273.15;
    if (to === "°F") result = celsius * 9/5 + 32;
    else if (to === "K") result = celsius + 273.15;
    else result = celsius;
  } else {
    const base = UNITS[type];
    const inBase = val / base[from];
    result = inBase * base[to];
  }

  res.innerHTML = `${+result.toFixed(6)} ${to}<small id="unitResLbl">${val} ${from} = ${+result.toFixed(6)} ${to}</small>`;
}

// Init with length
populateUnitSelects("length");

// ── CURRENCY CONVERTER ────────────────────────────────────────
const CURRENCIES = ["USD","EUR","GBP","INR","JPY","CAD","AUD","CHF","CNY","SGD",
                    "AED","MYR","KRW","BRL","MXN","SEK","NOK","DKK","NZD","HKD"];

(function initCurrency() {
  const from = document.getElementById("currFrom");
  const to   = document.getElementById("currTo");
  from.innerHTML = to.innerHTML = CURRENCIES.map(c => `<option value="${c}">${c}</option>`).join("");
  from.value = "USD"; to.value = "INR";
  loadCurrencyRates();
})();

document.getElementById("currVal").addEventListener("input",   convertCurrency);
document.getElementById("currFrom").addEventListener("change", convertCurrency);
document.getElementById("currTo").addEventListener("change",   convertCurrency);
document.getElementById("refreshRates").addEventListener("click", () => fetchFreshRates());

let ratesCache = null;

function loadCurrencyRates() {
  chrome.storage.local.get("currencyRates", data => {
    if (data.currencyRates && Date.now() - data.currencyRates.ts < 3600000) {
      ratesCache = data.currencyRates;
      document.getElementById("currUpdated").textContent = `Rates from ${new Date(data.currencyRates.ts).toLocaleTimeString()}`;
      convertCurrency();
    } else {
      fetchFreshRates();
    }
  });
}

function fetchFreshRates() {
  document.getElementById("currUpdated").textContent = "Fetching rates…";
  fetch("https://api.exchangerate-api.com/v4/latest/USD")
    .then(r => r.json())
    .then(data => {
      const rates = { ts: Date.now(), base: "USD", rates: data.rates };
      ratesCache = rates;
      chrome.storage.local.set({ currencyRates: rates });
      document.getElementById("currUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
      convertCurrency();
    })
    .catch(() => {
      document.getElementById("currUpdated").textContent = "Could not fetch rates";
    });
}

function convertCurrency() {
  if (!ratesCache) return;
  const amount = parseFloat(document.getElementById("currVal").value);
  const from   = document.getElementById("currFrom").value;
  const to     = document.getElementById("currTo").value;
  const res    = document.getElementById("currRes");
  const lbl    = document.getElementById("currResLbl");
  if (isNaN(amount)) { res.firstChild.textContent = "—"; lbl.textContent = "Enter amount above"; return; }
  const inUSD  = amount / (ratesCache.rates[from] || 1);
  const result = inUSD * (ratesCache.rates[to] || 1);
  res.innerHTML = `${result.toFixed(2)} ${to}<small>${amount} ${from} = ${result.toFixed(4)} ${to}</small>`;
}

// ============================================================
// ── LIBRARY — SESSIONS ───────────────────────────────────────
// ============================================================

loadSessions();

document.getElementById("saveSessionBtn").addEventListener("click", () => {
  const name = document.getElementById("sessName").value.trim();
  if (!name) { document.getElementById("sessName").focus(); return; }
  chrome.tabs.query({}, tabs => {
    const urls = tabs.map(t => t.url).filter(u => u && !u.startsWith("chrome"));
    const key  = "session_" + Date.now();
    chrome.storage.local.set({ [key]: { name, urls, savedAt: Date.now() } }, () => {
      document.getElementById("sessName").value = "";
      loadSessions();
    });
  });
});

function loadSessions() {
  chrome.storage.local.get(null, data => {
    const sessions = Object.entries(data)
      .filter(([k]) => k.startsWith("session_"))
      .sort(([,a],[,b]) => b.savedAt - a.savedAt);
    const list = document.getElementById("sessList");
    if (!sessions.length) { list.innerHTML = '<div class="empty">No saved sessions yet</div>'; return; }
    list.innerHTML = "";
    sessions.forEach(([key, sess]) => {
      const div = document.createElement("div");
      div.className = "sess-item";
      const ago = timeAgo(sess.savedAt);
      div.innerHTML = `
        <div class="sess-info">
          <div class="sess-name">💾 ${sess.name}</div>
          <div class="sess-meta">${sess.urls.length} tabs · ${ago}</div>
        </div>
        <button class="btn btn-success btn-sm" data-k="${key}">↗ Restore</button>
        <button class="btn btn-danger btn-sm"  data-k="${key}" data-del>🗑</button>
      `;
      div.querySelector("[data-del]").onclick = e => {
        chrome.storage.local.remove(e.target.dataset.k, loadSessions);
      };
      div.querySelector(".btn-success").onclick = e => {
        chrome.storage.local.get(e.target.dataset.k, d => {
          const s = d[e.target.dataset.k];
          if (s) s.urls.forEach(url => chrome.tabs.create({ url }));
        });
      };
      list.appendChild(div);
    });
  });
}

// ── LIBRARY — CLUSTERS ────────────────────────────────────────
let clEmoji  = "🗂";
let clUrls   = [];

loadClusters();

document.querySelectorAll(".ep").forEach(ep => {
  ep.addEventListener("click", () => {
    document.querySelectorAll(".ep").forEach(e => e.classList.remove("sel"));
    ep.classList.add("sel");
    clEmoji = ep.dataset.e;
  });
});

document.getElementById("addClUrl").addEventListener("click", addClusterUrl);
document.getElementById("clUrlInput").addEventListener("keydown", e => {
  if (e.key === "Enter") addClusterUrl();
});

function addClusterUrl() {
  let url = document.getElementById("clUrlInput").value.trim();
  if (!url) return;
  if (!url.startsWith("http")) url = "https://" + url;
  if (clUrls.includes(url)) return;
  clUrls.push(url);
  document.getElementById("clUrlInput").value = "";
  renderUrlTags();
}

function renderUrlTags() {
  const tags = document.getElementById("urlTags");
  tags.innerHTML = "";
  clUrls.forEach((url, i) => {
    const span = document.createElement("span");
    span.className = "utag";
    const domain = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    span.innerHTML = `${domain}<button data-i="${i}">×</button>`;
    span.querySelector("button").onclick = e => {
      clUrls.splice(parseInt(e.target.dataset.i), 1);
      renderUrlTags();
    };
    tags.appendChild(span);
  });
}

document.getElementById("saveCluster").addEventListener("click", () => {
  const name = document.getElementById("clName").value.trim();
  if (!name || clUrls.length < 1) return;
  const key = "cluster_" + Date.now();
  chrome.storage.local.set({ [key]: { name, emoji: clEmoji, urls: clUrls, createdAt: Date.now() } }, () => {
    document.getElementById("clName").value = "";
    clUrls = []; renderUrlTags();
    loadClusters();
  });
});

function loadClusters() {
  chrome.storage.local.get(null, data => {
    const clusters = Object.entries(data)
      .filter(([k]) => k.startsWith("cluster_"))
      .sort(([,a],[,b]) => a.createdAt - b.createdAt);
    const grid = document.getElementById("clGrid");
    if (!clusters.length) { grid.innerHTML = '<div class="empty" style="grid-column:span 2">No clusters yet</div>'; return; }
    grid.innerHTML = "";
    clusters.forEach(([key, cl]) => {
      const div = document.createElement("div");
      div.className = "cl-card";
      const favicons = cl.urls.slice(0, 5).map(url => {
        const domain = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
        return `<img class="cl-fav" src="https://www.google.com/s2/favicons?domain=${domain}" onerror="this.style.display='none'" />`;
      }).join("");
      div.innerHTML = `
        <div class="cl-emoji">${cl.emoji}</div>
        <div class="cl-name">${cl.name}</div>
        <div class="cl-favs">${favicons}</div>
        <div class="cl-cnt">${cl.urls.length} site${cl.urls.length !== 1 ? "s" : ""}</div>
        <div style="display:flex;gap:4px;margin-top:6px">
          <button class="btn btn-success btn-sm" style="flex:1" data-k="${key}">Open All</button>
          <button class="btn btn-danger btn-sm" data-k="${key}" data-del>🗑</button>
        </div>
      `;
      div.querySelector("[data-del]").onclick = e => {
        e.stopPropagation();
        chrome.storage.local.remove(e.target.dataset.k, loadClusters);
      };
      div.querySelector(".btn-success").onclick = e => {
        e.stopPropagation();
        chrome.storage.local.get(e.target.dataset.k, d => {
          const c = d[e.target.dataset.k];
          if (c) c.urls.forEach(url => chrome.tabs.create({ url }));
        });
      };
      grid.appendChild(div);
    });
  });
}

// ── UTILS ─────────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000)     return "just now";
  if (diff < 3600000)   return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

// ============================================================
// ── SPLIT VIEW ───────────────────────────────────────────────
// ============================================================
(function initSplitView() {
  // Track selected preset
  let splitRatio = 50;  // percent for left/top window
  let splitDir   = "h"; // "h" = horizontal (left/right), "v" = vertical (top/bottom)

  // Preset selection
  document.querySelectorAll(".split-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".split-preset").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      splitRatio = parseInt(btn.dataset.ratio);
      splitDir   = btn.dataset.dir;
    });
  });

  function showSplitMsg(text, isOk) {
    const el = document.getElementById("splitMsg");
    if (!el) return;
    el.textContent = text;
    el.style.color = isOk ? "var(--success)" : "var(--danger)";
    setTimeout(() => { el.textContent = ""; }, 3000);
  }

  // Apply Split View
  document.getElementById("splitViewBtn")?.addEventListener("click", () => {
    const sw    = window.screen.width;
    const sh    = window.screen.availHeight;
    const top   = window.screen.availTop || 0;
    const left  = window.screen.availLeft || 0;

    chrome.windows.getCurrent({ populate: false }, win => {
      if (chrome.runtime.lastError) {
        showSplitMsg("✗ Could not get window info", false);
        return;
      }

      if (splitDir === "h") {
        // Horizontal split — left window and right window
        const leftW  = Math.round(sw * splitRatio / 100);
        const rightW = sw - leftW;

        chrome.windows.update(win.id, {
          state: "normal",
          left: left, top: top,
          width: leftW, height: sh
        }, () => {
          chrome.windows.create({
            url: "chrome://newtab/",
            left: left + leftW, top: top,
            width: rightW, height: sh,
            state: "normal"
          }, () => {
            showSplitMsg("✓ Split applied — two windows tiled", true);
          });
        });

      } else {
        // Vertical split — top window and bottom window
        const topH    = Math.round(sh * splitRatio / 100);
        const bottomH = sh - topH;

        chrome.windows.update(win.id, {
          state: "normal",
          left: left, top: top,
          width: sw, height: topH
        }, () => {
          chrome.windows.create({
            url: "chrome://newtab/",
            left: left, top: top + topH,
            width: sw, height: bottomH,
            state: "normal"
          }, () => {
            showSplitMsg("✓ Split applied — top & bottom tiled", true);
          });
        });
      }
    });
  });

  // Restore / Maximise current window
  document.getElementById("splitRestoreBtn")?.addEventListener("click", () => {
    chrome.windows.getCurrent({}, win => {
      chrome.windows.update(win.id, { state: "maximized" }, () => {
        showSplitMsg("✓ Window maximised", true);
      });
    });
  });
})();
