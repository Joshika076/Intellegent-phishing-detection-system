chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showWarning") {
    showPhishingWarning();
  } else if (request.action === "hideWarning") {
    hidePhishingWarning();
  }
});

function hidePhishingWarning() {
  const overlay = document.getElementById('phishing-detector-warning');
  if (overlay) {
    overlay.remove();
  }
}

function showPhishingWarning() {
  if (document.getElementById('phishing-detector-warning')) return;

  const overlay = document.createElement('div');
  overlay.id = 'phishing-detector-warning';
  overlay.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 500px;
        max-width: 90vw;
        background-color: #ff4d4d;
        color: white;
        padding: 25px;
        border-radius: 15px;
        z-index: 9999999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-family: 'Segoe UI', Arial, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 15px;
        animation: slideIn 0.5s ease-out;
    `;

  overlay.innerHTML = `
        <style>
            @keyframes slideIn { from { top: -200px; opacity: 0; } to { top: 20px; opacity: 1; } }
            .pd-header { display: flex; align-items: flex-start; gap: 15px; }
            .pd-icon { font-size: 24px; background: rgba(255,255,255,0.2); border-radius: 50%; padding: 5px 12px; }
            .pd-title { font-size: 20px; font-weight: 800; line-height: 1.2; margin: 0; }
            .pd-body { font-size: 16px; line-height: 1.5; opacity: 0.9; margin: 0; }
            .pd-footer { display: flex; justify-content: flex-end; }
            .pd-btn { 
                background: white; 
                color: #ff4d4d; 
                border: none; 
                padding: 10px 25px; 
                border-radius: 8px; 
                font-weight: 700; 
                cursor: pointer; 
                font-size: 16px;
                transition: transform 0.1s;
            }
            .pd-btn:active { transform: scale(0.95); }
        </style>
        <div class="pd-header">
            <div class="pd-icon">⚠</div>
            <h1 class="pd-title">PHISHING DETECTED: This site may be unsafe. Proceed with caution.</h1>
        </div>
        <p class="pd-body">The content on this page has been flagged by our Phishing Detector.</p>
        <div class="pd-footer">
            <button id="pd-dismiss" class="pd-btn">Dismiss</button>
        </div>
    `;

  document.body.appendChild(overlay);

  document.getElementById('pd-dismiss').onclick = () => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s';
    setTimeout(() => overlay.remove(), 300);
  };
}

function extractEmailText() {
  // Gmail email body container
  const emailBody = document.querySelector("div.a3s");

  if (!emailBody) {
    return "";
  }

  return emailBody.innerText;
}

console.log("Phishing Detection Content Script Loaded.");
