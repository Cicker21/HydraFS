const { invoke } = window.__TAURI__.core;

const pathInput = document.getElementById("path-input");
const passwordInput = document.getElementById("password-input");
const statusEl = document.getElementById("status");

const btnOpen = document.getElementById("btn-open");
const btnShow = document.getElementById("btn-show");
const btnEncrypt = document.getElementById("btn-encrypt");
const btnDecrypt = document.getElementById("btn-decrypt");

function getPath() {
  return (pathInput.value || "").trim();
}

function getPassword() {
  return (passwordInput.value || "").trim();
}

function hasHfsSuffix(path) {
  return path.toLowerCase().endsWith(".hfs");
}

function updateDecryptButtonState() {
  btnDecrypt.disabled = !hasHfsSuffix(getPath());
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "#5a6675";
}

async function withPathAndPassword(action) {
  const path = getPath();
  if (!path) {
    setStatus("Introduce una ruta valida.", true);
    return;
  }

  const password = getPassword();
  if (!password) {
    setStatus("Introduce una contrasena.", true);
    return;
  }

  try {
    const result = await action(path, password);
    if (typeof result === "string" && result.trim()) {
      pathInput.value = result.trim();
      updateDecryptButtonState();
    }
  } catch (error) {
    setStatus(String(error), true);
  }
}

async function withPath(action) {
  const path = getPath();
  if (!path) {
    setStatus("Introduce una ruta valida.", true);
    return;
  }

  try {
    await action(path);
  } catch (error) {
    setStatus(String(error), true);
  }
}

async function loadInitialPath() {
  try {
    const initialPath = await invoke("get_pending_open_path");
    if (initialPath) {
      pathInput.value = initialPath;
      setStatus("Ruta recibida desde el Explorador.");
      updateDecryptButtonState();
    }
  } catch (error) {
    setStatus(String(error), true);
  }
}

const DEFAULT_THEME_NAME = "Claro";
const DEFAULT_THEME = {
  bg_color: "#ffffff",
  surface_color: "#f8fafc",
  text_color: "#1f2937",
  muted_text_color: "#687482",
  border_color: "#e5e7eb",
  hover_color: "#f0f0f0",
  accent_color: "#0f766e",
  accent_ink: "#ffffff",
  icon_primary: "#0f766e",
  icon_secondary: "#667085",
  tooltip_bg: "#111827",
  tooltip_text: "#ffffff",
  danger_color: "#e81123",
  warning_color: "#f59e0b",
  success_color: "#22c55e",
  hfs_color: "#d97706",
  hfs_file_color: "#d97706",
  hfs_folder_color: "#d97706"
};

function themeKeyToVarName(key) {
  return `--${key.replace(/_/g, "-")}`;
}

function applyTheme(theme) {
  const normalized = { ...DEFAULT_THEME, ...(theme || {}) };
  Object.entries(normalized).forEach(([key, value]) => {
    document.documentElement.style.setProperty(themeKeyToVarName(key), value);
  });
  document.documentElement.style.setProperty("--bg", normalized.bg_color);
  document.documentElement.style.setProperty("--panel", normalized.surface_color);
  document.documentElement.style.setProperty("--ink", normalized.text_color);
  document.documentElement.style.setProperty("--subtle", normalized.muted_text_color);
  document.documentElement.style.setProperty("--line", normalized.border_color);
  document.documentElement.style.setProperty("--accent", normalized.accent_color);
  document.documentElement.style.setProperty("--hover", normalized.hover_color);
}

async function loadToolsTheme() {
  try {
    const savedSettings = await invoke("load_settings");
    const savedThemes = await invoke("load_themes");
    const themeName = savedSettings?.active_theme || DEFAULT_THEME_NAME;
    const themeCatalog = savedThemes?.themes || { [DEFAULT_THEME_NAME]: DEFAULT_THEME };
    const theme = themeCatalog[themeName] || themeCatalog[DEFAULT_THEME_NAME] || DEFAULT_THEME;
    applyTheme(theme);
  } catch (error) {
    console.warn("Tools theme load failed:", error);
    applyTheme(DEFAULT_THEME);
  }
}

btnOpen.addEventListener("click", async () => {
  await withPath(async (path) => {
    await invoke("open_item", { path });
    setStatus("Abierto con la aplicacion predeterminada.");
  });
});

btnShow.addEventListener("click", async () => {
  await withPath(async (path) => {
    await invoke("show_in_explorer", { path });
    setStatus("Mostrado en el Explorador.");
  });
});

btnEncrypt.addEventListener("click", async () => {
  await withPathAndPassword(async (path, password) => {
    const result = await invoke("encrypt_path", { path, password });
    setStatus("Elemento encriptado.");
    return result;
  });
});

btnDecrypt.addEventListener("click", async () => {
  if (btnDecrypt.disabled) {
    setStatus("Desencriptar solo funciona con elementos .hfs.", true);
    return;
  }

  await withPathAndPassword(async (path, password) => {
    const result = await invoke("decrypt_path", { path, password });
    setStatus("Elemento desencriptado.");
    return result;
  });
});

window.addEventListener("DOMContentLoaded", () => {
  loadToolsTheme();
  loadInitialPath();
  updateDecryptButtonState();

  pathInput.addEventListener("input", updateDecryptButtonState);

  try {
    if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
      window.__TAURI__.event.listen('hydrafs-opened-path', async (event) => {
        try {
          const payload = event.payload;
          if (payload) {
            await invoke("show_tools_window");
            pathInput.value = payload;
            setStatus("Ruta recibida desde el Explorador.");
            updateDecryptButtonState();
          }
        } catch (e) {
          // ignore
        }
      });
    }
  } catch (e) {
    // ignore if event API not available
  }
});
