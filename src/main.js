const invoke = window.__TAURI__?.tauri?.invoke || window.__TAURI__?.core?.invoke;

function getCurrentWindow() {
  return (
    window.__TAURI__?.window?.appWindow ||
    window.__TAURI__?.window?.getCurrentWindow?.() ||
    window.__TAURI__?.window?.getCurrent?.()
  );
}

let fileGrid = document.getElementById("file-grid");
let sidebarDisks = document.getElementById("sidebar-disks");
let addressInput = document.getElementById("address-input");
let statusText = document.getElementById("status-text");
let breadcrumbPath = document.getElementById("breadcrumb-path");
let listHeader = document.getElementById("list-header");
let viewToggleBtn = document.getElementById("view-toggle-btn");
let viewToggleText = document.getElementById("view-toggle-text");
let navBackBtn = document.getElementById("nav-back-btn");
let navForwardBtn = document.getElementById("nav-forward-btn");
let navUpBtn = document.getElementById("nav-up-btn");
let navRefreshBtn = document.getElementById("nav-refresh-btn");
let explorerView = document.getElementById("explorer-view");
let passwordsView = document.getElementById("passwords-view");

// Activity bar buttons
let brandHomeBtn = document.getElementById("brand-home-btn");
let navExplorerBtn = document.getElementById("nav-explorer-btn");
let navPasswordsBtn = document.getElementById("nav-passwords-btn");
let brandSettingsBtn = document.getElementById("brand-settings-btn");
let brandPersonalizationBtn = document.getElementById("brand-personalization-btn");

// Password manager inputs/buttons
let passwordBackBtn = document.getElementById("password-back-btn");
let passwordNewBtn = document.getElementById("password-new-btn");
let passwordSaveBtn = document.getElementById("password-save-btn");
let passwordDeleteBtn = document.getElementById("password-delete-btn");
let passwordResetBtn = document.getElementById("password-reset-btn");
let passwordReloadBtn = document.getElementById("password-reload-btn");
let passwordList = document.getElementById("password-list");
let passwordCsvPath = document.getElementById("password-csv-path");
let passwordSettingsInfo = document.getElementById("password-settings-info");
let passwordServiceInput = document.getElementById("password-service");
let passwordUsernameInput = document.getElementById("password-username");
let passwordSecretInput = document.getElementById("password-secret");
let passwordNotesInput = document.getElementById("password-notes");
let passwordPreviewService = document.getElementById("password-preview-service");
let passwordPreviewUsername = document.getElementById("password-preview-username");
let passwordPreviewSecret = document.getElementById("password-preview-secret");
let passwordPreviewNotes = document.getElementById("password-preview-notes");
let passwordTabButtons = document.querySelectorAll("[data-password-tab]");
let passwordViewerPanel = document.getElementById("password-viewer-panel");
let passwordManagerPanel = document.getElementById("password-manager-panel");
let passwordMasterCurrentInput = document.getElementById("password-master-current");
let passwordMasterNewInput = document.getElementById("password-master-new");
let passwordSearchInput = document.getElementById("password-search-input");
let passwordSearchCaseToggle = document.getElementById("password-search-case-toggle");
let passwordApplyPasswordInput = document.getElementById("password-apply-password-input");
let passwordApplyPasswordBtn = document.getElementById("password-apply-password-btn");
let passwordApplyError = document.getElementById("password-apply-error");
let passwordTable = document.getElementById("password-table");

// Settings Modal inputs/buttons
let settingsModal = document.getElementById("settings-modal");
let personalizationModal = document.getElementById("personalization-modal");
let settingsCloseBtn = document.getElementById("settings-close-btn");
let personalizationCloseBtn = document.getElementById("personalization-close-btn");
let settingsCsvPath = document.getElementById("settings-csv-path");
let settingsResetColsBtn = document.getElementById("settings-reset-cols-btn");
let settingsLaunchToolsBtn = document.getElementById("settings-launch-tools-btn");
let settingsThemeSection = document.getElementById("theme-settings-section");
let settingsThemeSelect = document.getElementById("theme-select");
let settingsThemeNameInput = document.getElementById("theme-name-input");
let settingsThemeSaveBtn = document.getElementById("theme-save-btn");
let settingsThemeResetBtn = document.getElementById("theme-reset-btn");
let settingsThemeColorInputs = document.querySelectorAll("[data-theme-key]");
let settingsRgbToggle = document.getElementById("settings-rgb-toggle");
let settingsRgbSpeed = document.getElementById("settings-rgb-speed");
let settingsHighlightHfsFilesToggle = document.getElementById("settings-highlight-hfs-files");
let settingsHighlightHfsFoldersToggle = document.getElementById("settings-highlight-hfs-folders");
let rgbSpeedValue = document.getElementById("rgb-speed-value");
let windowMinimizeBtn = document.getElementById("window-minimize-btn");
let windowMaximizeBtn = document.getElementById("window-maximize-btn");
let windowCloseBtn = document.getElementById("window-close-btn");

let accentButtons = document.querySelectorAll(".accent-swatch");

let historyStack = [];
let forwardStack = [];
let currentPath = "";
let currentFiles = [];
let appView = "explorer";
let passwordTab = "manager";
let passwordEntries = [];
let selectedPasswordIndex = -1;
let passwordCsvLocation = "";
let passwordSearchQuery = "";
let passwordSearchCaseSensitive = false;
let passwordSchemaDraft = { headers: [], types: [], sampleRow: [] };
let passwordColumnWidths = [];
let viewMode = "grid"; 
let sortColumn = "name";
let sortDirection = "asc";
let selectedFile = null;

const ROOT_PATH = "This PC";
const ROOT_PATH_LABEL = "Este equipo";

const DEFAULT_WIDTHS = [300, 150, 150, 100];
const DEFAULT_VIEW = "grid";
const DEFAULT_THEME_NAME = "Claro";
const DEFAULT_DARK_THEME_NAME = "Oscuro";
const DEFAULT_THEME = {
  bg_color: "#ffffff",
  surface_color: "#f8fafc",
  text_color: "#1f2937",
  muted_text_color: "#687482",
  border_color: "#e5e7eb",
  sidebar_bg: "#f5f5f5",
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

const DEFAULT_DARK_THEME = {
  bg_color: "#18181b",
  surface_color: "#1f2937",
  text_color: "#f8fafc",
  muted_text_color: "#94a3b8",
  border_color: "#334155",
  sidebar_bg: "#202938",
  hover_color: "#263244",
  accent_color: "#4cc2ff",
  accent_ink: "#0f172a",
  icon_primary: "#4cc2ff",
  icon_secondary: "#cbd5e1",
  tooltip_bg: "#e2e8f0",
  tooltip_text: "#111827",
  danger_color: "#fb7185",
  warning_color: "#f59e0b",
  success_color: "#4ade80",
  hfs_color: "#fb923c",
  hfs_file_color: "#fb923c",
  hfs_folder_color: "#fb923c"
};

let config = {
  folders: {},
  global_column_widths: [...DEFAULT_WIDTHS],
  active_theme: DEFAULT_THEME_NAME,
  rgb_enabled: true,
  rgb_speed: 6,
  highlight_hfs_files: true,
  highlight_hfs_folders: true
};

let themeCatalog = { themes: { [DEFAULT_THEME_NAME]: { ...DEFAULT_THEME } } };
let currentThemeName = DEFAULT_THEME_NAME;
let currentTheme = { ...DEFAULT_THEME };

function normalizeTheme(theme) {
  const normalized = { ...DEFAULT_THEME, ...(theme || {}) };
  if (normalized.hfs_file_color === undefined) {
    normalized.hfs_file_color = normalized.hfs_color;
  }
  if (normalized.hfs_folder_color === undefined) {
    normalized.hfs_folder_color = normalized.hfs_color;
  }
  return normalized;
}

function themeKeyToVarName(key) {
  return `--${key.replace(/_/g, "-")}`;
}

function getThemeFromInputs() {
  const theme = {};
  settingsThemeColorInputs.forEach((input) => {
    const themeKey = input.getAttribute("data-theme-key");
    if (themeKey) {
      theme[themeKey] = input.value;
    }
  });
  return theme;
}

function applyTheme(theme) {
  currentTheme = normalizeTheme(theme);
  Object.entries(currentTheme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(themeKeyToVarName(key), value);
  });
  document.documentElement.style.setProperty("--accent-color", currentTheme.accent_color);
  document.documentElement.style.setProperty("--frame-accent", currentTheme.accent_color);
  document.documentElement.style.setProperty("--icon-primary", currentTheme.icon_primary || currentTheme.accent_color);
  document.documentElement.style.setProperty("--icon-secondary", currentTheme.icon_secondary);
  document.documentElement.style.setProperty("--accent-ink", currentTheme.accent_ink);

  accentButtons.forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-accent") === currentTheme.accent_color);
  });

  settingsThemeColorInputs.forEach((input) => {
    const themeKey = input.getAttribute("data-theme-key");
    if (themeKey && currentTheme[themeKey]) {
      input.value = currentTheme[themeKey];
    }
  });

  if (settingsThemeNameInput) {
    settingsThemeNameInput.value = currentThemeName;
  }
  if (settingsThemeSelect) {
    settingsThemeSelect.value = currentThemeName;
  }
}

function refreshThemeSelect() {
  if (!settingsThemeSelect) return;
  const names = Object.keys(themeCatalog?.themes || {}).sort((a, b) => a.localeCompare(b));
  settingsThemeSelect.innerHTML = "";
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    settingsThemeSelect.appendChild(option);
  });
  settingsThemeSelect.value = currentThemeName;
}

async function saveSettings() {
  await invoke("save_settings", { settings: config });
}

async function saveThemeCatalog() {
  await invoke("save_themes", { themes: themeCatalog });
}

async function loadAppConfig() {
  try {
    const savedSettings = await invoke("load_settings");
    const savedThemes = await invoke("load_themes");

    config = {
      folders: {},
      global_column_widths: [...DEFAULT_WIDTHS],
      active_theme: DEFAULT_THEME_NAME,
      rgb_enabled: true,
      rgb_speed: 6,
      ...(savedSettings || {})
    };

    if (!Array.isArray(config.global_column_widths) || config.global_column_widths.length < 4) {
      config.global_column_widths = [...DEFAULT_WIDTHS];
    }
    if (config.rgb_enabled === undefined) config.rgb_enabled = true;
    if (config.rgb_speed === undefined) config.rgb_speed = 6;
    if (config.highlight_hfs_files === undefined) config.highlight_hfs_files = true;
    if (config.highlight_hfs_folders === undefined) config.highlight_hfs_folders = true;

    const defaultThemes = {
      [DEFAULT_THEME_NAME]: { ...DEFAULT_THEME },
      [DEFAULT_DARK_THEME_NAME]: { ...DEFAULT_DARK_THEME }
    };
    themeCatalog = savedThemes && savedThemes.themes ? savedThemes : { themes: defaultThemes };
    if (!themeCatalog.themes[DEFAULT_THEME_NAME]) {
      themeCatalog.themes[DEFAULT_THEME_NAME] = { ...DEFAULT_THEME };
    }
    if (!themeCatalog.themes[DEFAULT_DARK_THEME_NAME]) {
      themeCatalog.themes[DEFAULT_DARK_THEME_NAME] = { ...DEFAULT_DARK_THEME };
    }
    if (!config.active_theme || !themeCatalog.themes[config.active_theme]) {
      config.active_theme = DEFAULT_THEME_NAME;
    }

    currentThemeName = config.active_theme;
    applyTheme(themeCatalog.themes[currentThemeName]);
    refreshThemeSelect();

    setRgbEnabled(config.rgb_enabled);
    setRgbSpeed(config.rgb_speed);
    if (settingsHighlightHfsFilesToggle) settingsHighlightHfsFilesToggle.checked = config.highlight_hfs_files;
    if (settingsHighlightHfsFoldersToggle) settingsHighlightHfsFoldersToggle.checked = config.highlight_hfs_folders;
    await saveSettings();
  } catch (e) { console.error("Load config error:", e); }
}

async function saveAppConfig() {
  try {
    await saveSettings();
  } catch (e) { console.error("Save config error:", e); }
}

function setFooterStatus(message) {
  statusText.textContent = message;
}

function sanitizeText(value) {
  return (value || "").toString().trim();
}

function normalizeInputPath(path) {
  return path === ROOT_PATH_LABEL ? ROOT_PATH : path;
}

function toDisplayPath(path) {
  return path === ROOT_PATH ? ROOT_PATH_LABEL : path;
}

function updatePasswordPreview() {
  passwordPreviewService.textContent = sanitizeText(passwordServiceInput.value) || "-";
  passwordPreviewUsername.textContent = sanitizeText(passwordUsernameInput.value) || "-";
  passwordPreviewSecret.textContent = sanitizeText(passwordSecretInput.value) || "-";
  passwordPreviewNotes.textContent = sanitizeText(passwordNotesInput.value) || "-";
}

function setAccent(color) {
  currentTheme.accent_color = color;
  currentTheme.icon_primary = color;
  applyTheme(currentTheme);
}

function setRgbEnabled(enabled) {
  config.rgb_enabled = enabled;
  if (settingsRgbToggle) {
    settingsRgbToggle.checked = enabled;
  }
  const brandButton = document.getElementById("brand-home-btn");
  if (brandButton) {
    if (enabled) {
      brandButton.classList.remove("rgb-disabled");
    } else {
      brandButton.classList.add("rgb-disabled");
    }
  }
  saveAppConfig();
}

function setRgbSpeed(speed) {
  config.rgb_speed = speed;
  if (settingsRgbSpeed) {
    settingsRgbSpeed.value = speed;
  }
  if (rgbSpeedValue) {
    rgbSpeedValue.textContent = `${speed}s`;
  }
  const brandButton = document.getElementById("brand-home-btn");
  if (brandButton) {
    brandButton.style.setProperty("--rgb-speed", `${speed}s`);
  }
  saveAppConfig();
}

function updatePasswordTabUI() {
  const passwordTabButtons = document.querySelectorAll("[data-password-tab]");
  passwordTabButtons.forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-password-tab") === passwordTab);
  });

  const panels = {
    manager: passwordViewerPanel,
    campos: document.getElementById("password-fields-panel"),
    generador: document.getElementById("password-generator-panel")
  };

  Object.entries(panels).forEach(([name, panel]) => {
    if (!panel) return;
    panel.classList.toggle("hidden", name !== passwordTab);
  });
}

function populatePasswordForm(entry, index) {
  selectedPasswordIndex = typeof index === "number" ? index : -1;
  passwordServiceInput.value = entry?.service || "";
  passwordUsernameInput.value = entry?.username || "";
  passwordSecretInput.value = entry?.password || "";
  passwordNotesInput.value = entry?.notes || "";
  updatePasswordPreview();

  passwordDeleteBtn.disabled = selectedPasswordIndex < 0;
}

function clearPasswordForm() {
  populatePasswordForm(null, -1);
}

function matchesPasswordSearch(entry) {
  if (!passwordSearchQuery) return true;
  const search = passwordSearchCaseSensitive ? passwordSearchQuery : passwordSearchQuery.toLowerCase();
  const values = [entry.service, entry.username, entry.password, entry.notes, entry.date].map((value) => {
    const text = String(value || "");
    return passwordSearchCaseSensitive ? text : text.toLowerCase();
  });
  return values.some((value) => value.includes(search));
}

function copyCellText(text, cell) {
  if (!text) return;
  const payload = text.toString();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(payload).catch(() => {});
  } else {
    const input = document.createElement("textarea");
    input.value = payload;
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  const rect = cell.getBoundingClientRect();
  const popup = document.createElement("div");
  popup.className = "cell-copy-popup";
  popup.textContent = "Copiado al portapapeles";
  popup.style.top = `${rect.top - 34}px`;
  popup.style.left = `${rect.left}px`;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.classList.add("visible");
  }, 10);
  setTimeout(() => {
    popup.remove();
  }, 1600);
}

function openPasswordEditor(entry, index) {
  populatePasswordForm(entry, index);
  if (passwordManagerPanel) {
    passwordManagerPanel.classList.remove("hidden");
    passwordManagerPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function normalizeHeader(header) {
  return String(header || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getPasswordValueByHeader(header, entry) {
  const normalized = normalizeHeader(header);
  if (["web", "service"].includes(normalized)) return entry.service || "";
  if (["mailtfno", "mail", "tfno", "notes", "notas"].includes(normalized)) return entry.notes || "";
  if (["usuario", "user", "username"].includes(normalized)) return entry.username || "";
  if (["contrasena", "contrasenia", "password", "pass", "pwd"].includes(normalized)) return entry.password || "";
  if (["fecha", "date"].includes(normalized)) return entry.date || "";
  return "";
}

function isPasswordHeader(header) {
  const normalized = normalizeHeader(header);
  return ["contrasena", "contrasenia", "password", "pass", "pwd"].includes(normalized);
}

function normalizePasswordColumnWidths(count) {
  while (passwordColumnWidths.length < count) {
    const index = passwordColumnWidths.length;
    if (index === 0) passwordColumnWidths.push(260);
    else if (index === 1) passwordColumnWidths.push(180);
    else if (index === 2) passwordColumnWidths.push(180);
    else if (index === count - 1) passwordColumnWidths.push(120);
    else passwordColumnWidths.push(150);
  }
  if (passwordColumnWidths.length > count) {
    passwordColumnWidths.length = count;
  }
}

function createPasswordHeaderResizer(th, index) {
  const resizer = document.createElement("div");
  resizer.className = "password-header-resizer";

  resizer.addEventListener("mousedown", (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = th.offsetWidth;

    function onMouseMove(moveEvent) {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + delta);
      passwordColumnWidths[index] = newWidth;
      th.style.width = `${newWidth}px`;
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
    }

    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  return resizer;
}

function renderPasswordTable() {
  if (!passwordTable) return;
  const thead = passwordTable.querySelector("thead");
  const tbody = passwordTable.querySelector("tbody");
  if (!tbody) return;

  const headers = passwordSchemaDraft.headers && passwordSchemaDraft.headers.length
    ? passwordSchemaDraft.headers
    : ["Servicio", "Usuario", "Contraseña", "Notas", "Fecha"];

  if (thead) {
    thead.innerHTML = "";
    const headerRow = document.createElement("tr");
    normalizePasswordColumnWidths(headers.length + 1);

    headers.forEach((header, index) => {
      const th = document.createElement("th");
      th.textContent = header || "";
      th.style.width = `${passwordColumnWidths[index]}px`;
      th.appendChild(createPasswordHeaderResizer(th, index));
      headerRow.appendChild(th);
    });
    const actionsTh = document.createElement("th");
    actionsTh.textContent = "Acciones";
    actionsTh.style.width = `${passwordColumnWidths[headers.length]}px`;
    actionsTh.appendChild(createPasswordHeaderResizer(actionsTh, headers.length));
    headerRow.appendChild(actionsTh);
    thead.appendChild(headerRow);
  }

  tbody.innerHTML = "";
  const visibleEntries = passwordEntries.filter(matchesPasswordSearch);
  if (!visibleEntries.length) {
    const row = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = headers.length + 1;
    emptyCell.className = "password-table-empty";
    emptyCell.textContent = "No se encontraron coincidencias.";
    row.appendChild(emptyCell);
    tbody.appendChild(row);
    setFooterStatus("0 contraseñas visibles");
    return;
  }

  visibleEntries.forEach((entry) => {
    const row = document.createElement("tr");
    const actualIndex = passwordEntries.indexOf(entry);

    const addCell = (value, isPassword) => {
      const cell = document.createElement("td");
      if (isPassword) {
        const wrapper = document.createElement("div");
        wrapper.className = "password-cell";
        const input = document.createElement("input");
        input.type = "password";
        input.value = String(value || "");
        input.readOnly = true;
        input.className = "password-cell-input";
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "password-toggle-btn";
        toggle.textContent = "👁";
        toggle.addEventListener("click", () => {
          input.type = input.type === "password" ? "text" : "password";
          toggle.textContent = input.type === "password" ? "👁" : "🙈";
        });
        input.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          if (event.button === 2) {
            openPasswordEditor(entry, actualIndex);
          } else {
            copyCellText(input.value, cell);
          }
        });
        wrapper.appendChild(input);
        wrapper.appendChild(toggle);
        cell.appendChild(wrapper);
      } else {
        cell.textContent = String(value || "");
        cell.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          if (event.button === 2) {
            openPasswordEditor(entry, actualIndex);
          } else {
            copyCellText(cell.textContent, cell);
          }
        });
      }
      return cell;
    };

    headers.forEach((header) => {
      const value = getPasswordValueByHeader(header, entry);
      row.appendChild(addCell(value, isPasswordHeader(header)));
    });
    row.addEventListener("dblclick", (event) => {
      if (event.button === 2) {
        openPasswordEditor(entry, actualIndex);
      }
    });

    const actionsCell = document.createElement("td");
    actionsCell.className = "row-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "action-btn edit-btn";
    editBtn.textContent = "✎";
    editBtn.title = "Editar";
    editBtn.addEventListener("click", () => openPasswordEditor(entry, passwordEntries.indexOf(entry)));
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.textContent = "🗑";
    deleteBtn.title = "Eliminar";
    deleteBtn.addEventListener("click", async () => {
      if (confirm("¿Deseas eliminar esta fila?")) {
        const actualIndex = passwordEntries.indexOf(entry);
        if (actualIndex >= 0) {
          passwordEntries.splice(actualIndex, 1);
          await persistPasswordEntries();
          renderPasswordTable();
        }
      }
    });
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(deleteBtn);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  setFooterStatus(`${visibleEntries.length} contraseñas visibles`);
}

async function decryptPasswordValue(value) {
  try {
    const masterPassword = passwordMasterCurrentInput?.value || undefined;
    return await invoke("try_decrypt_password_value", { value, masterPassword });
  } catch (e) {
    throw new Error(e?.toString ? e.toString() : String(e));
  }
}

function isLikelyBase64(value) {
  return typeof value === "string" && /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0;
}

async function applyPasswordAttempt() {
  if (!passwordEntries.length) {
    passwordApplyError.textContent = "No hay contraseñas cargadas.";
    return;
  }

  const userValue = passwordApplyPasswordInput?.value.trim();
  const target = userValue || passwordEntries[0].password || "";
  if (!isLikelyBase64(target)) {
    passwordApplyError.textContent = "El valor seleccionado no parece estar cifrado.";
    return;
  }

  passwordApplyError.textContent = "";
  try {
    const decrypted = await decryptPasswordValue(target);
    if (!userValue) {
      passwordEntries[0].password = decrypted;
    }
    renderPasswordTable();
    passwordApplyError.textContent = "Contraseña descifrada correctamente.";
    passwordApplyError.classList.remove("error");
    passwordApplyError.classList.add("success");
  } catch (error) {
    passwordApplyError.textContent = String(error.message || error);
    passwordApplyError.classList.add("error");
    passwordApplyError.classList.remove("success");
  }
}

function renderPasswordEntries() {
  if (passwordList) {
    passwordList.innerHTML = "";

    if (!passwordEntries.length) {
      const empty = document.createElement("div");
      empty.className = "password-item";
      empty.innerHTML = "<strong>Sin entradas</strong><span>Añade la primera contraseña para empezar.</span>";
      passwordList.appendChild(empty);
      setFooterStatus("0 contraseñas");
      return;
    }

    passwordEntries.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "password-item" + (index === selectedPasswordIndex ? " active" : "");
      const title = document.createElement("strong");
      title.textContent = entry.service || "Sin nombre";
      const subtitle = document.createElement("span");
      subtitle.textContent = entry.username || "Sin usuario";
      item.appendChild(title);
      item.appendChild(subtitle);
      item.addEventListener("click", () => {
        populatePasswordForm(entry, index);
        renderPasswordEntries();
      });
      passwordList.appendChild(item);
    });
  }

  setFooterStatus(`${passwordEntries.length} contraseñas`);
}

async function loadPasswordEntries() {
  try {
    const masterPassword = passwordMasterCurrentInput?.value || undefined;
    const response = await invoke("load_password_entries", { masterPassword });
    passwordEntries = response.entries || [];
    passwordCsvLocation = await invoke("get_passwords_csv_path");
    passwordCsvPath.textContent = passwordCsvLocation;
    passwordSettingsInfo.textContent = passwordCsvLocation;

    try {
      const headers = await invoke("get_passwords_csv_headers");
      if (Array.isArray(headers) && headers.length) {
        passwordSchemaDraft.headers = headers.slice();
      }
    } catch (schemaError) {
      console.warn("No se pudo cargar los encabezados del CSV", schemaError);
    }

    if (passwordEntries.length) {
      populatePasswordForm(passwordEntries[0], 0);
    } else {
      clearPasswordForm();
    }

    renderPasswordEntries();
    renderPasswordTable();

    if (response.error) {
      setFooterStatus(String(response.error));
    }
  } catch (error) {
    passwordCsvPath.textContent = "No se pudo cargar el CSV";
    passwordSettingsInfo.textContent = String(error);
    setFooterStatus(String(error));
  }
}

async function persistPasswordEntries() {
  const masterPassword = passwordMasterCurrentInput?.value || undefined;
  await invoke("save_password_entries", { entries: passwordEntries, masterPassword });
  passwordCsvLocation = await invoke("get_passwords_csv_path");
  passwordCsvPath.textContent = passwordCsvLocation;
  passwordSettingsInfo.textContent = passwordCsvLocation;
  renderPasswordEntries();
  renderPasswordTable();
}

async function saveCurrentPasswordEntry() {
  const entry = {
    service: sanitizeText(passwordServiceInput.value),
    username: sanitizeText(passwordUsernameInput.value),
    password: sanitizeText(passwordSecretInput.value),
    notes: sanitizeText(passwordNotesInput.value)
  };

  if (!entry.service) {
    setFooterStatus("El servicio es obligatorio.");
    return;
  }

  if (selectedPasswordIndex >= 0 && selectedPasswordIndex < passwordEntries.length) {
    passwordEntries[selectedPasswordIndex] = entry;
  } else {
    passwordEntries.unshift(entry);
    selectedPasswordIndex = 0;
  }

  await persistPasswordEntries();
  populatePasswordForm(entry, selectedPasswordIndex);
  setFooterStatus("Contraseña guardada.");
}

async function deleteCurrentPasswordEntry() {
  if (selectedPasswordIndex < 0 || selectedPasswordIndex >= passwordEntries.length) return;

  passwordEntries.splice(selectedPasswordIndex, 1);
  await persistPasswordEntries();

  if (passwordEntries.length) {
    const nextIndex = Math.min(selectedPasswordIndex, passwordEntries.length - 1);
    populatePasswordForm(passwordEntries[nextIndex], nextIndex);
  } else {
    clearPasswordForm();
  }

  setFooterStatus("Entrada eliminada.");
}

function updateActivityBarActive(view) {
  if (navExplorerBtn) navExplorerBtn.classList.toggle("active", view === "explorer");
  if (navPasswordsBtn) navPasswordsBtn.classList.toggle("active", view === "passwords");
}

async function setAppView(view, tab = "manager") {
  appView = view;
  passwordTab = tab;

  if (explorerView) explorerView.classList.toggle("hidden", view !== "explorer");
  if (passwordsView) passwordsView.classList.toggle("hidden", view !== "passwords");
  updateActivityBarActive(view);

  if (view === "explorer") {
    updateNavButtons();
    setFooterStatus(`${currentFiles.length} elementos`);
    return;
  }

  updatePasswordTabUI();
  await loadPasswordEntries();
}

async function openPasswordsView(tab = "manager") {
  await setAppView("passwords", tab);
}

async function openExplorerView() {
  await setAppView("explorer");
}

function openSettingsModal() {
  if (!settingsModal) return;
  settingsModal.classList.remove("hidden");

  if (passwordCsvLocation) {
    if (settingsCsvPath) settingsCsvPath.textContent = passwordCsvLocation;
  } else {
    invoke("get_passwords_csv_path").then(path => {
      passwordCsvLocation = path;
      if (settingsCsvPath) settingsCsvPath.textContent = path;
    }).catch(err => {
      if (settingsCsvPath) settingsCsvPath.textContent = "Error al obtener la ruta";
    });
  }
}

function closeSettingsModal() {
  if (settingsModal) settingsModal.classList.add("hidden");
}

function openPersonalizationModal() {
  if (!personalizationModal) return;
  personalizationModal.classList.remove("hidden");
  refreshThemeSelect();
  if (settingsThemeSection) {
    settingsThemeSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function closePersonalizationModal() {
  if (personalizationModal) personalizationModal.classList.add("hidden");
}

async function minimizeAppWindow() {
  const currentWindow = getCurrentWindow();
  if (currentWindow?.minimize) {
    await currentWindow.minimize();
  } else {
    console.warn("Tauri currentWindow not available for minimize.");
  }
}

async function toggleAppWindowMaximize() {
  const currentWindow = getCurrentWindow();
  if (!currentWindow) {
    console.warn("Tauri currentWindow not available for maximize.");
    return;
  }
  if (currentWindow.toggleMaximize) {
    await currentWindow.toggleMaximize();
    return;
  }
  if (currentWindow.isMaximized && currentWindow.maximize && currentWindow.unmaximize) {
    const maximized = await currentWindow.isMaximized();
    if (maximized) await currentWindow.unmaximize();
    else await currentWindow.maximize();
  }
}

async function closeAppWindow() {
  const currentWindow = getCurrentWindow();
  if (currentWindow?.close) {
    await currentWindow.close();
  } else {
    console.warn("Tauri currentWindow not available for close.");
  }
}

function ensureFolderConfig(path) {
  if (!config.folders[path]) {
    config.folders[path] = { view_mode: DEFAULT_VIEW };
  }
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortColumn = column;
        sortDirection = "asc";
    }
    
    currentFiles.sort((a, b) => {
        // Keep directories at top regardless of sort (unless sorting by type)
        // This is a simple implementation, can be improved.
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        
        let valA = a[column];
        let valB = b[column];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });
    renderFiles(currentFiles, currentPath);
}

function applyConfigUI() {
  const folderCfg = config.folders[currentPath];
  if (!folderCfg) return;

  viewMode = folderCfg.view_mode;
  if (viewMode === "list") {
    viewToggleText.textContent = "Cuadricula";
    listHeader.style.display = "flex";
    fileGrid.classList.add("list-view");
  } else {
    viewToggleText.textContent = "Lista";
    listHeader.style.display = "none";
    fileGrid.classList.remove("list-view");
  }

  const ids = ["h-name", "h-modified_at", "h-kind", "h-size"];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.width = config.global_column_widths[i] + "px";
  });
  
  if (appView === "explorer") {
    renderFiles(currentFiles, currentPath);
  }
}

function initResizers() {
  const resizers = document.querySelectorAll(".resizer");
  resizers.forEach((resizer, i) => {
    resizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.pageX;
      const startWidth = config.global_column_widths[i];
      const onMouseMove = (evt) => {
        const diff = evt.pageX - startX;
        config.global_column_widths[i] = Math.max(50, startWidth + diff);
        applyConfigUI();
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        saveAppConfig();
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });
}

async function showContextMenu(e, file) {
    e.preventDefault();
    e.stopPropagation();
    selectedFile = file;
    
    // Use the native Windows context menu
    try {
        await invoke("show_native_context_menu", { path: file.path });
    } catch (err) {
        console.error("Failed to show native context menu:", err);
    }
}

async function handleMenuAction(action) {
    if (!selectedFile) return;
    const path = selectedFile.path;
    
    try {
        switch (action) {
            case "open":
            if (selectedFile.is_dir || currentPath === ROOT_PATH) loadDirectory(path);
                else await invoke("open_item", { path });
                break;
            case "open-with":
                // Standard default open for now
                await invoke("open_item", { path });
                break;
            case "copy-path":
                await navigator.clipboard.writeText(path);
                break;
            case "show-explorer":
                await invoke("show_in_explorer", { path });
                break;
            case "properties":
              alert(`Propiedades de ${selectedFile.name}\nRuta: ${path}\nTamano: ${formatSize(selectedFile.size)}\nTipo: ${selectedFile.kind}`);
                break;
        }
    } catch (e) { console.error("Menu action error:", e); }
}

async function loadDirectory(path, addToHistory = true) {
  if (!path) return;
  path = normalizeInputPath(path);
  let resolvedPath = path;
  let files = [];
  try {
    if (path === ROOT_PATH) {
      files = await invoke("get_disks");
      resolvedPath = ROOT_PATH;
    } else {
      if (["Desktop", "Documents", "Downloads", "Home"].includes(path)) {
        try { resolvedPath = await invoke("resolve_path", { name: path }); } 
        catch (e) { }
      }
      files = await invoke("read_directory", { path: resolvedPath });
    }
    if (addToHistory && currentPath && currentPath !== resolvedPath) {
      historyStack.push(currentPath);
      forwardStack = [];
    }
    currentPath = resolvedPath;
    currentFiles = files;
    ensureFolderConfig(currentPath);
    applyConfigUI();
    addressInput.value = toDisplayPath(resolvedPath);
    breadcrumbPath.textContent = toDisplayPath(resolvedPath);
    updateNavButtons();
    updateSidebarActive(path);
    if (appView === "explorer") {
      setFooterStatus(`${files.length} elementos`);
    }
  } catch (error) { alert("No se pudo cargar la carpeta: " + error); }
}

function renderFiles(files, path) {
  fileGrid.innerHTML = "";
  files.forEach(file => {
    const item = document.createElement("div");
    item.className = "file-item" + (viewMode === "list" ? " list-item" : "");
    const iconContainer = document.createElement("div");
    iconContainer.className = "file-icon";
      let color = "#ffd600";
    let svgPath = "";
    if (path === ROOT_PATH) {
       svgPath = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z";
         color = "#00e5ff";
    } else if (file.is_dir) {
      svgPath = "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z";
      if (file.name.toLowerCase().endsWith('.hfs') && config.highlight_hfs_folders) {
        color = currentTheme.hfs_folder_color || currentTheme.hfs_color;
        item.classList.add("hfs-folder");
      }
    } else {
      svgPath = "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z";
      color = currentTheme.icon_secondary || currentTheme.muted_text_color;
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'hfs' && config.highlight_hfs_files) {
        color = currentTheme.hfs_file_color || currentTheme.hfs_color;
        item.classList.add("hfs-file");
      } else if (['jpg', 'png', 'svg', 'gif', 'jpeg', 'webp'].includes(ext)) color = "#00e676";
      else if (['doc', 'docx'].includes(ext)) color = "#2979ff";
      else if (['xls', 'xlsx'].includes(ext)) color = "#00c853";
      else if (['ppt', 'pptx'].includes(ext)) color = "#ff3d00";
    }
    iconContainer.innerHTML = `<svg class="icon-large" viewBox="0 0 24 24" style="fill: ${color};"><path d="${svgPath}"/></svg>`;
    const nameLabel = document.createElement("div");
    nameLabel.className = "file-name";
    nameLabel.textContent = file.name;
    item.appendChild(iconContainer);
    item.appendChild(nameLabel);
    if (viewMode === "list") {
        nameLabel.style.width = config.global_column_widths[0] + "px";
        const metaContainer = document.createElement("div");
        metaContainer.className = "file-meta-container";
        metaContainer.innerHTML = `
            <div class="meta-cell" style="width: ${config.global_column_widths[1]}px">${file.modified_at}</div>
            <div class="meta-cell" style="width: ${config.global_column_widths[2]}px">${file.kind}</div>
            <div class="meta-cell" style="width: ${config.global_column_widths[3]}px">${file.is_dir ? "" : formatSize(file.size)}</div>
        `;
        item.appendChild(metaContainer);
    }
    item.addEventListener("click", (e) => {
      document.querySelectorAll(".file-item").forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
      selectedFile = file;
    });
    item.addEventListener("dblclick", () => {
      if (path === ROOT_PATH || file.is_dir) loadDirectory(file.path);
      else invoke("open_item", { path: file.path });
    });
    item.addEventListener("contextmenu", (e) => showContextMenu(e, file));
    fileGrid.appendChild(item);
  });
  if (appView === "explorer") {
    setFooterStatus(`${files.length} elementos`);
  }
}

async function initSidebar() {
  try {
    const disks = await invoke("get_disks");
    sidebarDisks.innerHTML = "";
    disks.forEach(disk => {
      const item = document.createElement("div");
      item.className = "sidebar-item";
      item.setAttribute("data-path", disk.path);
      item.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="fill: #00e5ff;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg> Disco local (${disk.name})`;
      item.addEventListener('click', () => loadDirectory(disk.path));
      sidebarDisks.appendChild(item);
    });
  } catch (error) { }
}

function updateSidebarActive(path) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        if (item.getAttribute('data-path') === path) item.classList.add('active');
        else item.classList.remove('active');
    });
}

function updateNavButtons() {
    if (navBackBtn) navBackBtn.style.opacity = historyStack.length > 0 ? "1" : "0.3";
    if (navForwardBtn) navForwardBtn.style.opacity = forwardStack.length > 0 ? "1" : "0.3";
}

// Global Event Listeners
if (navBackBtn) navBackBtn.addEventListener("click", () => { if (historyStack.length > 0) { forwardStack.push(currentPath); loadDirectory(historyStack.pop(), false); } });
if (navForwardBtn) navForwardBtn.addEventListener("click", () => { if (forwardStack.length > 0) { historyStack.push(currentPath); loadDirectory(forwardStack.pop(), false); } });
if (navUpBtn) navUpBtn.addEventListener("click", () => { 
  if (currentPath === ROOT_PATH) return;
  if (currentPath.includes('\\')) {
    const parts = currentPath.split('\\').filter(p => p !== "");
    if (parts.length > 1) { parts.pop(); let p = parts.join('\\'); if (p.endsWith(':')) p += '\\'; loadDirectory(p); }
    else loadDirectory(ROOT_PATH);
  } else loadDirectory(ROOT_PATH);
});
if (navRefreshBtn) navRefreshBtn.addEventListener("click", () => loadDirectory(currentPath, false));
addressInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loadDirectory(addressInput.value); });
viewToggleBtn.addEventListener("click", () => {
    const folderCfg = config.folders[currentPath];
    if (folderCfg) { folderCfg.view_mode = folderCfg.view_mode === "grid" ? "list" : "grid"; applyConfigUI(); saveAppConfig(); }
});
document.querySelectorAll('.header-cell.sortable').forEach(cell => { cell.addEventListener('click', (e) => { if (!e.target.classList.contains('resizer')) handleSort(cell.getAttribute('data-sort')); }); });
document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => handleMenuAction(item.getAttribute("data-action")));
});

window.addEventListener("DOMContentLoaded", () => {
  loadAppConfig().then(() => {
    initSidebar();
    
    // Initialize static sidebar items
    document.querySelectorAll('.sidebar-item[data-path]').forEach(item => {
        // Skip dynamically added disk items which already have listeners
        if (item.parentElement.id !== 'sidebar-disks') {
            item.addEventListener('click', () => {
                const path = item.getAttribute('data-path');
                loadDirectory(path);
            });
        }
    });
    
    initResizers();
    loadDirectory(ROOT_PATH);
    updatePasswordTabUI();
    setFooterStatus("0 elementos");

    // Brand button alternates between explorer and passwords view
    brandHomeBtn.addEventListener("click", async () => {
      if (appView === "explorer") {
        await openPasswordsView("manager");
      } else {
        await openExplorerView();
      }
    });

    // Nav buttons click listeners
    if (navExplorerBtn) {
      navExplorerBtn.addEventListener("click", () => openExplorerView());
    }
    if (navPasswordsBtn) {
      navPasswordsBtn.addEventListener("click", () => openPasswordsView("manager"));
    }

    if (windowMinimizeBtn) {
      windowMinimizeBtn.addEventListener("click", () => minimizeAppWindow());
    }
    if (windowMaximizeBtn) {
      windowMaximizeBtn.addEventListener("click", () => toggleAppWindowMaximize());
    }
    if (windowCloseBtn) {
      windowCloseBtn.addEventListener("click", () => closeAppWindow());
    }

    // Modal click listeners
    if (brandSettingsBtn) {
      brandSettingsBtn.addEventListener("click", () => openSettingsModal());
    }
    if (brandPersonalizationBtn) {
      brandPersonalizationBtn.addEventListener("click", () => openPersonalizationModal());
    }
    if (settingsCloseBtn) {
      settingsCloseBtn.addEventListener("click", () => closeSettingsModal());
    }
    if (personalizationCloseBtn) {
      personalizationCloseBtn.addEventListener("click", () => closePersonalizationModal());
    }
    if (settingsModal) {
      settingsModal.addEventListener("click", (e) => {
        if (e.target === settingsModal) closeSettingsModal();
      });
    }
    if (personalizationModal) {
      personalizationModal.addEventListener("click", (e) => {
        if (e.target === personalizationModal) closePersonalizationModal();
      });
    }

    // Reset columns width click
    if (settingsResetColsBtn) {
      settingsResetColsBtn.addEventListener("click", async () => {
        if (confirm("¿Restablecer el ancho de las columnas a sus valores predeterminados?")) {
          config.global_column_widths = [...DEFAULT_WIDTHS];
          applyConfigUI();
          await saveAppConfig();
          setFooterStatus("Columnas restablecidas.");
        }
      });
    }

    // Launch independent tool app
    if (settingsLaunchToolsBtn) {
      settingsLaunchToolsBtn.addEventListener("click", async () => {
        try {
          await invoke("launch_tools_app", { path: null });
          setFooterStatus("HydraFS Tools lanzado.");
          closeSettingsModal();
        } catch (e) {
          alert("Error al lanzar HydraFS Tools: " + e);
        }
      });
    }

    // RGB slider speed toggle
    if (settingsRgbToggle) {
      settingsRgbToggle.addEventListener("change", () => {
        setRgbEnabled(settingsRgbToggle.checked);
      });
    }
    if (settingsRgbSpeed) {
      settingsRgbSpeed.addEventListener("input", () => {
        setRgbSpeed(parseInt(settingsRgbSpeed.value));
      });
    }
    if (settingsHighlightHfsFilesToggle) {
      settingsHighlightHfsFilesToggle.addEventListener("change", async () => {
        config.highlight_hfs_files = settingsHighlightHfsFilesToggle.checked;
        await saveAppConfig();
        if (currentFiles) renderFiles(currentFiles, currentPath);
      });
    }
    if (settingsHighlightHfsFoldersToggle) {
      settingsHighlightHfsFoldersToggle.addEventListener("change", async () => {
        config.highlight_hfs_folders = settingsHighlightHfsFoldersToggle.checked;
        await saveAppConfig();
        if (currentFiles) renderFiles(currentFiles, currentPath);
      });
    }

    if (settingsThemeSelect) {
      settingsThemeSelect.addEventListener("change", () => {
        const themeName = settingsThemeSelect.value || DEFAULT_THEME_NAME;
        if (!themeCatalog.themes[themeName]) return;
        currentThemeName = themeName;
        config.active_theme = themeName;
        applyTheme(themeCatalog.themes[themeName]);
        saveAppConfig();
      });
    }

    if (settingsThemeNameInput) {
      settingsThemeNameInput.addEventListener("input", () => {
        currentThemeName = sanitizeText(settingsThemeNameInput.value) || DEFAULT_THEME_NAME;
        if (settingsThemeSelect) {
          settingsThemeSelect.value = currentThemeName;
        }
      });
    }

    settingsThemeColorInputs.forEach((input) => {
      input.addEventListener("input", () => {
        currentTheme = getThemeFromInputs();
        applyTheme(currentTheme);
      });
    });

    if (settingsThemeResetBtn) {
      settingsThemeResetBtn.addEventListener("click", () => {
        currentTheme = { ...DEFAULT_THEME };
        currentThemeName = DEFAULT_THEME_NAME;
        config.active_theme = DEFAULT_THEME_NAME;
        applyTheme(currentTheme);
      });
    }

    if (settingsThemeSaveBtn) {
      settingsThemeSaveBtn.addEventListener("click", async () => {
        const themeName = sanitizeText(settingsThemeNameInput?.value) || currentThemeName || DEFAULT_THEME_NAME;
        currentThemeName = themeName;
        config.active_theme = themeName;
        themeCatalog.themes[themeName] = getThemeFromInputs();
        applyTheme(themeCatalog.themes[themeName]);
        refreshThemeSelect();
        await saveThemeCatalog();
        await saveSettings();
        setFooterStatus(`Tema guardado: ${themeName}`);
      });
    }

    if (passwordBackBtn) {
      passwordBackBtn.addEventListener("click", () => openExplorerView());
    }
    if (passwordNewBtn) {
      passwordNewBtn.addEventListener("click", async () => {
        await openPasswordsView("manager");
        openPasswordEditor(null, -1);
      });
    }
    if (passwordSaveBtn) {
      passwordSaveBtn.addEventListener("click", async () => {
        await saveCurrentPasswordEntry();
        if (passwordManagerPanel) passwordManagerPanel.classList.add("hidden");
      });
    }
    if (passwordDeleteBtn) {
      passwordDeleteBtn.addEventListener("click", () => deleteCurrentPasswordEntry());
    }
    if (passwordResetBtn) {
      passwordResetBtn.addEventListener("click", () => clearPasswordForm());
    }
    if (passwordReloadBtn) {
      passwordReloadBtn.addEventListener("click", () => loadPasswordEntries());
    }

    if (passwordSearchInput) {
      passwordSearchInput.addEventListener("input", () => {
        passwordSearchQuery = passwordSearchInput.value;
        renderPasswordTable();
      });
    }
    if (passwordSearchCaseToggle) {
      passwordSearchCaseToggle.addEventListener("change", () => {
        passwordSearchCaseSensitive = passwordSearchCaseToggle.checked;
        renderPasswordTable();
      });
    }
    if (passwordApplyPasswordBtn) {
      passwordApplyPasswordBtn.addEventListener("click", () => applyPasswordAttempt());
    }
    if (passwordTable) {
      passwordTable.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });
    }

    if (passwordServiceInput) {
      passwordServiceInput.addEventListener("input", updatePasswordPreview);
    }
    if (passwordUsernameInput) {
      passwordUsernameInput.addEventListener("input", updatePasswordPreview);
    }
    if (passwordSecretInput) {
      passwordSecretInput.addEventListener("input", updatePasswordPreview);
    }
    if (passwordNotesInput) {
      passwordNotesInput.addEventListener("input", updatePasswordPreview);
    }

    const passwordTabButtons = document.querySelectorAll("[data-password-tab]");
    if (passwordTabButtons && passwordTabButtons.length) {
      passwordTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const tab = button.dataset.passwordTab || "manager";
          openPasswordsView(tab);
        });
      });
    }

    const passwordTabsContainer = document.querySelector(".passwords-tabs");
    if (passwordTabsContainer) {
      passwordTabsContainer.addEventListener("click", (event) => {
        const button = event.target.closest("[data-password-tab]");
        if (!button) return;
        const tab = button.dataset.passwordTab || "manager";
        openPasswordsView(tab);
      });
    }

    accentButtons.forEach((button) => {
      button.addEventListener("click", () => setAccent(button.getAttribute("data-accent") || "#0f766e"));
    });

    // Fields panel wiring
    const passwordFieldsList = document.getElementById("password-fields-list");
    const passwordFieldsPreview = document.getElementById("password-fields-preview-table");
    const passwordAddFieldBtn = document.getElementById("password-add-field-btn");
    const passwordResetFieldsBtn = document.getElementById("password-reset-fields-btn");
    const passwordApplyFieldsBtn = document.getElementById("password-apply-fields-btn");
    const passwordCancelFieldsBtn = document.getElementById("password-cancel-fields-btn");

    async function loadPasswordSchema() {
      try {
        const schema = await invoke("get_passwords_csv_schema");
        passwordSchemaDraft = {
          headers: Array.isArray(schema.headers) ? schema.headers.slice() : [],
          types: Array.isArray(schema.types) ? schema.types.slice() : [],
          sampleRow: Array.isArray(schema.sample_row) ? schema.sample_row.slice() : []
        };
        renderPasswordFieldsEditor();
        setFooterStatus("Esquema cargado.");
      } catch (e) {
        console.error("No se pudo cargar el esquema de campos", e);
        setFooterStatus("Error al cargar el esquema de campos.");
      }
    }

    function updateFieldDraft(index, key, value) {
      if (index < 0 || index >= passwordSchemaDraft.headers.length) return;
      if (key === "header") {
        passwordSchemaDraft.headers[index] = value;
      } else if (key === "type") {
        passwordSchemaDraft.types[index] = value;
      }
      renderPasswordFieldsEditor();
    }

    function moveField(index, delta) {
      const target = index + delta;
      if (target < 0 || target >= passwordSchemaDraft.headers.length) return;
      [passwordSchemaDraft.headers[index], passwordSchemaDraft.headers[target]] = [passwordSchemaDraft.headers[target], passwordSchemaDraft.headers[index]];
      [passwordSchemaDraft.types[index], passwordSchemaDraft.types[target]] = [passwordSchemaDraft.types[target], passwordSchemaDraft.types[index]];
      [passwordSchemaDraft.sampleRow[index], passwordSchemaDraft.sampleRow[target]] = [passwordSchemaDraft.sampleRow[target], passwordSchemaDraft.sampleRow[index]];
      renderPasswordFieldsEditor();
    }

    function deleteField(index) {
      if (index < 0 || index >= passwordSchemaDraft.headers.length) return;
      passwordSchemaDraft.headers.splice(index, 1);
      passwordSchemaDraft.types.splice(index, 1);
      passwordSchemaDraft.sampleRow.splice(index, 1);
      renderPasswordFieldsEditor();
    }

    function renderPasswordFieldsEditor() {
      if (!passwordFieldsList) return;
      passwordFieldsList.innerHTML = "";

      if (!passwordSchemaDraft.headers.length) {
        const empty = document.createElement("div");
        empty.className = "vault-help";
        empty.textContent = "No hay columnas en el esquema. Añade un nuevo campo para empezar.";
        passwordFieldsList.appendChild(empty);
        renderPasswordFieldsPreview();
        return;
      }

      passwordSchemaDraft.headers.forEach((header, index) => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "80px minmax(220px, 250px) 180px minmax(220px, 250px) 120px";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.padding = "10px";
        row.style.border = "1px solid var(--border-color)";
        row.style.borderRadius = "12px";

        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.flexDirection = "column";
        controls.style.gap = "6px";

        const moveUp = document.createElement("button");
        moveUp.type = "button";
        moveUp.className = "ghost-button";
        moveUp.textContent = "↑";
        moveUp.disabled = index === 0;
        moveUp.addEventListener("click", () => moveField(index, -1));

        const moveDown = document.createElement("button");
        moveDown.type = "button";
        moveDown.className = "ghost-button";
        moveDown.textContent = "↓";
        moveDown.disabled = index === passwordSchemaDraft.headers.length - 1;
        moveDown.addEventListener("click", () => moveField(index, 1));

        controls.appendChild(moveUp);
        controls.appendChild(moveDown);

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = header;
        nameInput.className = "vault-input";
        nameInput.style.resize = "horizontal";
        nameInput.style.overflow = "auto";
        nameInput.addEventListener("input", (e) => updateFieldDraft(index, "header", e.target.value));

        const typeSelect = document.createElement("select");
        typeSelect.className = "vault-input";
        typeSelect.style.minWidth = "140px";
        typeSelect.style.maxWidth = "180px";
        [
          { value: "false", label: "Texto" },
          { value: "true", label: "Cifrada" },
          { value: "date", label: "Fecha" }
        ].forEach((optionData) => {
          const option = document.createElement("option");
          option.value = optionData.value;
          option.textContent = optionData.label;
          option.selected = passwordSchemaDraft.types[index] === optionData.value;
          typeSelect.appendChild(option);
        });
        typeSelect.addEventListener("change", (e) => updateFieldDraft(index, "type", e.target.value));

        const previewCell = document.createElement("div");
        previewCell.style.padding = "10px";
        previewCell.style.background = "var(--sidebar-bg)";
        previewCell.style.borderRadius = "10px";
        previewCell.style.resize = "horizontal";
        previewCell.style.overflow = "auto";
        previewCell.style.minWidth = "220px";
        previewCell.textContent = passwordSchemaDraft.sampleRow[index] || "—";
        previewCell.title = "Valor de muestra para esta columna";

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "ghost-button";
        deleteBtn.textContent = "Eliminar";
        deleteBtn.style.width = "110px";
        deleteBtn.addEventListener("click", () => {
          if (confirm(`Eliminar la columna '${header}'?`)) {
            deleteField(index);
          }
        });

        row.appendChild(controls);
        row.appendChild(nameInput);
        row.appendChild(typeSelect);
        row.appendChild(previewCell);
        row.appendChild(deleteBtn);
        passwordFieldsList.appendChild(row);
      });

      renderPasswordFieldsPreview();
    }

    function renderPasswordFieldsPreview() {
      if (!passwordFieldsPreview) return;
      passwordFieldsPreview.innerHTML = "";

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.minWidth = "560px";

      const headerRow = document.createElement("tr");
      passwordSchemaDraft.headers.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header || "(sin nombre)";
        th.style.padding = "10px";
        th.style.borderBottom = "1px solid var(--border-color)";
        th.style.background = "var(--sidebar-bg)";
        headerRow.appendChild(th);
      });

      const typeRow = document.createElement("tr");
      passwordSchemaDraft.types.forEach((type) => {
        const td = document.createElement("td");
        td.textContent = type === "true" ? "Cifrada" : type === "date" ? "Fecha" : "Texto";
        td.style.padding = "10px";
        td.style.borderBottom = "1px solid var(--border-color)";
        td.style.background = "var(--bg-color)";
        typeRow.appendChild(td);
      });

      const sampleRow = document.createElement("tr");
      passwordSchemaDraft.sampleRow.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value || "—";
        td.style.padding = "10px";
        td.style.borderBottom = "1px solid var(--border-color)";
        sampleRow.appendChild(td);
      });

      table.appendChild(headerRow);
      table.appendChild(typeRow);
      table.appendChild(sampleRow);
      passwordFieldsPreview.appendChild(table);
    }

    function resetPasswordFieldsDraft() {
      loadPasswordSchema();
      setFooterStatus("Esquema restablecido.");
    }

    async function applyPasswordFieldChanges() {
      if (!passwordSchemaDraft.headers.length) {
        setFooterStatus("El esquema no contiene columnas.");
        return;
      }
      if (!confirm("¿Aplicar estos cambios al esquema del CSV?")) return;
      try {
        const oldMasterPassword = passwordMasterCurrentInput?.value || undefined;
        const newMasterPassword = passwordMasterNewInput?.value || undefined;
        await invoke("rewrite_passwords_csv_with_headers", {
          headers: passwordSchemaDraft.headers,
          types: passwordSchemaDraft.types,
          oldMasterPassword,
          newMasterPassword
        });
        await loadPasswordSchema();
        await loadPasswordEntries();
        setFooterStatus("Esquema aplicado correctamente.");
      } catch (err) {
        setFooterStatus("Error al aplicar cambios: " + err);
      }
    }

    if (passwordAddFieldBtn) {
      passwordAddFieldBtn.addEventListener("click", () => {
        const name = (prompt("Nombre del nuevo campo (ej. url, otp):") || "").trim();
        if (!name) return;
        if (passwordSchemaDraft.headers.includes(name)) {
          setFooterStatus("Ya existe un campo con ese nombre.");
          return;
        }
        passwordSchemaDraft.headers.push(name);
        passwordSchemaDraft.types.push("false");
        passwordSchemaDraft.sampleRow.push("");
        renderPasswordFieldsEditor();
        setFooterStatus(`Campo '${name}' añadido.`);
      });
    }

    if (passwordResetFieldsBtn) {
      passwordResetFieldsBtn.addEventListener("click", resetPasswordFieldsDraft);
    }

    if (passwordApplyFieldsBtn) {
      passwordApplyFieldsBtn.addEventListener("click", applyPasswordFieldChanges);
    }

    if (passwordCancelFieldsBtn) {
      passwordCancelFieldsBtn.addEventListener("click", () => {
        loadPasswordSchema();
        setFooterStatus("Cambios cancelados.");
      });
    }

    // Load schema when Campos panel is shown
    openPasswordsView = async function(tab = "manager") {
      await setAppView("passwords", tab);
      if (tab === "campos") await loadPasswordSchema();
    };

    // Generator wiring
    const genLength = document.getElementById("gen-length");
    const genUpper = document.getElementById("gen-upper");
    const genLower = document.getElementById("gen-lower");
    const genNumbers = document.getElementById("gen-numbers");
    const genSymbols = document.getElementById("gen-symbols");
    const genBtn = document.getElementById("gen-generate-btn");
    const genCopy = document.getElementById("gen-copy-btn");

    function generatePassword() {
      const length = Math.max(8, Math.min(64, parseInt(genLength.value || "16")));
      const upper = genUpper.checked;
      const lower = genLower.checked;
      const numbers = genNumbers.checked;
      const symbols = genSymbols.checked;
      const pools = [];
      if (upper) pools.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      if (lower) pools.push("abcdefghijklmnopqrstuvwxyz");
      if (numbers) pools.push("0123456789");
      if (symbols) pools.push("!@#$%^&*()-_=+[]{};:,.<>?/");
      if (!pools.length) pools.push("abcdefghijklmnopqrstuvwxyz");
      let pwd = "";
      for (let i = 0; i < length; i++) {
        const pool = pools[Math.floor(Math.random() * pools.length)];
        pwd += pool.charAt(Math.floor(Math.random() * pool.length));
      }
      return pwd;
    }

    if (genBtn) genBtn.addEventListener("click", () => {
      const pwd = generatePassword();
      if (passwordSecretInput) {
        passwordSecretInput.value = pwd;
        updatePasswordPreview();
      }
      setFooterStatus("Contraseña generada.");
    });

    if (genCopy) genCopy.addEventListener("click", () => {
      if (!passwordSecretInput) return;
      navigator.clipboard.writeText(passwordSecretInput.value || "");
      setFooterStatus("Contraseña copiada al portapapeles.");
    });
    
    // Auto-detect USB drives / disk changes
    setInterval(async () => {
        try {
            const disks = await invoke("get_disks");
            const currentDiskPaths = Array.from(sidebarDisks.children).map(c => c.getAttribute("data-path")).join(",");
            const newDiskPaths = disks.map(d => d.path).join(",");
            
            if (currentDiskPaths !== newDiskPaths) {
                // Update sidebar
                sidebarDisks.innerHTML = "";
                disks.forEach(disk => {
                    const item = document.createElement("div");
                    item.className = "sidebar-item";
                    item.setAttribute("data-path", disk.path);
                    item.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="fill: #00e5ff;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg> Disco local (${disk.name})`;
                    item.addEventListener('click', () => loadDirectory(disk.path));
                    sidebarDisks.appendChild(item);
                });
                updateSidebarActive(currentPath);
                
                // If currently viewing This PC, refresh the main view too
                if (currentPath === ROOT_PATH && appView === "explorer") {
                  loadDirectory(ROOT_PATH, false);
                }
            }
        } catch (e) {}
    }, 3000);
  });
});
