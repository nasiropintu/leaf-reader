use std::path::Path;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Emitter,
};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_initial_file_path,
            read_file_binary
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
