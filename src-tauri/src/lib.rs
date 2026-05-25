use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chrono::{DateTime, Local};
use std::collections::HashMap;
use std::fs;
use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri_plugin_opener::OpenerExt;
use tauri::webview::WebviewWindowBuilder;
use tauri::{Emitter, Manager};
use pbkdf2::pbkdf2_hmac_array;
use rand::rngs::OsRng;
use rand::RngCore;
use sha2::Sha256;
use windows_sys::Win32::System::Threading::CreateMutexW;
use windows_sys::Win32::Foundation::{CloseHandle, ERROR_ALREADY_EXISTS, GetLastError};

#[derive(serde::Serialize)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified_at: String,
    kind: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct PasswordEntry {
    service: String,
    username: String,
    password: String,
    notes: String,
    #[serde(default)]
    date: String,
}

#[derive(serde::Serialize, Clone)]
struct PasswordCsvSchema {
    headers: Vec<String>,
    types: Vec<String>,
}

#[derive(serde::Serialize)]
struct PasswordEntriesResponse {
    entries: Vec<PasswordEntry>,
    error: Option<String>,
}

#[derive(serde::Serialize)]
struct PasswordSchemaResponse {
    headers: Vec<String>,
    types: Vec<String>,
    sample_row: Vec<String>,
}

#[tauri::command]
fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };

        let entry_path = entry.path();
        let metadata = entry.metadata().ok();

        let (size, modified_str, is_dir, kind) = if let Some(meta) = metadata {
            let is_dir = meta.is_dir();
            let size = if is_dir { 0 } else { meta.len() };
            let modified: DateTime<Local> = meta
                .modified()
                .map(DateTime::from)
                .unwrap_or_else(|_| DateTime::from(std::time::SystemTime::UNIX_EPOCH));
            let kind = if is_dir {
                "Folder".to_string()
            } else {
                entry_path
                    .extension()
                    .map(|ext| ext.to_string_lossy().to_string().to_uppercase())
                    .unwrap_or_else(|| "File".to_string())
            };
            (size, modified.format("%Y-%m-%d %H:%M").to_string(), is_dir, kind)
        } else {
            (0, String::new(), false, "File".to_string())
        };

        files.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            size,
            modified_at: modified_str,
            kind,
        });
    }

    files.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(files)
}

#[tauri::command]
fn resolve_path(name: String) -> Result<String, String> {
    match name.as_str() {
        "Desktop" => Ok(dirs::desktop_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()),
        "Documents" => Ok(dirs::document_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()),
        "Downloads" => Ok(dirs::download_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()),
        "Home" => Ok(dirs::home_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()),
        _ => Ok(name),
    }
}

#[tauri::command]
fn get_disks() -> Vec<FileEntry> {
    use sysinfo::Disks;
    let disks = Disks::new_with_refreshed_list();
    let mut disks_vec: Vec<FileEntry> = disks.iter().map(|disk| {
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        FileEntry {
            name: mount_point.clone(),
            path: mount_point,
            is_dir: true,
            size: disk.total_space(),
            modified_at: "".to_string(),
            kind: "Local Disk".to_string(),
        }
    }).collect();
    
    disks_vec.sort_by(|a, b| a.name.cmp(&b.name));
    disks_vec
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct FolderConfig {
    pub view_mode: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(default)]
pub struct AppSettings {
    pub folders: HashMap<String, FolderConfig>,
    pub global_column_widths: Vec<i32>,
    pub active_theme: String,
    pub rgb_enabled: bool,
    pub rgb_speed: u32,
    pub highlight_hfs_files: bool,
    pub highlight_hfs_folders: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            folders: HashMap::new(),
            global_column_widths: vec![300, 150, 150, 100],
            active_theme: "Claro".to_string(),
            rgb_enabled: true,
            rgb_speed: 6,
            highlight_hfs_files: true,
            highlight_hfs_folders: true,
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(default)]
pub struct ThemeDefinition {
    pub bg_color: String,
    pub surface_color: String,
    pub text_color: String,
    pub muted_text_color: String,
    pub border_color: String,
    pub sidebar_bg: String,
    pub hover_color: String,
    pub accent_color: String,
    pub accent_ink: String,
    pub icon_primary: String,
    pub icon_secondary: String,
    pub tooltip_bg: String,
    pub tooltip_text: String,
    pub danger_color: String,
    pub warning_color: String,
    pub success_color: String,
    pub hfs_color: String,
    pub hfs_file_color: String,
    pub hfs_folder_color: String,
}

impl Default for ThemeDefinition {
    fn default() -> Self {
        Self {
            bg_color: "#ffffff".to_string(),
            surface_color: "#f8fafc".to_string(),
            text_color: "#1f2937".to_string(),
            muted_text_color: "#687482".to_string(),
            border_color: "#e5e7eb".to_string(),
            sidebar_bg: "#f5f5f5".to_string(),
            hover_color: "#f0f0f0".to_string(),
            accent_color: "#0f766e".to_string(),
            accent_ink: "#ffffff".to_string(),
            icon_primary: "#0f766e".to_string(),
            icon_secondary: "#6b7280".to_string(),
            tooltip_bg: "#111827".to_string(),
            tooltip_text: "#ffffff".to_string(),
            danger_color: "#e81123".to_string(),
            warning_color: "#f59e0b".to_string(),
            success_color: "#22c55e".to_string(),
            hfs_color: "#d97706".to_string(),
            hfs_file_color: "#d97706".to_string(),
            hfs_folder_color: "#d97706".to_string(),
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(default)]
pub struct ThemeCatalog {
    pub themes: HashMap<String, ThemeDefinition>,
}

impl Default for ThemeCatalog {
    fn default() -> Self {
        let mut themes = HashMap::new();
        themes.insert("Claro".to_string(), ThemeDefinition::default());

        let mut dark = ThemeDefinition::default();
        dark.bg_color = "#18181b".to_string();
        dark.surface_color = "#1f2937".to_string();
        dark.text_color = "#f8fafc".to_string();
        dark.muted_text_color = "#94a3b8".to_string();
        dark.border_color = "#334155".to_string();
        dark.sidebar_bg = "#202938".to_string();
        dark.hover_color = "#263244".to_string();
        dark.accent_color = "#4cc2ff".to_string();
        dark.accent_ink = "#0f172a".to_string();
        dark.icon_primary = "#4cc2ff".to_string();
        dark.icon_secondary = "#cbd5e1".to_string();
        dark.tooltip_bg = "#e2e8f0".to_string();
        dark.tooltip_text = "#111827".to_string();
        dark.danger_color = "#fb7185".to_string();
        dark.warning_color = "#f59e0b".to_string();
        dark.success_color = "#4ade80".to_string();
        dark.hfs_color = "#fb923c".to_string();
        dark.hfs_file_color = "#fb923c".to_string();
        dark.hfs_folder_color = "#fb923c".to_string();
        themes.insert("Oscuro".to_string(), dark);

        Self { themes }
    }
}

fn default_settings() -> AppSettings {
    AppSettings::default()
}

fn default_theme_catalog() -> ThemeCatalog {
    ThemeCatalog::default()
}

fn settings_path(app: &tauri::AppHandle, state: AppMode) -> Result<PathBuf, String> {
    Ok(config_dir(app, state)?.join("settings.json"))
}

fn themes_path(app: &tauri::AppHandle, state: AppMode) -> Result<PathBuf, String> {
    Ok(config_dir(app, state)?.join("themes.json"))
}

fn legacy_config_path(app: &tauri::AppHandle, state: AppMode) -> Result<PathBuf, String> {
    Ok(config_dir(app, state)?.join("config.json"))
}

fn read_json_file<T>(path: &Path) -> Result<T, String>
where
    T: for<'de> serde::Deserialize<'de>,
{
    let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

fn write_json_file<T>(path: &Path, value: &T) -> Result<(), String>
where
    T: serde::Serialize,
{
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum AppMode {
    Main,
    Tools,
}

impl AppMode {
    fn label(self) -> &'static str {
        match self {
            AppMode::Main => "main",
            AppMode::Tools => "tools",
        }
    }

    fn mutex_suffix(self) -> &'static str {
        match self {
            AppMode::Main => "Main",
            AppMode::Tools => "Tools",
        }
    }

    fn pending_file_name(self) -> &'static str {
        match self {
            AppMode::Main => "pending_open_path_main.txt",
            AppMode::Tools => "pending_open_path_tools.txt",
        }
    }
}

struct LaunchState {
    mode: AppMode,
    pending_open_path: Arc<Mutex<Option<String>>>,
}

const HFS_MAGIC: &[u8; 8] = b"HYDRAHFS";
const HFS_VERSION: u16 = 1;
const HFS_SALT_LEN: usize = 16;
const HFS_NONCE_LEN: usize = 12;
const HFS_CHUNK_SIZE: usize = 1024 * 1024;
const HFS_PBKDF2_ITERS: u32 = 210_000;

struct HfsHeader {
    iterations: u32,
    salt: [u8; HFS_SALT_LEN],
    nonce_base: [u8; HFS_NONCE_LEN],
    chunk_size: u32,
}

fn path_name_string(path: &Path) -> Result<String, String> {
    path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .filter(|name| !name.trim().is_empty())
        .ok_or_else(|| "Path has no file name.".to_string())
}

fn is_hfs_path(path: &Path) -> bool {
    path.file_name()
        .map(|name| name.to_string_lossy().to_ascii_lowercase().ends_with(".hfs"))
        .unwrap_or(false)
}

fn append_hfs_suffix(path: &Path) -> Result<PathBuf, String> {
    let name = path_name_string(path)?;
    if name.to_ascii_lowercase().ends_with(".hfs") {
        return Err("Item is already encrypted.".to_string());
    }

    Ok(path.with_file_name(format!("{name}.hfs")))
}

fn strip_hfs_suffix(path: &Path) -> Result<PathBuf, String> {
    let name = path_name_string(path)?;
    let lower = name.to_ascii_lowercase();
    if !lower.ends_with(".hfs") {
        return Err("Item is not encrypted.".to_string());
    }

    let stripped = &name[..name.len() - 4];
    if stripped.trim().is_empty() {
        return Err("Invalid .hfs name.".to_string());
    }

    Ok(path.with_file_name(stripped))
}

fn make_temp_path(path: &Path, suffix: &str) -> Result<PathBuf, String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Path has no parent directory.".to_string())?;
    let name = path_name_string(path)?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let pid = std::process::id();

    for attempt in 0..1024u32 {
        let candidate = parent.join(format!("{name}.{suffix}.tmp.{pid}.{stamp}.{attempt}"));
        if !candidate.exists() {
            return Ok(candidate);
        }
    }

    Err("Could not allocate a temporary path.".to_string())
}

fn cleanup_path(path: &Path) {
    if !path.exists() {
        return;
    }

    let _ = if path.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    };
}

fn derive_cipher(
    password: &str,
    salt: &[u8; HFS_SALT_LEN],
    iterations: u32,
) -> Result<Aes256Gcm, String> {
    let key = pbkdf2_hmac_array::<Sha256, 32>(password.as_bytes(), salt, iterations);
    Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())
}

fn chunk_nonce(base: &[u8; HFS_NONCE_LEN], index: u64) -> [u8; HFS_NONCE_LEN] {
    let mut nonce = *base;
    let mut counter_bytes = [0u8; 8];
    counter_bytes.copy_from_slice(&nonce[4..12]);
    let counter = u64::from_be_bytes(counter_bytes).wrapping_add(index);
    nonce[4..12].copy_from_slice(&counter.to_be_bytes());
    nonce
}

fn write_header(writer: &mut BufWriter<File>, header: &HfsHeader) -> Result<(), String> {
    writer.write_all(HFS_MAGIC).map_err(|e| e.to_string())?;
    writer
        .write_all(&HFS_VERSION.to_le_bytes())
        .map_err(|e| e.to_string())?;
    writer
        .write_all(&header.iterations.to_le_bytes())
        .map_err(|e| e.to_string())?;
    writer
        .write_all(&(HFS_SALT_LEN as u16).to_le_bytes())
        .map_err(|e| e.to_string())?;
    writer
        .write_all(&(HFS_NONCE_LEN as u16).to_le_bytes())
        .map_err(|e| e.to_string())?;
    writer
        .write_all(&header.chunk_size.to_le_bytes())
        .map_err(|e| e.to_string())?;
    writer.write_all(&header.salt).map_err(|e| e.to_string())?;
    writer
        .write_all(&header.nonce_base)
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn read_header(reader: &mut BufReader<File>) -> Result<HfsHeader, String> {
    let mut magic = [0u8; 8];
    reader.read_exact(&mut magic).map_err(|e| e.to_string())?;
    if &magic != HFS_MAGIC {
        return Err("Invalid .hfs header.".to_string());
    }

    let mut version_buf = [0u8; 2];
    reader.read_exact(&mut version_buf).map_err(|e| e.to_string())?;
    let version = u16::from_le_bytes(version_buf);
    if version != HFS_VERSION {
        return Err(format!("Unsupported .hfs version: {version}"));
    }

    let mut iter_buf = [0u8; 4];
    reader.read_exact(&mut iter_buf).map_err(|e| e.to_string())?;
    let iterations = u32::from_le_bytes(iter_buf);
    if iterations == 0 {
        return Err("Invalid PBKDF2 iteration count.".to_string());
    }

    let mut salt_len_buf = [0u8; 2];
    reader.read_exact(&mut salt_len_buf).map_err(|e| e.to_string())?;
    let salt_len = u16::from_le_bytes(salt_len_buf) as usize;
    if salt_len != HFS_SALT_LEN {
        return Err("Unexpected salt size in .hfs header.".to_string());
    }

    let mut nonce_len_buf = [0u8; 2];
    reader.read_exact(&mut nonce_len_buf).map_err(|e| e.to_string())?;
    let nonce_len = u16::from_le_bytes(nonce_len_buf) as usize;
    if nonce_len != HFS_NONCE_LEN {
        return Err("Unexpected nonce size in .hfs header.".to_string());
    }

    let mut chunk_size_buf = [0u8; 4];
    reader.read_exact(&mut chunk_size_buf).map_err(|e| e.to_string())?;
    let chunk_size = u32::from_le_bytes(chunk_size_buf);
    if chunk_size == 0 {
        return Err("Invalid chunk size in .hfs header.".to_string());
    }

    let mut salt = [0u8; HFS_SALT_LEN];
    reader.read_exact(&mut salt).map_err(|e| e.to_string())?;

    let mut nonce_base = [0u8; HFS_NONCE_LEN];
    reader.read_exact(&mut nonce_base).map_err(|e| e.to_string())?;

    Ok(HfsHeader {
        iterations,
        salt,
        nonce_base,
        chunk_size,
    })
}

fn encrypt_file_stream(source: &Path, target: &Path, password: &str) -> Result<(), String> {
    let source_file = File::open(source).map_err(|e| e.to_string())?;
    let target_file = File::create(target).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(source_file);
    let mut writer = BufWriter::new(target_file);

    let mut salt = [0u8; HFS_SALT_LEN];
    let mut nonce_base = [0u8; HFS_NONCE_LEN];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_base);

    let header = HfsHeader {
        iterations: HFS_PBKDF2_ITERS,
        salt,
        nonce_base,
        chunk_size: HFS_CHUNK_SIZE as u32,
    };
    let cipher = derive_cipher(password, &header.salt, header.iterations)?;
    write_header(&mut writer, &header)?;

    let mut buffer = vec![0u8; HFS_CHUNK_SIZE];
    let mut chunk_index = 0u64;

    loop {
        let read_bytes = reader.read(&mut buffer).map_err(|e| e.to_string())?;
        if read_bytes == 0 {
            break;
        }

        let nonce = chunk_nonce(&header.nonce_base, chunk_index);
        let aad = chunk_index.to_le_bytes();
        let ciphertext = cipher
            .encrypt(
                Nonce::from_slice(&nonce),
                Payload {
                    msg: &buffer[..read_bytes],
                    aad: &aad,
                },
            )
            .map_err(|e| e.to_string())?;

        let ciphertext_len = u32::try_from(ciphertext.len()).map_err(|_| "Encrypted chunk is too large.".to_string())?;
        writer
            .write_all(&ciphertext_len.to_le_bytes())
            .map_err(|e| e.to_string())?;
        writer.write_all(&ciphertext).map_err(|e| e.to_string())?;
        chunk_index = chunk_index.wrapping_add(1);
    }

    writer.flush().map_err(|e| e.to_string())?;
    let target_file = writer.into_inner().map_err(|e| e.into_error().to_string())?;
    target_file.sync_all().map_err(|e| e.to_string())?;
    Ok(())
}

fn decrypt_file_stream(source: &Path, target: &Path, password: &str) -> Result<(), String> {
    let source_file = File::open(source).map_err(|e| e.to_string())?;
    let target_file = File::create(target).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(source_file);
    let mut writer = BufWriter::new(target_file);

    let header = read_header(&mut reader)?;
    let cipher = derive_cipher(password, &header.salt, header.iterations)?;

    let mut chunk_index = 0u64;

    loop {
        let mut len_buf = [0u8; 4];
        match reader.read_exact(&mut len_buf) {
            Ok(()) => {}
            Err(err) if err.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(err) => return Err(err.to_string()),
        }

        let ciphertext_len = u32::from_le_bytes(len_buf) as usize;
        if ciphertext_len == 0 {
            return Err("Invalid ciphertext chunk length.".to_string());
        }

        let mut ciphertext = vec![0u8; ciphertext_len];
        reader.read_exact(&mut ciphertext).map_err(|e| e.to_string())?;

        let nonce = chunk_nonce(&header.nonce_base, chunk_index);
        let aad = chunk_index.to_le_bytes();
        let plaintext = cipher
            .decrypt(
                Nonce::from_slice(&nonce),
                Payload {
                    msg: &ciphertext,
                    aad: &aad,
                },
            )
            .map_err(|e| e.to_string())?;

        writer.write_all(&plaintext).map_err(|e| e.to_string())?;
        chunk_index = chunk_index.wrapping_add(1);
    }

    writer.flush().map_err(|e| e.to_string())?;
    let target_file = writer.into_inner().map_err(|e| e.into_error().to_string())?;
    target_file.sync_all().map_err(|e| e.to_string())?;
    Ok(())
}

fn encrypt_directory_tree(source: &Path, target: &Path, password: &str) -> Result<(), String> {
    fs::create_dir_all(target).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        entries.push(entry);
    }

    entries.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    for entry in entries {
        let entry_path = entry.path();
        let entry_name = entry.file_name().to_string_lossy().to_string();
        let destination = target.join(format!("{entry_name}.hfs"));
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        if metadata.is_dir() {
            encrypt_directory_tree(&entry_path, &destination, password)?;
        } else {
            encrypt_file_stream(&entry_path, &destination, password)?;
        }
    }

    Ok(())
}

fn decrypt_directory_tree(source: &Path, target: &Path, password: &str) -> Result<(), String> {
    fs::create_dir_all(target).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        entries.push(entry);
    }

    entries.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    for entry in entries {
        let entry_path = entry.path();
        let entry_name = entry.file_name().to_string_lossy().to_string();
        if !entry_name.to_ascii_lowercase().ends_with(".hfs") {
            return Err(format!("Encrypted item is missing .hfs suffix: {entry_name}"));
        }

        let destination_name = &entry_name[..entry_name.len() - 4];
        let destination = target.join(destination_name);
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        if metadata.is_dir() {
            decrypt_directory_tree(&entry_path, &destination, password)?;
        } else {
            decrypt_file_stream(&entry_path, &destination, password)?;
        }
    }

    Ok(())
}

#[tauri::command]
fn encrypt_path(path: String, password: String) -> Result<String, String> {
    let source = PathBuf::from(&path);
    let metadata = fs::metadata(&source).map_err(|e| e.to_string())?;

    if metadata.is_dir() {
        let final_path = append_hfs_suffix(&source)?;
        if final_path.exists() {
            return Err(format!("Target already exists: {}", final_path.to_string_lossy()));
        }

        let temp_path = make_temp_path(&final_path, "encrypt")?;
        cleanup_path(&temp_path);

        let result = (|| {
            encrypt_directory_tree(&source, &temp_path, &password)?;
            fs::rename(&temp_path, &final_path).map_err(|e| e.to_string())?;
            Ok::<(), String>(())
        })();

        if let Err(error) = result {
            cleanup_path(&temp_path);
            return Err(error);
        }

        let _ = fs::remove_dir_all(&source);
        return Ok(final_path.to_string_lossy().to_string());
    }

    if is_hfs_path(&source) {
        return Err("Item is already encrypted.".to_string());
    }

    let final_path = append_hfs_suffix(&source)?;
    if final_path.exists() {
        return Err(format!("Target already exists: {}", final_path.to_string_lossy()));
    }

    let temp_path = make_temp_path(&final_path, "encrypt")?;
    cleanup_path(&temp_path);

    let result = (|| {
        encrypt_file_stream(&source, &temp_path, &password)?;
        fs::rename(&temp_path, &final_path).map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })();

    if let Err(error) = result {
        cleanup_path(&temp_path);
        return Err(error);
    }

    let _ = fs::remove_file(&source);
    Ok(final_path.to_string_lossy().to_string())
}

#[tauri::command]
fn decrypt_path(path: String, password: String) -> Result<String, String> {
    let source = PathBuf::from(&path);
    let metadata = fs::metadata(&source).map_err(|e| e.to_string())?;

    if !is_hfs_path(&source) {
        return Err("Item is not encrypted.".to_string());
    }

    let final_path = strip_hfs_suffix(&source)?;
    if final_path.exists() {
        return Err(format!("Target already exists: {}", final_path.to_string_lossy()));
    }

    let temp_path = make_temp_path(&final_path, "decrypt")?;
    cleanup_path(&temp_path);

    let result = if metadata.is_dir() {
        (|| {
            decrypt_directory_tree(&source, &temp_path, &password)?;
            fs::rename(&temp_path, &final_path).map_err(|e| e.to_string())?;
            Ok::<(), String>(())
        })()
    } else {
        (|| {
            decrypt_file_stream(&source, &temp_path, &password)?;
            fs::rename(&temp_path, &final_path).map_err(|e| e.to_string())?;
            Ok::<(), String>(())
        })()
    };

    if let Err(error) = result {
        cleanup_path(&temp_path);
        return Err(error);
    }

    if metadata.is_dir() {
        let _ = fs::remove_dir_all(&source);
    } else {
        let _ = fs::remove_file(&source);
    }

    Ok(final_path.to_string_lossy().to_string())
}

fn parse_pending_open_path() -> Option<String> {
    let mut args = std::env::args().skip(1);

    while let Some(arg) = args.next() {
        if let Some(value) = arg.strip_prefix("--hydrafs-open=") {
            let trimmed = value.trim_matches('"').trim().to_string();
            if !trimmed.is_empty() {
                return Some(trimmed);
            }
        }

        if arg == "--hydrafs-open" {
            if let Some(value) = args.next() {
                let trimmed = value.trim_matches('"').trim().to_string();
                if !trimmed.is_empty() {
                    return Some(trimmed);
                }
            }
        }
    }

    None
}

fn pending_open_file(mode: AppMode) -> Option<PathBuf> {
    let mut data_dir = dirs::data_local_dir()?;
    data_dir.push("HydraFS");
    data_dir.push(mode.label());
    let _ = std::fs::create_dir_all(&data_dir);
    data_dir.push(mode.pending_file_name());
    Some(data_dir)
}

fn config_dir(app: &tauri::AppHandle, mode: AppMode) -> Result<PathBuf, String> {
    let mut path = app.path().app_config_dir().map_err(|e| e.to_string())?;
    path.push(mode.label());
    Ok(path)
}

fn password_store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("HydraFS");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push("passwords.csv");
    Ok(path)
}

const PASSWORD_CSV_HEADERS: [&str; 5] = ["Web", "Mail Tfno", "Usuario", "Contraseña", "Fecha"];
const PASSWORD_CSV_TYPES: [&str; 5] = ["false", "true", "true", "true", "date"];
const PASSWORD_KEY_FILE_MAGIC: &[u8; 4] = b"HFSK";
const PASSWORD_KEY_FILE_VERSION: u8 = 1;
const PASSWORD_KEY_FILE_HEADER_LEN: usize = 4 + 1 + 4 + HFS_SALT_LEN + HFS_NONCE_LEN;
const PASSWORD_KEY_PBKDF2_ITERS: u32 = 100_000;

fn password_store_key_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("HydraFS");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push("passwords.key");
    Ok(path)
}

fn current_date_string() -> String {
    Local::now().format("%d/%m/%Y").to_string()
}

fn save_password_key_raw(app: &tauri::AppHandle, key: &[u8; 32]) -> Result<(), String> {
    let key_path = password_store_key_path(app)?;
    fs::write(&key_path, key).map_err(|e| e.to_string())?;
    Ok(())
}

fn save_password_key_encrypted(app: &tauri::AppHandle, key: &[u8; 32], password: &str) -> Result<(), String> {
    let key_path = password_store_key_path(app)?;
    let mut salt = [0u8; HFS_SALT_LEN];
    let mut nonce = [0u8; HFS_NONCE_LEN];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce);

    let cipher = derive_cipher(password, &salt, PASSWORD_KEY_PBKDF2_ITERS)?;
    let ciphertext = cipher
        .encrypt(Nonce::from_slice(&nonce), key.as_ref())
        .map_err(|e| e.to_string())?;

    let mut payload = Vec::with_capacity(PASSWORD_KEY_FILE_HEADER_LEN + ciphertext.len());
    payload.extend_from_slice(PASSWORD_KEY_FILE_MAGIC);
    payload.push(PASSWORD_KEY_FILE_VERSION);
    payload.extend_from_slice(&PASSWORD_KEY_PBKDF2_ITERS.to_le_bytes());
    payload.extend_from_slice(&salt);
    payload.extend_from_slice(&nonce);
    payload.extend_from_slice(&ciphertext);
    fs::write(&key_path, payload).map_err(|e| e.to_string())?;
    Ok(())
}

fn save_password_key(
    app: &tauri::AppHandle,
    key: &[u8; 32],
    password: Option<&str>,
) -> Result<(), String> {
    match password {
        Some(pass) if !pass.is_empty() => save_password_key_encrypted(app, key, pass),
        _ => save_password_key_raw(app, key),
    }
}

fn load_password_key_with_password(
    app: &tauri::AppHandle,
    password: Option<&str>,
) -> Result<[u8; 32], String> {
    let key_path = password_store_key_path(app)?;
    if !key_path.exists() {
        return Err("No se encontró el archivo de clave de contraseña. Restaure passwords.key o cree un nuevo almacén de contraseñas.".to_string());
    }

    let bytes = fs::read(&key_path).map_err(|e| e.to_string())?;
    if bytes.len() == 32 {
        if password.is_some() {
            return Err("La clave maestra actual no está protegida por contraseña.".to_string());
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&bytes);
        return Ok(key);
    }

    if bytes.len() < PASSWORD_KEY_FILE_HEADER_LEN {
        return Err("Invalid password key file.".to_string());
    }
    if &bytes[..4] != PASSWORD_KEY_FILE_MAGIC {
        return Err("Invalid password key file format.".to_string());
    }
    if bytes[4] != PASSWORD_KEY_FILE_VERSION {
        return Err("Unsupported password key version.".to_string());
    }

    let iterations = u32::from_le_bytes(bytes[5..9].try_into().map_err(|_| "Invalid password key file.".to_string())?);
    let mut salt = [0u8; HFS_SALT_LEN];
    salt.copy_from_slice(&bytes[9..25]);
    let mut nonce = [0u8; HFS_NONCE_LEN];
    nonce.copy_from_slice(&bytes[25..37]);
    let ciphertext = &bytes[37..];

    let password = password.ok_or_else(|| "La contraseña maestra actual es obligatoria para esta operación.".to_string())?;
    let cipher = derive_cipher(password, &salt, iterations)?;
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext)
        .map_err(|_| "Contraseña maestra incorrecta.".to_string())?;

    if plaintext.len() != 32 {
        return Err("Invalid decrypted password key.".to_string());
    }

    let mut key = [0u8; 32];
    key.copy_from_slice(&plaintext);
    Ok(key)
}

fn load_or_create_password_key(
    app: &tauri::AppHandle,
    password: Option<&str>,
) -> Result<[u8; 32], String> {
    let key_path = password_store_key_path(app)?;
    if key_path.exists() {
        return load_password_key_with_password(app, password);
    }

    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    save_password_key(app, &key, password)?;
    Ok(key)
}

fn encrypt_password_value(key: &[u8; 32], value: &str) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let mut nonce = [0u8; HFS_NONCE_LEN];
    OsRng.fill_bytes(&mut nonce);
    let ciphertext = cipher
        .encrypt(Nonce::from_slice(&nonce), value.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut payload = Vec::with_capacity(HFS_NONCE_LEN + ciphertext.len());
    payload.extend_from_slice(&nonce);
    payload.extend_from_slice(&ciphertext);
    Ok(BASE64_STANDARD.encode(payload))
}

fn decrypt_password_value(key: &[u8; 32], value: &str) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let decoded = BASE64_STANDARD.decode(value.as_bytes()).map_err(|e| e.to_string())?;
    if decoded.len() <= HFS_NONCE_LEN {
        return Err("Invalid encrypted field payload.".to_string());
    }

    let (nonce_bytes, ciphertext) = decoded.split_at(HFS_NONCE_LEN);
    let plaintext = cipher
        .decrypt(Nonce::from_slice(nonce_bytes), ciphertext)
        .map_err(|e| e.to_string())?;
    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

fn read_password_csv_rows(path: &Path) -> Result<Vec<Vec<String>>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .from_path(path)
        .map_err(|e| e.to_string())?;

    let mut rows: Vec<Vec<String>> = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;
        rows.push(record.iter().map(|s| s.to_string()).collect());
    }

    while rows.last().map(|row| row.iter().all(|field| field.trim().is_empty())).unwrap_or(false) {
        rows.pop();
    }

    Ok(rows)
}

fn write_password_csv_rows(path: &Path, rows: &[Vec<String>]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let temp = make_temp_path(path, "passwords")?;
    let mut writer = csv::WriterBuilder::new()
        .has_headers(false)
        .from_path(&temp)
        .map_err(|e| e.to_string())?;

    for row in rows {
        let refs: Vec<&str> = row.iter().map(|s| s.as_str()).collect();
        writer.write_record(refs).map_err(|e| e.to_string())?;
    }

    writer.flush().map_err(|e| e.to_string())?;
    fs::rename(&temp, path).map_err(|e| e.to_string())?;
    Ok(())
}

fn header_index(headers: &[String], candidates: &[&str], fallback: Option<usize>) -> Option<usize> {
    for candidate in candidates {
        if let Some((index, _)) = headers.iter().enumerate().find(|(_, header)| header.eq_ignore_ascii_case(candidate)) {
            return Some(index);
        }
    }
    fallback.filter(|index| *index < headers.len())
}

fn parse_column_type(value: Option<&String>) -> &'static str {
    match value.map(|text| text.trim().to_ascii_lowercase()) {
        Some(text) if text == "true" => "true",
        Some(text) if text == "date" => "date",
        _ => "false",
    }
}

fn is_valid_password_type_row(row: &[String]) -> bool {
    !row.is_empty() && row.iter().all(|cell| {
        let trimmed = cell.trim().to_ascii_lowercase();
        trimmed == "true" || trimmed == "false" || trimmed == "date"
    })
}

fn default_password_schema() -> PasswordCsvSchema {
    PasswordCsvSchema {
        headers: PASSWORD_CSV_HEADERS.iter().map(|value| value.to_string()).collect(),
        types: PASSWORD_CSV_TYPES.iter().map(|value| value.to_string()).collect(),
    }
}

fn read_password_schema(path: &Path) -> Result<PasswordCsvSchema, String> {
    let rows = read_password_csv_rows(path)?;
    if rows.is_empty() {
        return Ok(default_password_schema());
    }

    let headers = rows[0].clone();
    let types = if rows.len() >= 2 && is_valid_password_type_row(&rows[1]) {
        rows[1].clone()
    } else {
        vec!["false".to_string(); headers.len()]
    };

    Ok(PasswordCsvSchema { headers, types })
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, state: tauri::State<'_, LaunchState>, settings: AppSettings) -> Result<(), String> {
    let path = settings_path(&app, state.mode)?;
    write_json_file(&path, &settings)
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle, state: tauri::State<'_, LaunchState>) -> Result<AppSettings, String> {
    let path = settings_path(&app, state.mode)?;
    if let Ok(settings) = read_json_file::<AppSettings>(&path) {
        return Ok(settings);
    }

    let legacy_path = legacy_config_path(&app, state.mode)?;
    if let Ok(settings) = read_json_file::<AppSettings>(&legacy_path) {
        return Ok(settings);
    }

    Ok(default_settings())
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, state: tauri::State<'_, LaunchState>, config: AppSettings) -> Result<(), String> {
    save_settings(app, state, config)
}

#[tauri::command]
fn load_config(app: tauri::AppHandle, state: tauri::State<'_, LaunchState>) -> Result<AppSettings, String> {
    load_settings(app, state)
}

#[tauri::command]
fn save_themes(app: tauri::AppHandle, state: tauri::State<'_, LaunchState>, themes: ThemeCatalog) -> Result<(), String> {
    let path = themes_path(&app, state.mode)?;
    write_json_file(&path, &themes)
}

#[tauri::command]
fn load_themes(app: tauri::AppHandle, state: tauri::State<'_, LaunchState>) -> Result<ThemeCatalog, String> {
    let path = themes_path(&app, state.mode)?;
    if let Ok(themes) = read_json_file::<ThemeCatalog>(&path) {
        if !themes.themes.is_empty() {
            return Ok(themes);
        }
    }

    Ok(default_theme_catalog())
}

#[tauri::command]
fn get_passwords_csv_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(password_store_path(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
fn get_passwords_csv_headers(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let path = password_store_path(&app)?;
    if !path.exists() {
        return Ok(default_password_schema().headers);
    }

    Ok(read_password_schema(&path)?.headers)
}

#[tauri::command]
fn get_passwords_csv_schema(app: tauri::AppHandle) -> Result<PasswordSchemaResponse, String> {
    let path = password_store_path(&app)?;
    let schema = if path.exists() {
        read_password_schema(&path)?
    } else {
        default_password_schema()
    };

    let headers_len = schema.headers.len();
    let rows = read_password_csv_rows(&path).unwrap_or_default();
    let sample_row = if rows.len() > 2 && is_valid_password_type_row(&rows[1]) {
        rows[2].clone()
    } else if rows.len() > 1 {
        rows[1].clone()
    } else {
        vec![String::new(); headers_len]
    };

    Ok(PasswordSchemaResponse {
        headers: schema.headers,
        types: schema.types,
        sample_row: sample_row.into_iter().chain(std::iter::repeat(String::new())).take(headers_len).collect(),
    })
}

#[tauri::command]
fn rewrite_passwords_csv_with_headers(
    app: tauri::AppHandle,
    headers: Vec<String>,
    types: Vec<String>,
    old_master_password: Option<String>,
    new_master_password: Option<String>,
) -> Result<(), String> {
    let path = password_store_path(&app)?;
    let existing_rows = read_password_csv_rows(&path)?;
    let existing_schema = read_password_schema(&path)?;
    let old_headers = existing_schema.headers;
    let old_types = existing_schema.types;
    let data_start = if existing_rows.len() > 1 && is_valid_password_type_row(&existing_rows[1]) {
        2
    } else {
        1
    };
    let data_rows = if existing_rows.len() > data_start {
        existing_rows[data_start..].to_vec()
    } else {
        Vec::new()
    };

    let mut new_rows: Vec<Vec<String>> = Vec::new();
    new_rows.push(headers.clone());

    let mut new_types: Vec<String> = Vec::new();
    for (index, header) in headers.iter().enumerate() {
        if let Some(old_index) = old_headers.iter().position(|value| value == header) {
            new_types.push(types.get(index).cloned().unwrap_or_else(|| old_types.get(old_index).cloned().unwrap_or_else(|| "false".to_string())));
        } else if headers.len() == old_headers.len() {
            new_types.push(types.get(index).cloned().unwrap_or_else(|| old_types.get(index).cloned().unwrap_or_else(|| "false".to_string())));
        } else {
            new_types.push(types.get(index).cloned().unwrap_or_else(|| "false".to_string()));
        }
    }
    new_rows.push(new_types.clone());

    let had_encrypted_fields = old_types.iter().any(|t| t == "true");
    let will_have_encrypted_fields = new_types.iter().any(|t| t == "true");
    let key = if had_encrypted_fields || will_have_encrypted_fields {
        load_password_key_with_password(&app, old_master_password.as_deref())?
    } else if new_master_password.is_some() {
        load_or_create_password_key(&app, old_master_password.as_deref())?
    } else {
        [0u8; 32]
    };

    for row in data_rows.iter() {
        let mut remapped_row = Vec::new();
        for (index, header) in headers.iter().enumerate() {
            let value = if let Some(old_index) = old_headers.iter().position(|value| value == header) {
                row.get(old_index).cloned().unwrap_or_default()
            } else if headers.len() == old_headers.len() {
                row.get(index).cloned().unwrap_or_default()
            } else {
                String::new()
            };

            let old_type = old_headers
                .iter()
                .position(|value| value == header)
                .and_then(|idx| old_types.get(idx))
                .map(|t| t.as_str())
                .unwrap_or("false");
            let new_type = new_types.get(index).map(|t| t.as_str()).unwrap_or("false");

            let transformed_value = match (old_type, new_type) {
                ("true", "true") => value,
                ("true", _) => decrypt_password_value(&key, &value).unwrap_or(value),
                (_, "true") => encrypt_password_value(&key, &value)?,
                _ => value,
            };
            remapped_row.push(transformed_value);
        }
        new_rows.push(remapped_row);
    }

    write_password_csv_rows(&path, &new_rows)?;

    if let Some(new_password) = new_master_password.filter(|p| !p.is_empty()) {
        save_password_key(&app, &key, Some(new_password.as_str()))?;
    }

    Ok(())
}

#[tauri::command]
fn load_password_entries(
    app: tauri::AppHandle,
    master_password: Option<String>,
) -> Result<PasswordEntriesResponse, String> {
    let path = password_store_path(&app)?;
    if !path.exists() {
        return Ok(PasswordEntriesResponse {
            entries: Vec::new(),
            error: None,
        });
    }

    let records = read_password_csv_rows(&path)?;
    if records.is_empty() {
        return Ok(PasswordEntriesResponse {
            entries: Vec::new(),
            error: None,
        });
    }

    let has_type_row = records.len() > 1 && is_valid_password_type_row(&records[1]);
    let schema = read_password_schema(&path)?;
    let headers = &schema.headers;
    let types = &schema.types;
    let data_rows = if has_type_row {
        &records[2..]
    } else {
        &records[1..]
    };

    let idx_web = header_index(headers, &["Web", "service"], Some(0)).unwrap_or(0);
    let idx_mail = header_index(headers, &["Mail Tfno", "Mail", "Tfno", "notes"], Some(1)).unwrap_or(1.min(headers.len().saturating_sub(1)));
    let idx_user = header_index(headers, &["Usuario", "user", "username"], Some(2)).unwrap_or(2.min(headers.len().saturating_sub(1)));
    let idx_pass = header_index(headers, &["Contraseña", "password", "pass", "pwd"], Some(3)).unwrap_or(3.min(headers.len().saturating_sub(1)));
    let idx_date = header_index(headers, &["Fecha", "date"], Some(4)).unwrap_or(4.min(headers.len().saturating_sub(1)));

    let needs_key = types.iter().any(|t| t == "true");
    let (key, key_error) = if needs_key {
        match load_password_key_with_password(&app, master_password.as_deref()) {
            Ok(k) => (Some(k), None),
            Err(err) => (None, Some(err)),
        }
    } else {
        (None, None)
    };

    let mut entries: Vec<PasswordEntry> = Vec::new();
    for row in data_rows.iter() {
        let read_value = |index: usize| -> String {
            let raw = row.get(index).cloned().unwrap_or_default();
            match parse_column_type(types.get(index)) {
                "true" => key
                    .as_ref()
                    .map(|k| decrypt_password_value(k, &raw).unwrap_or(raw.clone()))
                    .unwrap_or(raw),
                _ => raw,
            }
        };
        entries.push(PasswordEntry {
            service: read_value(idx_web),
            notes: read_value(idx_mail),
            username: read_value(idx_user),
            password: read_value(idx_pass),
            date: row.get(idx_date).cloned().unwrap_or_default(),
        });
    }

    Ok(PasswordEntriesResponse {
        entries,
        error: key_error,
    })
}

#[tauri::command]
fn save_password_entries(
    app: tauri::AppHandle,
    entries: Vec<PasswordEntry>,
    master_password: Option<String>,
) -> Result<(), String> {
    let path = password_store_path(&app)?;
    let schema = read_password_schema(&path).unwrap_or_else(|_| default_password_schema());
    let needs_key = schema.types.iter().any(|t| t == "true");

    let mut rows: Vec<Vec<String>> = Vec::new();
    rows.push(schema.headers.clone());
    rows.push(schema.types.clone());
    let key = if needs_key {
        Some(load_or_create_password_key(&app, master_password.as_deref())?)
    } else {
        None
    };

    for entry in entries {
        let date = if entry.date.trim().is_empty() {
            current_date_string()
        } else {
            entry.date.trim().to_string()
        };
        let mut row = vec![String::new(); schema.headers.len()];
        let idx_web = header_index(&schema.headers, &["Web", "service"], Some(0)).unwrap_or(0);
        let idx_mail = header_index(&schema.headers, &["Mail", "Mail Tfno", "notes"], Some(1)).unwrap_or(1.min(schema.headers.len().saturating_sub(1)));
        let idx_user = header_index(&schema.headers, &["Usuario", "user", "username"], Some(2)).unwrap_or(2.min(schema.headers.len().saturating_sub(1)));
        let idx_pass = header_index(&schema.headers, &["Contraseña", "password", "pass", "pwd"], Some(3)).unwrap_or(3.min(schema.headers.len().saturating_sub(1)));
        let idx_date = header_index(&schema.headers, &["Fecha", "date"], Some(4)).unwrap_or(4.min(schema.headers.len().saturating_sub(1)));

        let field_values = [
            (idx_web, entry.service),
            (idx_mail, entry.notes),
            (idx_user, entry.username),
            (idx_pass, entry.password),
            (idx_date, date),
        ];

        for (index, value) in field_values {
            if index >= row.len() {
                continue;
            }
            row[index] = match parse_column_type(schema.types.get(index)) {
                "true" => key
                    .as_ref()
                    .map(|k| encrypt_password_value(k, &value))
                    .unwrap_or_else(|| Ok(value.clone()))?,
                "date" => current_date_string(),
                _ => value,
            };
        }

        rows.push(row);
    }

    write_password_csv_rows(&path, &rows)
}

#[tauri::command]
fn try_decrypt_password_value(
    app: tauri::AppHandle,
    value: String,
    master_password: Option<String>,
) -> Result<String, String> {
    let key = load_password_key_with_password(&app, master_password.as_deref())?;
    decrypt_password_value(&key, &value)
}

#[tauri::command]
fn get_pending_open_path(state: tauri::State<'_, LaunchState>) -> Option<String> {
    state
        .pending_open_path
        .lock()
        .ok()
        .and_then(|mut pending| pending.take())
}

#[tauri::command]
fn launch_tools_app(path: Option<String>) -> Result<(), String> {
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let tools_executable = executable.with_file_name("hydrafs_tools.exe");
    let target_executable = if tools_executable.exists() {
        tools_executable
    } else {
        executable
    };

    let mut command = Command::new(target_executable);

    if let Some(path) = path.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    }) {
        command.arg("--hydrafs-open");
        command.arg(path);
    }

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_item(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.opener().open_path(path, None::<String>).map_err(|e| e.to_string())
}

#[tauri::command]
fn show_in_explorer(path: String) -> Result<(), String> {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn show_tools_window(app: tauri::AppHandle) -> Result<(), String> {
    show_or_create_tools_window(&app)
}

#[tauri::command]
fn delete_item(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    if path_buf.is_dir() {
        fs::remove_dir_all(&path_buf).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path_buf).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_item(path: String, new_name: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    let mut new_path = path_buf.clone();
    new_path.set_file_name(new_name);
    fs::rename(&path_buf, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn edit_item(path: String) -> Result<(), String> {
    Command::new("notepad")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn copy_item(source: String, destination: String) -> Result<(), String> {
    fs::copy(source, destination).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn show_native_context_menu(window: tauri::Window, path: String) -> Result<(), String> {
    let hwnd_val = window.hwnd().map_err(|e| e.to_string())?;
    // the HWND from Tauri might be an isize or pointer or wrapper.
    let hwnd = unsafe { std::mem::transmute::<_, isize>(hwnd_val) };

    let _ = window.run_on_main_thread(move || {
        let _guard = win_context_menu::init_com();
        if let Ok(items) = win_context_menu::ShellItems::from_path(&path) {
            if let Ok(ctx) = win_context_menu::ContextMenu::new(items) {
                match ctx.owner(hwnd).show() {
                    Ok(Some(selected)) => {
                        if let Err(e) = selected.execute() {
                            eprintln!("Failed to execute context menu item: {:?}", e);
                        }
                    }
                    Ok(None) => {}
                    Err(e) => {
                        eprintln!("Failed to show context menu: {:?}", e);
                    }
                }
            }
        }
    });
    Ok(())
}

fn ensure_window(app: &tauri::AppHandle, label: &str) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    Err(format!("window not found for label: {label}"))
}

fn show_or_create_tools_window(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("tools") {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let tools_window = WebviewWindowBuilder::new(
        app,
        "tools",
        tauri::WebviewUrl::App("basic.html".into()),
    )
    .title("HydraFS Tools")
    .visible(false)
    .build()
    .map_err(|e| e.to_string())?;

    let _ = tools_window.show();
    let _ = tools_window.set_focus();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run_main() {
    run_with_mode(AppMode::Main, None);
}

pub fn run_tools() {
    run_with_mode(AppMode::Tools, parse_pending_open_path());
}

fn run_with_mode(mode: AppMode, pending_open_path: Option<String>) {
    // Single-instance is scoped per app so HydraFS and HydraFS Tools can run side by side.
    // If another instance of the same app exists, write the pending path to a mode-specific
    // file and exit. The running instance polls that file and imports the path into state.
    let username = std::env::var("USERNAME").unwrap_or_else(|_| "default".into());
    let mutex_name = format!("Global\\HydraFS_{}_SingleInstance_{}", mode.mutex_suffix(), username);
    let wide: Vec<u16> = std::ffi::OsStr::new(&mutex_name)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    unsafe {
        let handle = CreateMutexW(std::ptr::null_mut(), 0, wide.as_ptr());
        if handle == 0 {
            // Couldn't create mutex, continue normally
        } else {
            let err = GetLastError();
            if err == ERROR_ALREADY_EXISTS {
                // Another instance is running. If we have a pending path, write it and exit.
                if let Some(path) = pending_open_path.clone() {
                    if let Some(pending) = pending_open_file(mode) {
                        let _ = std::fs::write(&pending, path);
                    }
                }
                CloseHandle(handle);
                std::process::exit(0);
            }
        }
    }

    let launch_state = LaunchState {
        mode,
        pending_open_path: Arc::new(Mutex::new(pending_open_path.clone())),
    };
    // Setup a file path for inter-process handoff
    let pending_file: Option<PathBuf> = pending_open_file(mode);

    let builder = tauri::Builder::default().manage(launch_state);
    // Setup a file watcher thread that can emit events to the frontend when a pending path arrives.
    let pending_file_clone = pending_file.clone();
    let builder = builder.setup(move |app| {
        let target_label = mode.label().to_string();
        let app_handle = app.handle();
        if target_label == "tools" {
            show_or_create_tools_window(&app_handle)?;
        } else {
            ensure_window(&app_handle, &target_label)?;
        }

        // Ensure main window actually exits the process when closed so it doesn't
        // remain running in the background and block subsequent opens.
        if target_label == "main" {
            if let Some(win) = app_handle.get_webview_window("main") {
                let _ = win.on_window_event(|event| match event {
                    tauri::WindowEvent::CloseRequested { .. } => {
                        std::process::exit(0);
                    }
                    _ => {}
                });
            }
        }

        // Ensure tools window also exits the process when closed (tools is
        // an independent executable; closing it should terminate its process).
        if target_label == "tools" {
            if let Some(win) = app_handle.get_webview_window("tools") {
                let _ = win.on_window_event(|event| match event {
                    tauri::WindowEvent::CloseRequested { .. } => {
                        std::process::exit(0);
                    }
                    _ => {}
                });
            }
        }

        if let Some(pending_path) = pending_file_clone {
            let pending_arc = {
                let state = app.state::<LaunchState>();
                Arc::clone(&state.pending_open_path)
            };
            let app_handle = app_handle.clone();
            let target_label_clone = target_label.clone();
            std::thread::spawn(move || {
                loop {
                    if pending_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&pending_path) {
                            if !content.trim().is_empty() {
                                if let Ok(mut guard) = pending_arc.lock() {
                                    *guard = Some(content.trim().to_string());
                                }
                                if target_label_clone == "tools" && app_handle.get_webview_window(&target_label_clone).is_none() {
                                    let _ = show_or_create_tools_window(&app_handle);
                                }
                                let _ = app_handle.emit("hydrafs-opened-path", Some(content.trim().to_string()));
                            }
                        }
                        let _ = std::fs::remove_file(&pending_path);
                    }

                    // If the target window no longer exists, stop the watcher thread to allow clean exit.
                    if target_label_clone != "tools" && app_handle.get_webview_window(&target_label_clone).is_none() {
                        break;
                    }

                    std::thread::sleep(std::time::Duration::from_millis(500));
                }
            });
        }
        Ok(())
    });
    let builder = builder.plugin(tauri_plugin_opener::init());
    let builder = builder.invoke_handler(tauri::generate_handler![
        read_directory, 
        resolve_path, 
        get_disks,
        save_config,
        load_config,
        save_settings,
        load_settings,
        save_themes,
        load_themes,
        get_pending_open_path,
        get_passwords_csv_path,
        get_passwords_csv_headers,
        get_passwords_csv_schema,
        load_password_entries,
        save_password_entries,
        try_decrypt_password_value,
        rewrite_passwords_csv_with_headers,
        launch_tools_app,
        open_item,
        show_in_explorer,
        show_tools_window,
        delete_item,
        rename_item,
        edit_item,
        copy_item,
        encrypt_path,
        decrypt_path,
        show_native_context_menu
    ]);
    builder.run(tauri::generate_context!())
        .expect("error while running tauri application");
}
