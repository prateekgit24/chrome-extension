const img    = document.getElementById('screenshot');
const status = document.getElementById('status');
const dlBtn  = document.getElementById('dlBtn');
const info   = document.getElementById('ssInfo');

function showImage(dataUrl) {
  img.src = dataUrl;
  dlBtn.href = dataUrl;
  img.style.display = 'block';
  status.style.display = 'none';
  img.onload = () => {
    info.textContent = `📸 Screenshot · ${img.naturalWidth}×${img.naturalHeight}px`;
  };
  document.getElementById('copyBtn').addEventListener('click', async () => {
    const copyBtn = document.getElementById('copyBtn');
    try {
      const r = await fetch(dataUrl);
      const blob = await r.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy Image'; }, 2000);
    } catch {
      copyBtn.textContent = '✗ Failed';
      setTimeout(() => { copyBtn.textContent = '📋 Copy Image'; }, 2000);
    }
  });
}

function showError(msg) {
  status.innerHTML = msg + '<br><span style="font-size:13px;color:#4b5563">Go to a webpage → click Extensive Z icon → click 📸</span>';
}

// Ask background for screenshot data (in-memory, no race condition)
chrome.runtime.sendMessage({ action: 'getScreenshot' }, res => {
  if (chrome.runtime.lastError) {
    showError('⚠️ Extension background not responding. Reload the extension.');
    return;
  }
  if (res && res.dataUrl) {
    showImage(res.dataUrl);
  } else {
    showError('⚠️ No screenshot data found.');
  }
});
