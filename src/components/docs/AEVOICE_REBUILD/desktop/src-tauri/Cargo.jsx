[package]
name = "aevoice-desktop"
version = "1.0.0"
description = "AEVOICE AI Desktop Application"
authors = ["AEVOICE Team"]
license = "MIT"
default-run = "aevoice-desktop"
edition = "2021"
rust-version = "1.77.2"

[lib]
name = "aevoice_desktop_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[[bin]]
name = "aevoice-desktop"
path = "src/main.rs"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri               = { version = "2", features = ["tray-icon", "image-default", "devtools"] }
tauri-plugin-shell  = "2"
tauri-plugin-http   = "2"
tauri-plugin-fs     = "2"
tauri-plugin-store  = "2"
tauri-plugin-process = "2"
tauri-plugin-single-instance = "2"
tauri-plugin-autostart = "2"
tauri-plugin-notification = "2"
serde       = { version = "1", features = ["derive"] }
serde_json  = "1"
tokio       = { version = "1", features = ["full"] }
log         = "0.4"
env_logger  = "0.11"

[profile.release]
panic         = "abort"
codegen-units = 1
lto           = true
opt-level     = "s"
strip         = true

[profile.dev]
incremental = true