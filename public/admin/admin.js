document.addEventListener("DOMContentLoaded", () => {
  const PAL_KEYS = ["perry", "ping", "ola", "ty", "sky", "tobi", "iggy"];

  const adminKeyInput = document.getElementById("admin-key");
  const connectBtn = document.getElementById("connect-btn");
  const testBtn = document.getElementById("test-btn");
  const actualBtn = document.getElementById("actual-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const saveRandomKBtn = document.getElementById("save-random-k-btn");
  const saveStockBtn = document.getElementById("save-stock-btn");
  const randomKInput = document.getElementById("random-k");
  const stockGrid = document.getElementById("stock-grid");
  const status = document.getElementById("status");
  const summary = document.getElementById("summary");

  function getAdminKey() {
    return adminKeyInput.value.trim();
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "x-admin-key": getAdminKey(),
      ...(options.headers || {})
    };

    return fetch(path, {
      ...options,
      headers
    });
  }

  function renderStockInputs(stock = {}) {
    stockGrid.innerHTML = "";

    PAL_KEYS.forEach((key) => {
      const wrapper = document.createElement("div");
      wrapper.className = "stock-item";
      wrapper.innerHTML = `
        <strong>${key}</strong>
        <input type="number" min="0" value="${stock[key] ?? 0}" data-pal="${key}" />
      `;
      stockGrid.appendChild(wrapper);
    });
  }

  function readStockInputs() {
    const stock = {};
    const inputs = stockGrid.querySelectorAll("input[data-pal]");

    inputs.forEach((input) => {
      stock[input.dataset.pal] = Number(input.value || 0);
    });

    return stock;
  }

  function renderSummary(data) {
    summary.textContent = JSON.stringify(data, null, 2);

    if (typeof data.randomK === "number") {
      randomKInput.value = data.randomK;
    }

    if (data.stock) {
      renderStockInputs(data.stock);
    }
  }

  async function loadState() {
    try {
      setStatus("Loading state...");

      const response = await api("/api/admin/state", { method: "GET" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load state.");
      }

      renderSummary(data);
      setStatus("Connected.");
    } catch (error) {
      setStatus(error.message || "Unable to connect.");
    }
  }

  async function applyPreset(mode) {
    try {
      setStatus(`Applying ${mode} preset...`);

      const response = await api("/api/admin/preset", {
        method: "POST",
        body: JSON.stringify({ mode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to apply preset.");
      }

      renderSummary(data.state);
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message || "Unable to apply preset.");
    }
  }

  async function saveRandomK() {
    try {
      setStatus("Saving random-k...");

      const response = await api("/api/admin/random-k", {
        method: "POST",
        body: JSON.stringify({
          randomK: Number(randomKInput.value)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save random-k.");
      }

      renderSummary(data.state);
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message || "Unable to save random-k.");
    }
  }

  async function saveStock() {
    try {
      setStatus("Saving stock...");

      const response = await api("/api/admin/stocks", {
        method: "POST",
        body: JSON.stringify({
          stock: readStockInputs()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save stock.");
      }

      renderSummary(data.state);
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message || "Unable to save stock.");
    }
  }

  connectBtn.addEventListener("click", loadState);
  refreshBtn.addEventListener("click", loadState);
  testBtn.addEventListener("click", () => applyPreset("test"));
  actualBtn.addEventListener("click", () => applyPreset("actual"));
  saveRandomKBtn.addEventListener("click", saveRandomK);
  saveStockBtn.addEventListener("click", saveStock);

  renderStockInputs();
});