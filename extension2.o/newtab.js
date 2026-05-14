// ============================================================
// EXTENSIVE Z v2.0 — newtab.js
// ============================================================

const POM_CIRC = 2 * Math.PI * 46;

// ============================================================
// ── APPLY SAVED THEME ─────────────────────────────────
// ============================================================
(function applyTheme() {
  const THEMES = {
    deepocean: {"--bg":"#0a0f1e","--surface":"#111827","--surface-2":"#1a2236","--surface-3":"#0d1424","--accent":"#6366f1","--accent-2":"#22d3ee","--text":"#e5e7eb","--text-muted":"#6b7280"},
    midnight:  {"--bg":"#1a0533","--surface":"#240a45","--surface-2":"#2d1054","--surface-3":"#150328","--accent":"#a855f7","--accent-2":"#f0abfc","--text":"#f3e8ff","--text-muted":"#a78bfa"},
    forest:    {"--bg":"#0d1f0d","--surface":"#162616","--surface-2":"#1a3320","--surface-3":"#0a180a","--accent":"#22c55e","--accent-2":"#4ade80","--text":"#dcfce7","--text-muted":"#6b7280"},
    synthwave: {"--bg":"#1a0533","--surface":"#220840","--surface-2":"#2d0d52","--surface-3":"#130228","--accent":"#ff0090","--accent-2":"#ffd700","--text":"#f9e8ff","--text-muted":"#c084fc"},
    slate:     {"--bg":"#0f172a","--surface":"#1e293b","--surface-2":"#334155","--surface-3":"#0f172a","--accent":"#6366f1","--accent-2":"#38bdf8","--text":"#e2e8f0","--text-muted":"#64748b"},
    nord:      {"--bg":"#2e3440","--surface":"#3b4252","--surface-2":"#434c5e","--surface-3":"#2e3440","--accent":"#88c0d0","--accent-2":"#81a1c1","--text":"#eceff4","--text-muted":"#d8dee9"},
    rosedark:  {"--bg":"#1c0e0e","--surface":"#2a1010","--surface-2":"#3d1515","--surface-3":"#160a0a","--accent":"#fb7185","--accent-2":"#f43f5e","--text":"#ffe4e6","--text-muted":"#9f1239"},
    light:     {"--bg":"#f8fafc","--surface":"#ffffff","--surface-2":"#f1f5f9","--surface-3":"#e2e8f0","--accent":"#6366f1","--accent-2":"#22d3ee","--text":"#1e293b","--text-muted":"#64748b","--border":"rgba(0,0,0,0.08)","--border-2":"rgba(0,0,0,0.12)"}
  };
  chrome.storage.local.get(["activeTheme","customGradient","bgImage"], d => {
    if (d.bgImage) {
      document.body.style.backgroundImage = `url(${d.bgImage})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
      return;
    }
    const theme = THEMES[d.activeTheme];
    if (theme) {
      Object.entries(theme).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
    } else if (d.customGradient) {
      document.documentElement.style.setProperty("--bg", d.customGradient.start);
      document.documentElement.style.setProperty("--surface", d.customGradient.end);
    }
  });
})();

// ============================================================
// ── CLOCK + GREETING ─────────────────────────────────────────
// ============================================================
(function initClock() {
  const timeEl  = document.getElementById("clock-time");
  const dateEl  = document.getElementById("clock-date");
  const greetEl = document.getElementById("clock-greet");

  function tick() {
    const now  = new Date();
    const h    = now.getHours();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const date = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    timeEl.textContent  = time;
    dateEl.textContent  = date;
    const greet = h < 5 ? "🌙 Good night!" : h < 12 ? "🌅 Good morning!" : h < 17 ? "☀️ Good afternoon!" : h < 21 ? "🌆 Good evening!" : "🌙 Good night!";
    greetEl.textContent = greet;
  }
  tick();
  setInterval(tick, 1000);
})();

// ============================================================
// ── SEARCH ───────────────────────────────────────────────────
// ============================================================
let searchEngine = "google";
const ENGINES = {
  google: "https://www.google.com/search?q=",
  bing:   "https://www.bing.com/search?q=",
  ddg:    "https://duckduckgo.com/?q="
};

// Load saved engine preference
chrome.storage.local.get("searchEngine", d => {
  if (d.searchEngine) {
    searchEngine = d.searchEngine;
    document.querySelectorAll(".eng-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.engine === searchEngine));
  }
});

document.querySelectorAll(".eng-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    searchEngine = btn.dataset.engine;
    chrome.storage.local.set({ searchEngine });
    document.querySelectorAll(".eng-btn").forEach(b => b.classList.toggle("active", b === btn));
  });
});

document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  doSearch(e.target.value.trim());
});

document.getElementById("searchBtn")?.addEventListener("click", () =>
  doSearch(document.getElementById("searchInput").value.trim()));

function doSearch(q) {
  if (!q) return;
  const isUrl = /^(https?:\/\/)|^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/|$)/.test(q);
  location.href = isUrl ? (q.startsWith("http") ? q : "https://" + q) : ENGINES[searchEngine] + encodeURIComponent(q);
}

// Voice Search (Web Speech API)
(function initVoice() {
  const btn = document.getElementById("voiceBtn");
  if (!btn) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { btn.title = "Voice search not supported"; btn.style.opacity = ".4"; return; }
  const rec = new SR();
  rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
  btn.addEventListener("click", () => { rec.start(); btn.classList.add("listening"); });
  rec.onresult = e => {
    const t = e.results[0][0].transcript;
    document.getElementById("searchInput").value = t;
    btn.classList.remove("listening");
    doSearch(t);
  };
  rec.onerror = rec.onend = () => btn.classList.remove("listening");
})();

// ============================================================
// ── POMODORO TIMER ───────────────────────────────────────────
// ============================================================
const POM_MINS   = 25;
const pomRing    = document.getElementById("pomRing");
const pomDisplay = document.getElementById("pomDisplay");
const pomLbl     = document.getElementById("pomLbl");
const pomStart   = document.getElementById("pomStart");
const pomPause   = document.getElementById("pomPause");
const pomStop    = document.getElementById("pomStop");

let pomTickInt   = null;
let pomPaused    = false;
let pausedSecs   = 0;
let pomCount     = 0;

pomRing.style.strokeDasharray  = POM_CIRC;
pomRing.style.strokeDashoffset = 0;

// Load count
chrome.storage.local.get("pomCount", d => { pomCount = d.pomCount || 0; updatePomToms(); updatePomBadge(); });

// Check if focus already running
chrome.runtime.sendMessage({ action: "getFocusStatus" }, res => {
  if (res.active) startPomUI(res.endTime, res.remaining, POM_MINS * 60);
  else setPomDisplay(POM_MINS * 60, POM_MINS * 60);
});

pomStart.addEventListener("click", () => {
  if (pomPaused) {
    const endTime = Date.now() + pausedSecs * 1000;
    chrome.runtime.sendMessage({ action: "startFocus", minutes: pausedSecs / 60 }, () => startPomUI(endTime, pausedSecs, POM_MINS * 60));
    pomPaused = false;
    return;
  }
  chrome.runtime.sendMessage({ action: "startFocus", minutes: POM_MINS }, res => {
    if (res.success) startPomUI(res.endTime, POM_MINS * 60, POM_MINS * 60);
  });
});

pomPause.addEventListener("click", () => {
  clearInterval(pomTickInt);
  chrome.runtime.sendMessage({ action: "stopFocus" });
  pomPaused = true;
  pomPause.disabled = true;
  pomStop.disabled  = false;
  pomStart.disabled = false;
  pomStart.textContent = "▶ Resume";
  pomLbl.textContent = "Paused";
});

pomStop.addEventListener("click", () => {
  clearInterval(pomTickInt);
  chrome.runtime.sendMessage({ action: "stopFocus" });
  pomPaused = false; pausedSecs = 0;
  pomStart.disabled = false; pomPause.disabled = true; pomStop.disabled = true;
  pomStart.textContent = "▶ Start";
  pomLbl.textContent = "Ready";
  setPomDisplay(POM_MINS * 60, POM_MINS * 60);
});

function startPomUI(endTime, totalSecs, durationSecs) {
  clearInterval(pomTickInt);
  pomStart.disabled = true; pomPause.disabled = false; pomStop.disabled = false;
  pomStart.textContent = "▶ Start";
  pomLbl.textContent = "Focusing…";
  pomTickInt = setInterval(() => {
    const rem = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    pausedSecs = rem;
    setPomDisplay(rem, durationSecs);
    if (rem <= 0) {
      clearInterval(pomTickInt);
      pomCount++;
      chrome.storage.local.set({ pomCount });
      updatePomToms();
      updatePomBadge();
      pomStart.disabled = false; pomPause.disabled = true; pomStop.disabled = true;
      pomLbl.textContent = "Done! 🎉";
    }
  }, 1000);
}

function setPomDisplay(rem, total) {
  const mm = String(Math.floor(rem / 60)).padStart(2, "0");
  const ss = String(rem % 60).padStart(2, "0");
  pomDisplay.textContent = `${mm}:${ss}`;
  const progress = total > 0 ? rem / total : 1;
  pomRing.style.strokeDashoffset = POM_CIRC * (1 - progress);
}

function updatePomToms() {
  document.querySelectorAll("#pomToms .ptom").forEach((el, i) => el.classList.toggle("done", i < (pomCount % 4)));
}

function updatePomBadge() {
  document.getElementById("pomCountBadge").textContent = `${pomCount} today`;
}

// ============================================================
// ── WEATHER ──────────────────────────────────────────────────
// ============================================================
const WEATHER_KEY = "32cfa7c144191f091d14238df3a6b4fc";

function renderWeather(d) {
  document.getElementById("weather-temp").textContent    = `${Math.round(d.temp)}°C`;
  document.getElementById("weather-desc").textContent    = d.desc;
  document.getElementById("weather-city").textContent    = `📍 ${d.city}`;
  document.getElementById("weatherUpdated").textContent  = d.ts ? new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

function fetchWeather(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_KEY}`)
    .then(r => r.json())
    .then(d => {
      const wd = { temp: d.main.temp, desc: d.weather[0].description, city: d.name, ts: Date.now() };
      chrome.storage.local.set({ weatherCache: wd });
      renderWeather(wd);
    })
    .catch(useCachedWeather);
}

function useCachedWeather() {
  chrome.storage.local.get("weatherCache", d => {
    if (d.weatherCache) renderWeather(d.weatherCache);
    else { document.getElementById("weather-desc").textContent = "Weather unavailable"; }
  });
}

// Refresh if cache > 30 min old
chrome.storage.local.get("weatherCache", d => {
  if (d.weatherCache && Date.now() - d.weatherCache.ts < 1800000) { renderWeather(d.weatherCache); return; }
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      useCachedWeather,
      { timeout: 6000 }
    );
  } else useCachedWeather();
});

// ============================================================
// ── BLOCK STATS ──────────────────────────────────────────────
// ============================================================
function loadBlockStats() {
  chrome.runtime.sendMessage({ action: "getBlockStats" }, stats => {
    const el = document.getElementById("statsContent");
    const counts = stats?.counts || {};
    const entries = Object.entries(counts).sort(([,a],[,b]) => b - a);
    if (!entries.length) { el.innerHTML = '<div class="empty">No blocked attempts today 🎉</div>'; return; }
    const max = entries[0][1];
    el.innerHTML = entries.map(([domain, count]) => `
      <div class="bar-item">
        <div class="bar-label"><span>🚫 ${domain}</span><span>${count}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(count/max)*100}%"></div></div>
      </div>
    `).join("");
  });
}
loadBlockStats();

document.getElementById("clearStatsBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "clearBlockStats" }, loadBlockStats);
});

// ============================================================
// ── CLUSTERS ─────────────────────────────────────────────────
// ============================================================
function loadClusters() {
  chrome.storage.local.get(null, data => {
    const clusters = Object.entries(data)
      .filter(([k]) => k.startsWith("cluster_"))
      .sort(([,a],[,b]) => a.createdAt - b.createdAt);
    const grid = document.getElementById("clNtGrid");
    if (!clusters.length) { grid.innerHTML = '<div class="empty">No clusters — create one in the popup 📁</div>'; return; }
    grid.innerHTML = "";
    clusters.forEach(([key, cl]) => {
      const div = document.createElement("div");
      div.className = "cl-nt-card";
      div.innerHTML = `<div class="cl-nt-em">${cl.emoji}</div><div class="cl-nt-nm">${cl.name}</div><div class="cl-nt-ct">${cl.urls.length} site${cl.urls.length !== 1 ? "s" : ""}</div>`;
      div.addEventListener("click", () => cl.urls.forEach(url => chrome.tabs.create({ url })));
      grid.appendChild(div);
    });
  });
}
loadClusters();

// ============================================================
// ── NOTES / TODO ─────────────────────────────────────────────
// ============================================================
let notes = [];

chrome.storage.local.get("notesTodo", d => { notes = d.notesTodo || []; renderNotes(); });

document.getElementById("noteInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const text = e.target.value.trim();
    if (!text) return;
    notes.push({ id: Date.now(), text, done: false });
    e.target.value = "";
    saveNotes();
    renderNotes();
  }
});

function renderNotes() {
  const list = document.getElementById("notesList");
  const count = document.getElementById("noteCount");
  const pending = notes.filter(n => !n.done).length;
  count.textContent = pending ? `${pending} pending` : "";
  if (!notes.length) { list.innerHTML = '<div class="empty" style="padding:8px 0">Press Enter to add a note</div>'; return; }
  list.innerHTML = "";
  notes.forEach(note => {
    const li = document.createElement("div");
    li.className = "note-item";
    li.innerHTML = `
      <input type="checkbox" ${note.done ? "checked" : ""} data-id="${note.id}" />
      <span class="note-text${note.done ? " done" : ""}">${renderMd(note.text)}</span>
      <button class="note-del" data-id="${note.id}" title="Delete">×</button>
    `;
    li.querySelector('input[type="checkbox"]').onchange = e => toggleNote(parseInt(e.target.dataset.id));
    li.querySelector(".note-del").onclick = e => deleteNote(parseInt(e.target.dataset.id));
    list.appendChild(li);
  });
}

function toggleNote(id) { notes = notes.map(n => n.id === id ? { ...n, done: !n.done } : n); saveNotes(); renderNotes(); }
function deleteNote(id) { notes = notes.filter(n => n.id !== id); saveNotes(); renderNotes(); }
function saveNotes()    { chrome.storage.local.set({ notesTodo: notes }); }

function renderMd(text) {
  return text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code style='background:var(--surface-3);padding:1px 4px;border-radius:3px;font-size:11px'>$1</code>")
    .replace(/^- (.+)/gm, "• $1");
}

// ============================================================
// ── SESSIONS ─────────────────────────────────────────────────
// ============================================================
function loadNtSessions() {
  chrome.storage.local.get(null, data => {
    const sessions = Object.entries(data)
      .filter(([k]) => k.startsWith("session_"))
      .sort(([,a],[,b]) => b.savedAt - a.savedAt)
      .slice(0, 5); // show top 5 in new tab
    const list = document.getElementById("ntSessList");
    if (!list) return;
    if (!sessions.length) { list.innerHTML = '<div class="empty">No saved sessions</div>'; return; }
    list.innerHTML = "";
    sessions.forEach(([key, sess]) => {
      const div = document.createElement("div");
      div.className = "nt-sess-item";
      div.innerHTML = `
        <div class="nt-sess-info">
          <div class="nt-sess-nm">💾 ${sess.name}</div>
          <div class="nt-sess-ct">${sess.urls.length} tabs</div>
        </div>
        <button class="btn btn-success btn-sm" data-k="${key}">↗ Open</button>
      `;
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
loadNtSessions();

// ============================================================
// ── QUICK CALCULATOR ─────────────────────────────────────────
// ============================================================
let ntCalcExpr = "";
let ntJustEvaled = false;

document.querySelectorAll("[data-nc]").forEach(btn => btn.addEventListener("click", () => ntCalc(btn.dataset.nc)));

// CSP-safe math evaluator (no eval/Function)
function ntMathEval(raw) {
  const e = raw.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').trim();
  let p = 0;
  const ws = () => { while (p < e.length && e[p]===' ') p++; };
  const addSub = () => { let v=mulDiv(); ws(); while(p<e.length&&(e[p]==='+'||e[p]==='-')){const op=e[p++];v=op==='+'?v+mulDiv():v-mulDiv();ws();} return v; };
  const mulDiv = () => { let v=unary(); ws(); while(p<e.length&&(e[p]==='*'||e[p]==='/'||e[p]==='%')){const op=e[p++],r=unary();if(op==='*')v*=r;else if(op==='/'){if(r===0)throw new Error('Div/0');v/=r;}else v%=r;ws();} return v; };
  const unary = () => { ws(); if(e[p]==='-'){p++;return -unary();} if(e[p]==='+'){p++;return unary();} return primary(); };
  const primary = () => { ws(); if(e[p]==='('){p++;const v=addSub();ws();if(e[p]===')') p++;return v;} let n=''; while(p<e.length&&/[\d.]/.test(e[p]))n+=e[p++]; if(!n)throw new Error('?'); return parseFloat(n); };
  const r = addSub();
  if (!isFinite(r)) throw new Error('Invalid');
  return +r.toFixed(10);
}

function ntCalc(key) {
  const exprEl = document.getElementById("ntCalcExpr");
  const resEl  = document.getElementById("ntCalcRes");
  if (!exprEl || !resEl) return;
  if (key === "C") { ntCalcExpr = ""; ntJustEvaled = false; resEl.textContent = "0"; exprEl.textContent = ""; return; }
  if (key === "back") { ntCalcExpr = ntCalcExpr.slice(0, -1); if (!ntCalcExpr) resEl.textContent = "0"; }
  else if (key === "=") {
    if (!ntCalcExpr) return;
    try {
      const result = ntMathEval(ntCalcExpr);
      exprEl.textContent = ntCalcExpr + " =";
      resEl.textContent  = result;
      ntCalcExpr = String(result);
      ntJustEvaled = true;
    } catch { resEl.textContent = "Error"; ntCalcExpr = ""; }
    return;
  } else {
    if (ntJustEvaled && key.match(/[\d.]/)) ntCalcExpr = "";
    ntJustEvaled = false;
    ntCalcExpr += key;
  }
  try {
    const v = Function(`"use strict"; return (${ntCalcExpr.replace(/[+\-*/]$/, "")})`)();
    resEl.textContent = isFinite(v) ? +v.toFixed(10) : "";
  } catch { resEl.textContent = ntCalcExpr || "0"; }
  exprEl.textContent = ntCalcExpr || "";
}

// ============================================================
// ── BLOCKED SITES ────────────────────────────────────────────
// ============================================================
function loadBlockedSites() {
  chrome.storage.local.get(["blockedSites"], data => {
    const sites = data.blockedSites || [];
    const list  = document.getElementById("blList");
    const count = document.getElementById("blCount");
    count.textContent = sites.length;
    if (!sites.length) { list.innerHTML = '<div class="empty">No sites blocked</div>'; return; }
    list.innerHTML = "";
    // Check unlocks
    chrome.storage.local.get(null, allData => {
      const now = Date.now();
      sites.forEach(({ domain }) => {
        const expiry = allData[`unlock_${domain}`];
        const unlocked = expiry && now < expiry;
        const div = document.createElement("div");
        div.className = "bl-item";
        div.innerHTML = `<span>🚫 ${domain}</span>${unlocked ? `<span class="bl-badge">${Math.ceil((expiry-now)/60000)}m left</span>` : ""}`;
        list.appendChild(div);
      });
    });
  });
}
loadBlockedSites();

// (Search bar is already wired at the top of this file — lines 64–118)

// ============================================================
// ── DARK MODE FOOTER TOGGLE ───────────────────────────────────
// ============================================================
document.getElementById("darkModeToggle").addEventListener("click", e => {
  e.preventDefault();
  chrome.storage.local.get("darkModeEnabled", d => {
    const enabled = !d.darkModeEnabled;
    chrome.storage.local.set({ darkModeEnabled: enabled });
    chrome.runtime.sendMessage({ action: "toggleDarkMode", enabled });
    e.target.textContent = enabled ? "☀️ Light Mode" : "🌙 Dark Mode";
  });
});

// ============================================================
// ── GOLD & METALS PRICES ─────────────────────────────────────
// ============================================================
async function loadGold() {
  try {
    const cached = JSON.parse(localStorage.getItem("goldCache") || "null");
    if (cached && Date.now() - cached.ts < 3600000) { renderGold(cached.d); return; }

    // Primary: Binance PAXGUSDT (Paxos Gold - 1 troy oz of gold)
    // - Free, huge rate limits, no API key, full CORS support
    const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT", { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    const goldUSD = data.price;
    if (!goldUSD) throw new Error("no price");
    
    // Convert 1 Troy Oz to 1 Gram (1 oz = 31.1034768 g)
    const goldPerGram = goldUSD / 31.1034768;
    const d = { gold: goldPerGram, silver: null };
    localStorage.setItem("goldCache", JSON.stringify({ d, ts: Date.now() }));
    renderGold(d);
  } catch {
    // Fallback: metals.live
    try {
      const r2 = await fetch("https://api.metals.live/v1/spot", { signal: AbortSignal.timeout(6000) });
      if (!r2.ok) throw new Error(r2.status);
      const data2 = await r2.json();
      if (data2?.[0]?.gold) {
        const goldPerGram = data2[0].gold / 31.1034768;
        const d = { gold: goldPerGram, silver: data2[0].silver ? data2[0].silver / 31.1034768 : null };
        localStorage.setItem("goldCache", JSON.stringify({ d, ts: Date.now() }));
        renderGold(d);
        return;
      }
    } catch {}
    // Show stale cache or N/A
    const cached2 = JSON.parse(localStorage.getItem("goldCache") || "null");
    if (cached2) renderGold(cached2.d);
    else document.getElementById("goldVal").textContent = "N/A";
  }
}
function renderGold(d) {
  // Use toFixed(2) because gram prices are smaller (~$75)
  document.getElementById("goldVal").textContent = d.gold ? "$" + (+d.gold).toFixed(2) : "N/A";
  document.getElementById("goldSub").textContent = d.silver ? "Silver: $" + (+d.silver).toFixed(2) + "/g" : "";
}
// Clear stale cache so new API endpoint fetches fresh data
localStorage.removeItem("goldCache");
loadGold();

// ============================================================
// ── USD → INR LIVE RATE ──────────────────────────────────────
// ============================================================
async function loadINR() {
  try {
    const cached = JSON.parse(localStorage.getItem("inrCache") || "null");
    if (cached && Date.now() - cached.ts < 3600000) { renderINR(cached.d); return; }
    const r = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await r.json();
    localStorage.setItem("inrCache", JSON.stringify({ d: data.rates, ts: Date.now() }));
    renderINR(data.rates);
  } catch { document.getElementById("inrVal").textContent = "N/A"; }
}
function renderINR(rates) {
  document.getElementById("inrVal").textContent = rates.INR ? "₹" + (+rates.INR).toFixed(2) : "N/A";
  document.getElementById("inrSub").textContent = "1 USD → INR";
}
loadINR();

// ============================================================
// ── CRICKET LIVE SCORES ──────────────────────────────────────
// ============================================================
async function loadCricket() {
  const el = document.getElementById("cricVal");
  try {
    // Use stored key or the default key
    const DEFAULT_CRIC_KEY = "41940723-4f04-4f7e-b447-8434198b9773";
    const key = (await new Promise(r => chrome.storage.local.get("cricApiKey", d => r(d.cricApiKey)))) || DEFAULT_CRIC_KEY;
    const r = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${key}&offset=0`, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    if (!data.data?.length) { el.textContent = "No live matches"; return; }
    const m = data.data[0];
    el.innerHTML = `<div style='font-weight:600;font-size:12px'>${m.teams?.join(" vs ") || m.name}</div><div>${m.status || ""}</div>`;
  } catch { el.textContent = "Unavailable"; }
}
loadCricket();
document.getElementById("cricRefresh")?.addEventListener("click", loadCricket);

// ============================================================
// ── NEWS SIDEBAR ─────────────────────────────────────────────
// ============================================================
async function loadNews() {
  const el = document.getElementById("newsListSidebar");
  if (!el) return;
  try {
    const cached = JSON.parse(localStorage.getItem("newsCache") || "null");
    if (cached && Date.now() - cached.ts < 900000) { renderNews(cached.d); return; }
    // URL-encode the RSS URL so rss2json parses it correctly
    const rssUrl = encodeURIComponent("https://feeds.bbci.co.uk/news/world/rss.xml");
    const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&count=10`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    if (data.status !== "ok" || !data.items?.length) throw new Error("bad data");
    localStorage.setItem("newsCache", JSON.stringify({ d: data.items, ts: Date.now() }));
    renderNews(data.items);
  } catch {
    // Fallback: try fetching BBC RSS directly and parse XML
    try {
      const r2 = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml", { signal: AbortSignal.timeout(8000) });
      const text = await r2.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const items = [...xml.querySelectorAll("item")].slice(0, 10).map(item => ({
        title: item.querySelector("title")?.textContent || "",
        link:  item.querySelector("link")?.textContent || "",
        pubDate: item.querySelector("pubDate")?.textContent || "",
        thumbnail: item.querySelector("thumbnail")?.getAttribute("url") || ""
      }));
      if (items.length) {
        localStorage.setItem("newsCache", JSON.stringify({ d: items, ts: Date.now() }));
        renderNews(items);
        return;
      }
    } catch {}
    el.innerHTML = `<div class='empty' style='text-align:center'>
      <div style='font-size:20px;margin-bottom:6px'>📡</div>
      News unavailable<br><span style='font-size:10px'>Check internet connection</span>
    </div>`;
  }
}
function renderNews(items) {
  const el = document.getElementById("newsListSidebar");
  if (!el) return;
  const ts = document.getElementById("newsTs");
  if (ts) ts.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  el.innerHTML = items.slice(0, 8).map(it => `
    <div class="news-item">
      ${it.thumbnail ? `<img src="${it.thumbnail}" onerror="this.remove()" loading="lazy">` : ""}
      <a href="${it.link}" target="_blank">${it.title}</a>
      <div class="news-meta">${new Date(it.pubDate).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div>
    </div>`).join("");
}
loadNews();

// ============================================================
// ── DAILY QUOTES ─────────────────────────────────────────────
// ============================================================
const QUOTES = [
  ["The only way to do great work is to love what you do.","Steve Jobs"],
  ["In the middle of every difficulty lies opportunity.","Albert Einstein"],
  ["It does not matter how slowly you go as long as you do not stop.","Confucius"],
  ["Life is what happens when you're busy making other plans.","John Lennon"],
  ["Strive not to be a success, but rather to be of value.","Albert Einstein"],
  ["The mind is everything. What you think you become.","Buddha"],
  ["Your time is limited, so don't waste it living someone else's life.","Steve Jobs"],
  ["Spread love everywhere you go.","Mother Teresa"],
  ["When you reach the end of your rope, tie a knot in it and hang on.","Franklin D. Roosevelt"],
  ["Always remember that you are absolutely unique. Just like everyone else.","Margaret Mead"],
  ["Don't go around saying the world owes you a living.","Mark Twain"],
  ["You miss 100% of the shots you don't take.","Wayne Gretzky"],
  ["The best time to plant a tree was 20 years ago. The second best time is now.","Chinese Proverb"],
  ["Whether you think you can or you think you can't, you're right.","Henry Ford"],
  ["The only impossible journey is the one you never begin.","Tony Robbins"],
  ["Life is not measured by the number of breaths we take.","Maya Angelou"],
  ["If life were predictable it would cease to be life.","Eleanor Roosevelt"],
  ["If you look at what you have in life, you'll always have more.","Oprah Winfrey"],
  ["If you set your goals ridiculously high and it's a failure, you will fail above everyone else's success.","James Cameron"],
  ["You only live once, but if you do it right, once is enough.","Mae West"]
];

function showQuote(q) {
  const idx = q || (Math.floor(Date.now() / 86400000) % QUOTES.length);
  const [text, author] = QUOTES[idx % QUOTES.length];
  const qt = document.getElementById("quoteText"), qa = document.getElementById("quoteAuthor");
  if (qt) qt.textContent = "“" + text + "”";
  if (qa) qa.textContent = "— " + author;
  chrome.storage.local.set({ lastQuoteIdx: idx });
}
chrome.storage.local.get("lastQuoteIdx", d => showQuote(d.lastQuoteIdx));
document.getElementById("newQuoteBtn")?.addEventListener("click", () => {
  chrome.storage.local.get("lastQuoteIdx", d => showQuote(((d.lastQuoteIdx || 0) + 1) % QUOTES.length));
});

// ============================================================
// ── SCREENSHOT BUTTON ────────────────────────────────────────
// ============================================================
document.getElementById("screenshotBtn")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "takeScreenshot" }, res => {
    if (chrome.runtime.lastError || !res?.dataUrl) {
      // Open target tab first, then try
      alert("Navigate to the page you want to capture, then come back and try again.");
      return;
    }
    // Open screenshot in a new tab as an image
    const w = window.open();
    w.document.write(`<style>body{margin:0;background:#000}img{max-width:100%;display:block}</style><img src="${res.dataUrl}">`);
  });
});

// ============================================================
// ── EDIT MODE ────────────────────────────────────────────────
// ============================================================
const editBtn  = document.getElementById("editModeBtn");
const editHint = document.getElementById("editHint");
let editActive = false;

editBtn?.addEventListener("click", () => {
  editActive = !editActive;
  document.body.classList.toggle("edit-mode", editActive);
  editBtn.classList.toggle("active", editActive);
  editBtn.textContent = editActive ? "✓" : "✏️";
  if (editHint) editHint.style.display = editActive ? "inline" : "none";
  if (!editActive) saveWidgetOrder();
});

// ── Widget controls (event delegation on grid) ────────────────
document.getElementById("widgetGrid")?.addEventListener("click", e => {
  const removeBtn = e.target.closest(".wc-remove");
  const resizeBtn = e.target.closest(".wc-resize");

  if (removeBtn) {
    e.stopPropagation();
    const w = removeBtn.closest(".widget");
    if (!w) return;
    w.style.display = "none";
    const key = w.id.replace("wgt-", "");
    chrome.storage.local.get("widgetVisibility", d => {
      const vis = d.widgetVisibility || {};
      vis[key] = false;
      chrome.storage.local.set({ widgetVisibility: vis });
    });
    saveWidgetOrder();
  }

  if (resizeBtn) {
    e.stopPropagation();
    const w = resizeBtn.closest(".widget");
    if (!w) return;
    const isWide = w.classList.toggle("wide");
    resizeBtn.classList.toggle("is-wide", isWide);
    saveWidgetOrder();
  }
});

// ── Remove handler for info-row cards, clock, clusters, sidebar ──
document.addEventListener("click", e => {
  if (!editActive) return;
  const removeBtn = e.target.closest(".wc-remove[data-hid]");
  if (!removeBtn) return;
  const hid = removeBtn.dataset.hid;
  // Find by ID or class name
  const el = document.getElementById(hid) || document.querySelector("." + hid);
  if (!el) return;
  e.stopPropagation();
  el.style.display = "none";
  chrome.storage.local.get("extraCardVisibility", d => {
    const vis = d.extraCardVisibility || {};
    vis[hid] = false;
    chrome.storage.local.set({ extraCardVisibility: vis });
  });
});

// Restore extra card visibility on load
chrome.storage.local.get("extraCardVisibility", d => {
  const vis = d.extraCardVisibility || {};
  Object.entries(vis).forEach(([hid, visible]) => {
    if (visible === false) {
      const el = document.getElementById(hid) || document.querySelector("." + hid);
      if (el) el.style.display = "none";
    }
  });
});

// ── Drag-to-reorder (event delegation on grid) ───────────────
let dragSrc = null;
function initDrag() {
  const grid = document.getElementById("widgetGrid");
  if (!grid) return;

  grid.addEventListener("dragstart", e => {
    const w = e.target.closest(".widget");
    if (!w) return;
    dragSrc = w;
    w.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", w.id);
  });

  grid.addEventListener("dragend", e => {
    document.querySelectorAll(".widget.dragging,.widget.drag-over")
      .forEach(el => el.classList.remove("dragging","drag-over"));
    dragSrc = null;
    saveWidgetOrder();
  });

  grid.addEventListener("dragover", e => {
    e.preventDefault();
    const w = e.target.closest(".widget");
    if (w && w !== dragSrc) {
      document.querySelectorAll(".widget.drag-over").forEach(el => el.classList.remove("drag-over"));
      w.classList.add("drag-over");
    }
  });

  grid.addEventListener("dragleave", e => {
    const w = e.target.closest(".widget");
    if (w) w.classList.remove("drag-over");
  });

  grid.addEventListener("drop", e => {
    e.preventDefault();
    const target = e.target.closest(".widget");
    if (!target || target === dragSrc || !dragSrc) return;
    target.classList.remove("drag-over");
    const children = [...grid.children];
    if (children.indexOf(dragSrc) < children.indexOf(target)) {
      target.after(dragSrc);
    } else {
      target.before(dragSrc);
    }
  });
}



function saveWidgetOrder() {
  const order = [...document.querySelectorAll(".widget")].map(w => ({ id: w.id }));
  chrome.storage.local.set({ widgetOrder: order });
}

// Apply widgetVisibility to the DOM (used on load and on storage change)
function applyWidgetVisibility(vis) {
  document.querySelectorAll(".widget[id]").forEach(w => {
    const key = w.id.replace("wgt-", "");
    if (vis[key] === false) w.style.display = "none";
    else if (vis[key] === true) w.style.display = "";
  });
}

function loadWidgetOrder() {
  chrome.storage.local.get(["widgetOrder", "widgetVisibility"], d => {
    // Restore order first
    if (d.widgetOrder) {
      const grid = document.getElementById("widgetGrid");
      d.widgetOrder.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) grid.appendChild(el);
      });
    }
    // Then apply visibility (single source of truth)
    applyWidgetVisibility(d.widgetVisibility || {});
  });
}

// Listen for settings page toggling widgets in real-time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.widgetVisibility) {
    applyWidgetVisibility(changes.widgetVisibility.newValue || {});
  }
});
initDrag();
loadWidgetOrder();

// ============================================================
// ── INTERNET SPEED TEST ──────────────────────────────────────
// ============================================================
(function initSpeedTest() {
  const btn    = document.getElementById("speedTestBtn");
  const valEl  = document.getElementById("speedVal");
  const statEl = document.getElementById("speedStatus");
  const dlEl   = document.getElementById("speedDL");
  const pingEl = document.getElementById("speedPing");
  if (!btn) return;

  let running = false;

  async function measurePing() {
    const t = Date.now();
    try { await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" }); }
    catch { return null; }
    return Date.now() - t;
  }

  async function measureSpeed() {
    // Download 10MB test file from Cloudflare speed test
    const url = "https://speed.cloudflare.com/__down?bytes=10000000";
    const start = Date.now();
    try {
      const r = await fetch(url, { cache: "no-store" });
      const buf = await r.arrayBuffer();
      const elapsed = (Date.now() - start) / 1000;
      const mb = buf.byteLength / 1024 / 1024;
      return (mb * 8 / elapsed).toFixed(1); // Mbps
    } catch { return null; }
  }

  btn.addEventListener("click", async () => {
    if (running) return;
    running = true;
    btn.textContent = "…";
    btn.disabled = true;
    if (valEl)  valEl.textContent = "…";
    if (statEl) statEl.textContent = "Testing ping…";
    if (dlEl)   dlEl.textContent = "—";
    if (pingEl) pingEl.textContent = "—";

    const ping = await measurePing();
    if (pingEl) pingEl.textContent = ping !== null ? ping : "err";
    if (statEl) statEl.textContent = "Downloading test file…";

    const mbps = await measureSpeed();
    if (valEl) valEl.textContent = mbps !== null ? mbps : "—";
    if (dlEl)  dlEl.textContent  = mbps !== null ? mbps : "err";
    if (statEl) statEl.textContent = mbps ? "✓ Test complete" : "✗ Test failed";

    // Colour the result
    if (valEl && mbps) {
      const v = parseFloat(mbps);
      valEl.style.color = v > 50 ? "var(--success)" : v > 10 ? "var(--accent-2)" : "var(--danger)";
    }

    btn.textContent = "↻ Retest";
    btn.disabled = false;
    running = false;
  });
})();

