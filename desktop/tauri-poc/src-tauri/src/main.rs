#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::PathBuf};
use tauri::{
    webview::{NewWindowResponse, PermissionResponse},
    Manager, WebviewUrl, WebviewWindowBuilder,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let folder: PathBuf = std::env::current_exe()?.parent().unwrap().into();
            let profile = folder.join("data");
            fs::create_dir_all(&profile)?;
            // Keep the OS file lock for the entire process. A second launch must
            // never open a concurrent writer against this portable profile.
            use std::os::windows::fs::OpenOptionsExt;
            let lock = fs::OpenOptions::new()
                .read(true)
                .write(true)
                .create(true)
                .share_mode(0)
                .open(profile.join("ashfall-profile.lock"))?;
            app.manage(lock);
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Project Ashfall — Tauri PoC")
                .inner_size(1440.0, 900.0)
                .min_inner_size(800.0, 600.0)
                .data_directory(profile)
                .devtools(false)
                .on_navigation(|url| url.origin().ascii_serialization() == "http://tauri.localhost")
                .on_new_window(|_, _| NewWindowResponse::Deny)
                .on_permission_request(|_, _| PermissionResponse::Deny)
                .on_download(|_, _| false)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect(
            "Tauri PoC startup failed (check WebView2, folder permissions and existing instance)",
        );
}
