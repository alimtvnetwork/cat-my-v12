document.addEventListener("DOMContentLoaded", () => {
  const backendInput = document.getElementById("backendUrl");
  const saveBtn = document.getElementById("saveBtn");
  const openAppBtn = document.getElementById("openAppBtn");

  // Load current URL
  chrome.storage.local.get(["app.backend.baseUrl"], (result) => {
    if (result["app.backend.baseUrl"]) {
      backendInput.value = result["app.backend.baseUrl"];
    }
  });

  // Save URL
  saveBtn.addEventListener("click", () => {
    const newUrl = backendInput.value;
    chrome.storage.local.set({ "app.backend.baseUrl": newUrl }, () => {
      saveBtn.textContent = "Saved!";
      setTimeout(() => (saveBtn.textContent = "Save"), 1500);
    });
  });

  // Open App in 1440x900 window
  openAppBtn.addEventListener("click", () => {
    // We assume frontend is running on 5173 for default or read from somewhere
    const frontendUrl = "http://localhost:5173";
    chrome.windows.create({
      url: frontendUrl,
      width: 1440,
      height: 900,
      type: "popup",
    });
  });
});
