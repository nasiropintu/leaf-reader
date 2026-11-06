use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::{Emitter, Manager, State};

#[cfg(desktop)]
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

#[derive(serde::Serialize)]
pub struct FileMetadata {
    pub name: String,
    pub size: u64,
    pub modified: u64,
    pub is_file: bool,
}

struct WatcherState {
    watcher: Option<RecommendedWatcher>,
    watched_path: Option<String>,
}

pub struct AppState {
    watcher: Mutex<WatcherState>,
}

/// Retrieve initial file path passed via OS file association or CLI argument
#[tauri::command]
fn get_initial_file_path() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        let arg = &args[1];
        if !arg.starts_with('-') && Path::new(arg).exists() {
            return Some(arg.clone());
        }
    }
    None
}

/// Read local document file into byte buffer directly from disk
#[tauri::command]
fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Read a high-performance slice/chunk of a large file (e.g. streaming large PDFs/books)
#[tauri::command]
fn read_file_chunk(path: String, offset: u64, length: u64) -> Result<Vec<u8>, String> {
    let mut file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek file offset: {}", e))?;
    let mut buffer = vec![0u8; length as usize];
    let bytes_read = file
        .read(&mut buffer)
        .map_err(|e| format!("Failed to read chunk: {}", e))?;
    buffer.truncate(bytes_read);
    Ok(buffer)
}

/// Query OS file metadata (size, last modified timestamp, filename)
#[tauri::command]
fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    let p = Path::new(&path);
    let meta = std::fs::metadata(p).map_err(|e| format!("Failed to get metadata: {}", e))?;
    let modified = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let name = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document")
        .to_string();

    Ok(FileMetadata {
        name,
        size: meta.len(),
        modified,
        is_file: meta.is_file(),
    })
}

fn get_library_storage_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot locate app data dir: {}", e))?;
    std::fs::create_dir_all(&data_dir).map_err(|e| format!("Cannot create data dir: {}", e))?;
    Ok(data_dir.join("leaf_library.json"))
}

/// Save local document reading state (bookmarks, notes, last page) offline on device
#[tauri::command]
fn save_document_state(
    app: tauri::AppHandle,
    doc_id: String,
    state_json: String,
) -> Result<(), String> {
    let file_path = get_library_storage_path(&app)?;
    let mut map: serde_json::Map<String, serde_json::Value> = if file_path.exists() {
        let content = std::fs::read_to_string(&file_path).unwrap_or_else(|_| "{}".to_string());
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::Map::new()
    };

    let parsed_state: serde_json::Value =
        serde_json::from_str(&state_json).map_err(|e| format!("Invalid JSON: {}", e))?;
    map.insert(doc_id, parsed_state);

    let serialized =
        serde_json::to_string_pretty(&map).map_err(|e| format!("Serialization error: {}", e))?;
    std::fs::write(&file_path, serialized).map_err(|e| format!("Write failed: {}", e))?;
    Ok(())
}

/// Load saved document state for a specific document ID
#[tauri::command]
fn get_document_state(
    app: tauri::AppHandle,
    doc_id: String,
) -> Result<Option<String>, String> {
    let file_path = get_library_storage_path(&app)?;
    if !file_path.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&file_path).map_err(|e| format!("Read failed: {}", e))?;
    let map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();

    if let Some(val) = map.get(&doc_id) {
        Ok(Some(val.to_string()))
    } else {
        Ok(None)
    }
}

/// Start watching an open document on disk; auto-emits "leaf:file-modified" when edited externally
#[tauri::command]
fn watch_document_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let mut watcher_guard = state
        .watcher
        .lock()
        .map_err(|_| "Failed to lock watcher state".to_string())?;

    // Drop previous watcher if any
    watcher_guard.watcher = None;
    watcher_guard.watched_path = None;

    let target_path = PathBuf::from(&path);
    if !target_path.exists() {
        return Err("File path does not exist".to_string());
    }

    let app_handle = app.clone();
    let watched_file = path.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| match res {
            Ok(event) => {
                if let EventKind::Modify(_) = event.kind {
                    let _ = app_handle.emit(
                        "leaf:file-modified",
                        serde_json::json!({
                            "path": watched_file,
                            "timestamp": SystemTime::now()
                                .duration_since(SystemTime::UNIX_EPOCH)
                                .map(|d| d.as_millis())
                                .unwrap_or(0)
                        }),
                    );
                }
            }
            Err(e) => {
                log::error!("File watch error: {:?}", e);
            }
        },
        Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&target_path, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch target path: {}", e))?;

    watcher_guard.watcher = Some(watcher);
    watcher_guard.watched_path = Some(path);

    Ok(())
}

/// Stop watching current document
#[tauri::command]
fn unwatch_document_file(state: State<'_, AppState>) -> Result<(), String> {
    let mut watcher_guard = state
        .watcher
        .lock()
        .map_err(|_| "Failed to lock watcher state".to_string())?;
    watcher_guard.watcher = None;
    watcher_guard.watched_path = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            watcher: Mutex::new(WatcherState {
                watcher: None,
                watched_path: None,
            }),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_initial_file_path,
            read_file_binary,
            read_file_chunk,
            get_file_metadata,
            save_document_state,
            get_document_state,
            watch_document_file,
            unwatch_document_file
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Build native application menu for desktop targets
            #[cfg(desktop)]
            {
                let handle = app.handle();

                // File menu items
                let open_item = MenuItemBuilder::with_id("menu_open", "Open Document...")
                    .accelerator("CmdOrCtrl+O")
                    .build(handle)?;
                let print_item = MenuItemBuilder::with_id("menu_print", "Print Document...")
                    .accelerator("CmdOrCtrl+P")
                    .build(handle)?;
                let close_item = MenuItemBuilder::with_id("menu_close", "Close Document")
                    .accelerator("CmdOrCtrl+W")
                    .build(handle)?;
                let quit_item = MenuItemBuilder::with_id("menu_quit", "Quit Leaf")
                    .accelerator("CmdOrCtrl+Q")
                    .build(handle)?;

                let file_menu = SubmenuBuilder::new(handle, "File")
                    .item(&open_item)
                    .item(&print_item)
                    .separator()
                    .item(&close_item)
                    .separator()
                    .item(&quit_item)
                    .build()?;

                // View menu items
                let zoom_in_item = MenuItemBuilder::with_id("menu_zoom_in", "Zoom In")
                    .accelerator("CmdOrCtrl+Plus")
                    .build(handle)?;
                let zoom_out_item = MenuItemBuilder::with_id("menu_zoom_out", "Zoom Out")
                    .accelerator("CmdOrCtrl+-")
                    .build(handle)?;
                let zoom_reset_item = MenuItemBuilder::with_id("menu_zoom_reset", "Reset Zoom (100%)")
                    .accelerator("CmdOrCtrl+0")
                    .build(handle)?;
                let rotate_item = MenuItemBuilder::with_id("menu_rotate", "Rotate Clockwise (90°)")
                    .accelerator("CmdOrCtrl+R")
                    .build(handle)?;

                let view_menu = SubmenuBuilder::new(handle, "View")
                    .item(&zoom_in_item)
                    .item(&zoom_out_item)
                    .item(&zoom_reset_item)
                    .separator()
                    .item(&rotate_item)
                    .build()?;

                // Help menu items
                let about_item = MenuItemBuilder::with_id("menu_about", "About Leaf")
                    .build(handle)?;
                let shortcuts_item = MenuItemBuilder::with_id("menu_shortcuts", "Keyboard Shortcuts")
                    .accelerator("CmdOrCtrl+/")
                    .build(handle)?;

                let help_menu = SubmenuBuilder::new(handle, "Help")
                    .item(&shortcuts_item)
                    .separator()
                    .item(&about_item)
                    .build()?;

                let menu = MenuBuilder::new(handle)
                    .item(&file_menu)
                    .item(&view_menu)
                    .item(&help_menu)
                    .build()?;

                app.set_menu(menu)?;

                // Handle menu click events
                app.on_menu_event(move |app_handle, event| {
                    match event.id().as_ref() {
                        "menu_open" => {
                            let _ = app_handle.emit("leaf:menu-open", ());
                        }
                        "menu_print" => {
                            let _ = app_handle.emit("leaf:menu-print", ());
                        }
                        "menu_close" => {
                            let _ = app_handle.emit("leaf:menu-close", ());
                        }
                        "menu_quit" => {
                            std::process::exit(0);
                        }
                        "menu_zoom_in" => {
                            let _ = app_handle.emit("leaf:menu-zoom-in", ());
                        }
                        "menu_zoom_out" => {
                            let _ = app_handle.emit("leaf:menu-zoom-out", ());
                        }
                        "menu_zoom_reset" => {
                            let _ = app_handle.emit("leaf:menu-zoom-reset", ());
                        }
                        "menu_rotate" => {
                            let _ = app_handle.emit("leaf:menu-rotate", ());
                        }
                        "menu_about" => {
                            let _ = app_handle.emit("leaf:menu-about", ());
                        }
                        "menu_shortcuts" => {
                            let _ = app_handle.emit("leaf:menu-shortcuts", ());
                        }
                        _ => {}
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
