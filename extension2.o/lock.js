// ============================================================
// EXTENSIVE Z v2.0 — lock.js
// ============================================================

const params     = new URLSearchParams(location.search);
const site       = params.get("site") || "unknown";
const siteNameEl = document.getElementById("siteName");
const passwordEl = document.getElementById("password");
const unlockBtn  = document.getElementById("unlockBtn");
const msgEl      = document.getElementById("msg");
const lockCard   = document.getElementById("lockCard");

let selectedMins = 15;

// ---- Display site name ----
siteNameEl.textContent = site;
document.title = `Locked: ${site} — Extensive Z`;

// ---- Load block stats for this site ----
chrome.runtime.sendMessage({ action: "getBlockStats" }, stats => {
  const count = stats?.counts?.[site];
  if (count) {
    document.getElementById("statsRow").style.display = "flex";
    document.getElementById("blockCount").textContent = count;
    document.getElementById("lockTime").textContent = "Today";
  }
});

// ---- Preset duration buttons ----
document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const mins = parseInt(btn.dataset.mins);
    selectedMins = mins;
    const customRow = document.getElementById("customRow");
    customRow.style.display = mins === 0 ? "flex" : "none";
    if (mins !== 0) document.getElementById("customMins").value = "";
  });
});

// ---- Unlock on Enter ----
passwordEl.addEventListener("keydown", e => {
  if (e.key === "Enter") attemptUnlock();
});

unlockBtn.addEventListener("click", attemptUnlock);

// ---- Auto-focus password input ----
window.addEventListener("load", () => passwordEl.focus());

// ---- Unlock logic ----
function attemptUnlock() {
  const password = passwordEl.value.trim();
  if (!password) {
    showError("Please enter your password.");
    return;
  }

  let duration = selectedMins;
  if (selectedMins === 0) {
    duration = parseInt(document.getElementById("customMins").value);
    if (!duration || duration <= 0 || duration > 1440) {
      showError("Enter a valid duration (1–1440 minutes).");
      return;
    }
  }

  unlockBtn.textContent = "Verifying...";
  unlockBtn.disabled = true;

  chrome.storage.local.get("masterPassword", data => {
    const saved = data.masterPassword || "1234";

    if (password !== saved) {
      showError("Incorrect password. Try again.");
      lockCard.classList.remove("animate-shake");
      void lockCard.offsetWidth; // force reflow
      lockCard.classList.add("animate-shake");
      passwordEl.value = "";
      passwordEl.focus();
      unlockBtn.textContent = "Unlock Site";
      unlockBtn.disabled = false;
      return;
    }

    chrome.runtime.sendMessage(
      { action: "unlockSite", site, duration },
      response => {
        if (response?.success) {
          msgEl.style.color = "var(--success)";
          msgEl.textContent = `✅ Unlocked for ${duration} minute${duration > 1 ? "s" : ""}. Redirecting…`;
          setTimeout(() => {
            window.location.href = `https://${site}`;
          }, 800);
        } else {
          showError("Failed to unlock. Please try again.");
          unlockBtn.textContent = "Unlock Site";
          unlockBtn.disabled = false;
        }
      }
    );
  });
}

function showError(text) {
  msgEl.style.color = "var(--danger)";
  msgEl.textContent = text;
  setTimeout(() => { msgEl.textContent = ""; }, 3500);
}
