// ============================================================
// EXTENSIVE Z v2.0 — background.js
// ============================================================

// ============================================================
// AD BLOCKER — Curated domain list
// ============================================================
const AD_DOMAINS = [
  "doubleclick.net","googlesyndication.com","adnxs.com","adsafeprotected.com",
  "moatads.com","scorecardresearch.com","quantserve.com","taboola.com",
  "outbrain.com","zedo.com","mathtag.com","advertising.com","adform.net",
  "rubiconproject.com","openx.net","criteo.com","pubmatic.com","smartadserver.com",
  "bidswitch.net","casalemedia.com","contextweb.com","appnexus.com","emxdgt.com",
  "lijit.com","realmedia.com","yieldmanager.com","serving-sys.com","addthis.com",
  "sharethrough.com","33across.com","triplelift.com","sonobi.com","sovrn.com",
  "spotxchange.com","teads.tv","mixpanel.com","fullstory.com","logrocket.com",
  "amplitude.com","hotjar.com","segment.io","heap.io","newrelic.com",
  "google-analytics.com","googletagmanager.com","facebook.net","ads.twitter.com",
  "ads.linkedin.com","adservice.google.com","pagead2.googlesyndication.com",
  // YouTube / Google ad infrastructure (pure domains only — paths are invalid in urlFilter)
  "imasdk.googleapis.com","googleadservices.com","ad.youtube.com",
  "ads.youtube.com","static.doubleclick.net","ssl.google-analytics.com"
];


const AD_RULES = AD_DOMAINS.map((domain, i) => ({
  id: i + 1,
  priority: 1,
  action: { type: "block" },
  condition: {
    urlFilter: `||${domain}^`,
    resourceTypes: ["script","image","xmlhttprequest","sub_frame","media","ping","beacon"]
  }
}));

// User-defined site blocking uses IDs starting at 10000 to avoid collision
let nextRuleId = 10000;

// ============================================================
// INIT
// ============================================================
chrome.runtime.onInstalled.addListener(() => {
  // Set up context menus
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "ez-block",      title: "🚫 Block this site",       contexts: ["page"] });
    chrome.contextMenus.create({ id: "ez-darkmode",   title: "🌙 Toggle Dark Mode",      contexts: ["page"] });
    chrome.contextMenus.create({ id: "ez-screenshot", title: "📸 Take Screenshot",       contexts: ["page"] });
  });

  // Restore ad block if it was enabled
  chrome.storage.local.get("adBlockEnabled", d => {
    if (d.adBlockEnabled) enableAdBlock();
  });
});

chrome.runtime.onStartup.addListener(() => {
  // Recreate context menus (they don't persist across Chrome restarts)
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "ez-block",      title: "🚫 Block this site",  contexts: ["page"] });
    chrome.contextMenus.create({ id: "ez-darkmode",   title: "🌙 Toggle Dark Mode", contexts: ["page"] });
    chrome.contextMenus.create({ id: "ez-screenshot", title: "📸 Take Screenshot",  contexts: ["page"] });
  });
  chrome.storage.local.get("adBlockEnabled", d => {
    if (d.adBlockEnabled) enableAdBlock();
  });
  // Restore any focus session that might still be active
  chrome.storage.local.get(["focusActive","focusEndTime"], d => {
    if (d.focusActive && d.focusEndTime && Date.now() < d.focusEndTime) {
      const minsLeft = Math.ceil((d.focusEndTime - Date.now()) / 60000);
      chrome.alarms.create("focusAlarm", { delayInMinutes: minsLeft });
    }
  });
});

// ============================================================
// MESSAGE ROUTER
// ============================================================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {

    // -------- Site Blocking --------
    case "addBlockedSite":
      addBlockingRule(msg.site, sendResponse);
      return true;

    case "removeBlockedSite":
      removeBlockingRule(msg.domain, msg.ruleId, sendResponse);
      return true;

    case "checkBlocked":
      checkIfBlocked(msg.site, sendResponse);
      return true;

    // -------- Unlock --------
    case "unlockSite":
      unlockSite(msg.site, msg.duration, sendResponse);
      return true;

    case "isUnlocked":
      isUnlocked(msg.site, sendResponse);
      return true;

    // -------- Focus Mode --------
    case "startFocus":
      startFocus(msg.minutes, sendResponse);
      return true;

    case "stopFocus":
      stopFocus(sendResponse);
      return true;

    case "getFocusStatus":
      getFocusStatus(sendResponse);
      return true;

    // -------- Alarm --------
    case "setAlarm":
      setUserAlarm(msg.minutes, msg.label, sendResponse);
      return true;

    case "clearAlarm":
      clearUserAlarm(sendResponse);
      return true;

    case "getAlarmStatus":
      getAlarmStatus(sendResponse);
      return true;

    // -------- Ad Blocker --------
    case "toggleAdBlock":
      msg.enabled ? enableAdBlock(sendResponse) : disableAdBlock(sendResponse);
      return true;

    case "getAdBlockStatus":
      // Ground-truth check: read actual applied dynamic rules.
      // If the service worker just woke up, getDynamicRules() may transiently
      // return an empty array even though the rules are functionally active.
      // We therefore cross-reference chrome.storage to avoid a false-negative
      // that would incorrectly flip the UI toggle to "off".
      chrome.declarativeNetRequest.getDynamicRules(rules => {
        const hasAdRules = rules.some(r => r.id < 1000);
        if (hasAdRules) {
          // Rules are present — definitely enabled. Sync storage.
          chrome.storage.local.set({ adBlockEnabled: true });
          sendResponse({ enabled: true });
        } else {
          // No rules found — check storage before concluding "off"
          chrome.storage.local.get("adBlockEnabled", d => {
            if (d.adBlockEnabled) {
              // Storage says on but rules are missing (SW restart race condition)
              // Re-apply rules silently and report enabled so UI stays correct
              enableAdBlock(null);
              sendResponse({ enabled: true });
            } else {
              // Genuinely disabled
              sendResponse({ enabled: false });
            }
          });
        }
      });
      return true;

    // -------- Block Stats --------
    case "incrementBlockStat":
      incrementBlockStat(msg.domain);
      break;

    case "getBlockStats":
      getBlockStats(sendResponse);
      return true;

    case "clearBlockStats":
      chrome.storage.local.set({ blockStats: null }, () => sendResponse({ success: true }));
      return true;

    // -------- Dark Mode --------
    case "toggleDarkMode":
      toggleDarkMode(msg.enabled, sender.tab, sendResponse);
      return true;

    // -------- Screenshot --------
    case "takeScreenshot":
      handleScreenshot(sendResponse, msg.windowId);
      return true;

    case "getScreenshot":
      sendResponse({ dataUrl: _pendingScreenshot || null });
      _pendingScreenshot = null;
      return true;
  }
});

// In-memory screenshot store
let _pendingScreenshot = null;

function handleScreenshot(sendResponse, windowId) {
  const doCapture = (wid) => {
    chrome.tabs.captureVisibleTab(wid, { format: 'png' }, dataUrl => {
      if (chrome.runtime.lastError || !dataUrl) {
        console.error('Screenshot error:', chrome.runtime.lastError?.message);
        sendResponse && sendResponse({ error: chrome.runtime.lastError?.message || 'capture failed' });
        return;
      }
      _pendingScreenshot = dataUrl;
      chrome.tabs.create({ url: chrome.runtime.getURL('screenshot.html') }, () => {
        sendResponse && sendResponse({ ok: true });
      });
    });
  };

  if (windowId) {
    doCapture(windowId);
  } else {
    chrome.windows.getLastFocused({}, w => doCapture(w.id));
  }
}

// ============================================================
// ALARM HANDLERS
// ============================================================
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "focusAlarm") {
    chrome.notifications.create({
      type: "basic", iconUrl: "icon48.png",
      title: "🍅 Focus Session Complete!",
      message: "Great work! Take a short break — you earned it.",
      priority: 2
    });
    chrome.storage.local.set({ focusActive: false, focusEndTime: null });
  }

  if (alarm.name === "userAlarm") {
    chrome.storage.local.get("alarmLabel", d => {
      chrome.notifications.create({
        type: "basic", iconUrl: "icon48.png",
        title: `⏰ ${d.alarmLabel || "Timer"} — Time's Up!`,
        message: "Your alarm has gone off.",
        priority: 2
      });
    });
    chrome.storage.local.set({ alarmActive: false, alarmEndTime: null });
  }
});

// ============================================================
// CONTEXT MENUS
// ============================================================
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;

  if (info.menuItemId === "ez-block") {
    try {
      const domain = new URL(tab.url).hostname.replace(/^www\./, "");
      addBlockingRule(domain, () => {});
    } catch (_) {}
  }

  if (info.menuItemId === "ez-darkmode") {
    chrome.storage.local.get("darkModeEnabled", d => {
      const enabled = !d.darkModeEnabled;
      chrome.storage.local.set({ darkModeEnabled: enabled });
      toggleDarkMode(enabled, tab, () => {});
    });
  }

  if (info.menuItemId === "ez-screenshot") {
    // Use handleScreenshot so it opens the proper viewer with download/copy buttons
    handleScreenshot(null, tab.windowId);
  }
});

// ============================================================
// SITE BLOCKING
// ============================================================
function addBlockingRule(domain, sendResponse) {
  chrome.storage.local.get("blockedSites", data => {
    const sites = data.blockedSites || [];
    if (sites.find(s => s.domain === domain)) {
      sendResponse && sendResponse({ success: false, reason: "Already blocked" });
      return;
    }

    const usedIds = new Set(sites.map(s => s.ruleId));
    let ruleId = 10000;
    while (usedIds.has(ruleId)) ruleId++;

    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [{
        id: ruleId, priority: 2,
        action: { type: "block" },
        condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame"] }
      }],
      removeRuleIds: []
    }, () => {
      sites.push({ domain, ruleId });
      chrome.storage.local.set({ blockedSites: sites }, () =>
        sendResponse && sendResponse({ success: true, ruleId })
      );
    });
  });
}

function removeBlockingRule(domain, ruleId, sendResponse) {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId], addRules: []
  }, () => {
    chrome.storage.local.get("blockedSites", data => {
      const updated = (data.blockedSites || []).filter(s => s.domain !== domain);
      chrome.storage.local.set({ blockedSites: updated }, () =>
        sendResponse && sendResponse({ success: true })
      );
    });
  });
}

function checkIfBlocked(site, sendResponse) {
  chrome.storage.local.get("blockedSites", data => {
    const blocked = (data.blockedSites || []).some(s => site.includes(s.domain));
    sendResponse({ blocked });
  });
}

// ============================================================
// UNLOCK
// ============================================================
function unlockSite(domain, duration, sendResponse) {
  const expiry = Date.now() + duration * 60 * 1000;
  chrome.storage.local.get("blockedSites", data => {
    const match = (data.blockedSites || []).find(s => s.domain === domain);
    if (match) {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [match.ruleId], addRules: []
      });
    }
    chrome.storage.local.set({ [`unlock_${domain}`]: expiry }, () =>
      sendResponse && sendResponse({ success: true })
    );

    // Re-apply block rule after expiry
    setTimeout(() => {
      chrome.storage.local.get("blockedSites", d => {
        const s = (d.blockedSites || []).find(x => x.domain === domain);
        if (s) {
          chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [{
              id: s.ruleId, priority: 2,
              action: { type: "block" },
              condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame"] }
            }],
            removeRuleIds: []
          });
        }
        chrome.storage.local.remove(`unlock_${domain}`);
      });
    }, duration * 60 * 1000);
  });
  return true;
}

function isUnlocked(domain, sendResponse) {
  chrome.storage.local.get(`unlock_${domain}`, data => {
    const expiry = data[`unlock_${domain}`];
    sendResponse({ unlocked: !!(expiry && Date.now() < expiry) });
  });
}

// ============================================================
// FOCUS MODE
// ============================================================
function startFocus(minutes, sendResponse) {
  const mins = Math.max(parseFloat(minutes) || 25, 0.1); // minimum 0.1 min (6 sec)
  const endTime = Date.now() + mins * 60 * 1000;
  chrome.alarms.clear("focusAlarm", () => {
    chrome.alarms.create("focusAlarm", { delayInMinutes: mins });
    chrome.storage.local.set({
      focusActive: true,
      focusEndTime: endTime,
      focusDuration: mins,
      focusStartTime: Date.now()
    }, () => {
      try { sendResponse && sendResponse({ success: true, endTime }); } catch(_) {}
    });
  });
}

function stopFocus(sendResponse) {
  chrome.alarms.clear("focusAlarm", () => {
    chrome.storage.local.set({ focusActive: false, focusEndTime: null }, () =>
      sendResponse && sendResponse({ success: true })
    );
  });
}

function getFocusStatus(sendResponse) {
  chrome.storage.local.get(["focusActive","focusEndTime","focusDuration","focusStartTime"], d => {
    const now = Date.now();
    const active = !!(d.focusActive && d.focusEndTime && now < d.focusEndTime);
    sendResponse({
      active,
      endTime:   d.focusEndTime,
      startTime: d.focusStartTime,
      duration:  d.focusDuration,
      remaining: active ? Math.ceil((d.focusEndTime - now) / 1000) : 0
    });
  });
}

// ============================================================
// USER ALARM
// ============================================================
function setUserAlarm(minutes, label, sendResponse) {
  const mins = parseFloat(minutes);
  if (!mins || mins <= 0) { sendResponse && sendResponse({ success: false }); return; }
  const endTime = Date.now() + mins * 60 * 1000;
  chrome.alarms.clear("userAlarm", () => {
    chrome.alarms.create("userAlarm", { delayInMinutes: mins });
    chrome.storage.local.set({
      alarmActive: true, alarmEndTime: endTime, alarmLabel: label || "Timer"
    }, () => sendResponse && sendResponse({ success: true, endTime }));
  });
}

function clearUserAlarm(sendResponse) {
  chrome.alarms.clear("userAlarm", () => {
    chrome.storage.local.set({ alarmActive: false, alarmEndTime: null }, () =>
      sendResponse && sendResponse({ success: true })
    );
  });
}

function getAlarmStatus(sendResponse) {
  chrome.storage.local.get(["alarmActive","alarmEndTime","alarmLabel"], d => {
    const now = Date.now();
    const active = !!(d.alarmActive && d.alarmEndTime && now < d.alarmEndTime);
    sendResponse({
      active, endTime: d.alarmEndTime, label: d.alarmLabel,
      remaining: active ? Math.ceil((d.alarmEndTime - now) / 1000) : 0
    });
  });
}

// ============================================================
// AD BLOCKER
// ============================================================
function enableAdBlock(sendResponse) {
  // Write the enabled flag to storage FIRST — before any async operations.
  // If we write it after updateDynamicRules callback, the service worker may
  // be killed mid-flight and the flag never gets saved (toggle reverts to OFF).
  chrome.storage.local.set({ adBlockEnabled: true }, () => {
    chrome.declarativeNetRequest.getDynamicRules(existing => {
      const adIds = existing.map(r => r.id).filter(id => id < 1000);
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: adIds,
        addRules: AD_RULES
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Ad block enable error:", chrome.runtime.lastError.message);
          // Rules failed — revert the storage flag
          chrome.storage.local.set({ adBlockEnabled: false });
          sendResponse && sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse && sendResponse({ success: true });
      });
    });
  });
}

function disableAdBlock(sendResponse) {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: AD_RULES.map(r => r.id), addRules: []
  }, () => {
    chrome.storage.local.set({ adBlockEnabled: false }, () =>
      sendResponse && sendResponse({ success: true })
    );
  });
}

// ============================================================
// BLOCK STATS
// ============================================================
function incrementBlockStat(domain) {
  const today = new Date().toLocaleDateString();
  chrome.storage.local.get("blockStats", data => {
    let stats = data.blockStats;
    if (!stats || stats.date !== today) stats = { date: today, counts: {} };
    stats.counts[domain] = (stats.counts[domain] || 0) + 1;
    chrome.storage.local.set({ blockStats: stats });
  });
}

function getBlockStats(sendResponse) {
  const today = new Date().toLocaleDateString();
  chrome.storage.local.get("blockStats", data => {
    const stats = data.blockStats;
    sendResponse((!stats || stats.date !== today) ? { date: today, counts: {} } : stats);
  });
}

// ============================================================
// DARK MODE
// ============================================================
function toggleDarkMode(enabled, tab, sendResponse) {
  if (!tab || !tab.id) { sendResponse && sendResponse({ success: false }); return; }
  const css = `
    html { filter: invert(1) hue-rotate(180deg) !important; }
    img, video, iframe, canvas, picture, svg image {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;
  const op = enabled ? "insertCSS" : "removeCSS";
  chrome.scripting[op]({ target: { tabId: tab.id }, css }, () =>
    sendResponse && sendResponse({ success: true })
  );
}

// ============================================================
// SCREENSHOT
// ============================================================
function takeScreenshot(tab, sendResponse) {
  if (!tab || !tab.windowId) { sendResponse && sendResponse({ dataUrl: null }); return; }
  chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, dataUrl => {
    sendResponse({ dataUrl: dataUrl || null });
  });
}
