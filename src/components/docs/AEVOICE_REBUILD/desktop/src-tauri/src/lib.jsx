use tauri::Manager;
mod commands;

pub fn run() {
    let _ = dotenvy::dotenv().ok();

    env_logger::Builder::from_env(
        env_logger::Env::default().default_filter_or("info"),
    )
    .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(
            tauri_plugin_single_instance::init(|app, _argv, _cwd| {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }),
        )
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::open_devtools,
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
                use tauri::tray::TrayIconBuilder;

                let open     = MenuItemBuilder::with_id("open", "Open AEVOICE").build(app)?;
                let sep      = PredefinedMenuItem::separator(app)?;
                let quit     = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
                let menu     = MenuBuilder::new(app).items(&[&open, &sep, &quit]).build()?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .tooltip("AEVOICE AI")
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "open" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .build(app)?;
            }

            log::info!("AEVOICE desktop initialized — version {}", env!("CARGO_PKG_VERSION"));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error running AEVOICE desktop app");
}