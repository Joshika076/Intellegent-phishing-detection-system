const cache = new Map();
const pendingRequests = new Set();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only trigger when the URL is actually present and has changed
    if (changeInfo.url) {
        checkUrl(changeInfo.url, tabId);
    } else if (changeInfo.status === 'loading' && tab.url) {
        // Fallback for initial load if URL didn't change (e.g. reload)
        checkUrl(tab.url, tabId);
    }
});

const whitelist = ['leetcode.com', 'google.com', 'github.com', 'stackoverflow.com', 'linkedin.com', 'amazon.com', 'microsoft.com'];

async function checkUrl(url, tabId) {
    if (!url || !url.startsWith('http') || url.includes('127.0.0.1')) return;

    try {
        const urlObj = new URL(url);
        // ✅ NORMALIZATION: Match backend by stripping trailing slash for root and path
        const normalizedUrl = (urlObj.origin + urlObj.pathname).replace(/\/$/, '');
        const domain = urlObj.hostname.toLowerCase();

        // 1. Whitelist Check (Instant Safe)
        if (whitelist.some(d => domain === d || domain.endsWith('.' + d))) {
            const safeData = { is_phishing: false, message: "Safe website" };
            cache.set(normalizedUrl, safeData);
            handleResult(safeData, tabId);
            return;
        }

        // 2. Instant Cache Check
        if (cache.has(normalizedUrl)) {
            handleResult(cache.get(normalizedUrl), tabId);
            return;
        }

        // 3. Persistent Storage Check
        chrome.storage.local.get([normalizedUrl], async (result) => {
            if (result[normalizedUrl]) {
                cache.set(normalizedUrl, result[normalizedUrl]);
                handleResult(result[normalizedUrl], tabId);
                return;
            }

            // 4. Prevent duplicate pending requests
            if (pendingRequests.has(normalizedUrl)) return;
            pendingRequests.add(normalizedUrl);

            // 5. API Check with Timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            try {
                const response = await fetch('http://127.0.0.1:5000/predict_url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: normalizedUrl }),
                    signal: controller.signal
                });

                clearTimeout(timeout);
                const data = await response.json();

                cache.set(normalizedUrl, data);
                chrome.storage.local.set({ [normalizedUrl]: data });
                handleResult(data, tabId);
            } catch (error) {
                console.warn('Network issue or timeout for:', normalizedUrl);
            } finally {
                pendingRequests.delete(normalizedUrl);
            }
        });
    } catch (e) {
        console.error('URL Parsing error:', e);
    }
}

function handleResult(data, tabId) {
    updateBadge(tabId, data.is_phishing);

    // Always send a message to content script to either show or hide warning
    chrome.tabs.sendMessage(tabId, {
        action: data.is_phishing ? "showWarning" : "hideWarning"
    }).catch(() => {
        // Retry once if content script isn't ready
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, {
                action: data.is_phishing ? "showWarning" : "hideWarning"
            }).catch(() => { });
        }, 1000);
    });
}

function updateBadge(tabId, isPhishing) {
    if (isPhishing) {
        chrome.action.setBadgeText({ text: 'WARN', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId: tabId });
    } else {
        chrome.action.setBadgeText({ text: 'SAFE', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tabId });
    }
}

// ✅ Initial Maintenance: Clear old inconsistent cache
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.clear(() => {
        console.log("Phishing Detector: Initial Cache Cleared for Sync.");
    });
});
