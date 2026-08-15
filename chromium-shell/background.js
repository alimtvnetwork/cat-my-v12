chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    try {
      const url = new URL(changeInfo.url);
      const backendParam = url.searchParams.get("backend");
      if (backendParam) {
        chrome.storage.local.set({ "app.backend.baseUrl": backendParam });
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  }
});
