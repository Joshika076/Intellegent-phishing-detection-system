document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('status-badge');
  const resultMessage = document.getElementById('result-message');
  const resultDisplay = document.getElementById('result-display');
  const urlText = document.getElementById('url-text');
  const checkUrlBtn = document.getElementById('check-url');
  const scanPageBtn = document.getElementById('scan-page');

  let isScanning = false;

  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    urlText.textContent = tab.url;

    // Instant check from cache
    chrome.storage.local.get(null, (allResults) => {
      const urlObj = new URL(tab.url);
      const normalizedUrl = (urlObj.origin + urlObj.pathname).replace(/\/$/, '');
      const data = allResults[normalizedUrl] || allResults[tab.url];

      if (data) {
        updateUI(data.is_phishing, data.message);
      } else {
        statusBadge.textContent = "Ready to Scan";
        statusBadge.className = "status-badge loading";
      }
    });
  }

  function updateUI(isPhishing, msg, confidence = null) {
    let displayMsg = msg;

    if (isPhishing) {
      statusBadge.textContent = "Phishing Detected";
      statusBadge.className = "status-badge phishing";
      resultDisplay.className = "result-text phishing";
      resultMessage.textContent = displayMsg || "Danger: Unsafe Website";
    } else if (confidence !== null && confidence > 0.15) {
      // Suspicious state
      statusBadge.textContent = "Suspicious Content";
      statusBadge.className = "status-badge phishing";
      statusBadge.style.backgroundColor = "#fff3cd";
      statusBadge.style.color = "#856404";
      resultDisplay.className = "result-text";
      resultMessage.textContent = displayMsg + " - Review carefully.";
    } else {
      statusBadge.textContent = "Safe Website";
      statusBadge.className = "status-badge safe";
      resultDisplay.className = "result-text safe";
      resultMessage.textContent = displayMsg || "Safe website";
    }
  }

  checkUrlBtn.addEventListener('click', async () => {
    if (!tab.url || isScanning) return;

    isScanning = true;
    checkUrlBtn.textContent = "Checking...";
    checkUrlBtn.disabled = true;

    statusBadge.textContent = "Processing...";
    statusBadge.className = "status-badge loading";

    try {
      const urlObj = new URL(tab.url);
      const normalizedUrl = (urlObj.origin + urlObj.pathname).replace(/\/$/, '');

      const response = await fetch('http://127.0.0.1:5000/predict_url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl })
      });
      const data = await response.json();
      updateUI(data.is_phishing, data.message);
      chrome.storage.local.set({ [normalizedUrl]: data });
    } catch (error) {
      statusBadge.textContent = "Error";
      resultMessage.textContent = "Server connection lost";
    } finally {
      isScanning = false;
      checkUrlBtn.textContent = "Check URL Safety";
      checkUrlBtn.disabled = false;
    }
  });

  scanPageBtn.addEventListener('click', async () => {
    if (isScanning) return;

    isScanning = true;
    scanPageBtn.textContent = "Scanning...";
    scanPageBtn.disabled = true;

    resultMessage.textContent = "Analyzing email content...";
    resultDisplay.className = "result-text";

    try {
      // Priority Extraction Logic
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 1. Try to get Gmail-specific body (div.a3s)
          const gmailBody = document.querySelector("div.a3s");
          if (gmailBody && gmailBody.innerText.trim().length > 10) {
            return { text: gmailBody.innerText, source: 'gmail' };
          }

          // 2. Try to get selected text
          const selectedText = window.getSelection().toString();
          if (selectedText && selectedText.trim().length > 10) {
            return { text: selectedText, source: 'selection' };
          }

          // 3. Fallback to body text but try to remove common noise
          const body = document.body.cloneNode(true);
          const removals = body.querySelectorAll('script, style, nav, footer, aside, .sidebar, .menu');
          removals.forEach(el => el.remove());

          return { text: body.innerText, source: 'page' };
        }
      });

      const { text, source } = result[0].result;

      if (!text || text.trim().length < 5) {
        resultMessage.textContent = "No text found. Open an email or select text.";
        return;
      }

      if (source === 'gmail') {
        resultMessage.textContent = "Gmail Content Detected. Scanning...";
      } else if (source === 'selection') {
        resultMessage.textContent = "Scanning selected text...";
      } else {
        resultMessage.textContent = "Scanning page text (For better results, select text or open a Gmail email).";
      }

      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 3000) })
      });

      const data = await response.json();

      // Map labels from data.message which now contains "Phishing", "Suspicious", or "Legitimate"
      if (data.is_phishing) {
        resultMessage.textContent = "PHISHING DETECTED!";
        resultDisplay.className = "result-text phishing";
        statusBadge.className = "status-badge phishing";
        statusBadge.textContent = "Unsafe Content";
      } else if (data.is_suspicious) {
        resultMessage.textContent = "SUSPICIOUS CONTENT DETECTED";
        resultDisplay.className = "result-text";
        resultDisplay.style.color = "#856404";
        statusBadge.className = "status-badge";
        statusBadge.style.backgroundColor = "#fff3cd";
        statusBadge.style.color = "#856404";
        statusBadge.textContent = "Use Caution";
      } else {
        resultMessage.textContent = "Legitimate Content";
        resultDisplay.className = "result-text safe";
        statusBadge.className = "status-badge safe";
        statusBadge.textContent = "Safe Content";
      }

      if (data.confidence !== undefined) {
        // Percentage removed for cleaner UI
      }
    } catch (error) {
      resultMessage.textContent = "Scan failed. Ensure backend is running.";
    } finally {
      isScanning = false;
      scanPageBtn.textContent = "Scan Page Text / Email";
      scanPageBtn.disabled = false;
    }
  });
});
