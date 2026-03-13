toml
[package]
name = "aevoice"
version = "1.0.0"
description = "AEVOICE AI - Voice Assistant Desktop App"
authors = ["AEVOICE Team"]
license = "MIT"
repository = ""
default-run = "aevoice"
edition = "2021"
rust-version = "1.77.2"

[lib]
name = "aevoice_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[[bin]]
name = "aevoice"
path = "src/main.rs"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon", "image-default", "devtools"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-http = "2"
tauri-plugin-notification = "2"
tauri-plugin-store = "2"
tauri-plugin-process = "2"
tauri-plugin-autostart = "2"
tauri-plugin-single-instance = "2"
tauri-plugin-os = "2"
tauri-plugin-clipboard-manager = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
keyring = { version = "2", features = ["default-credential"] }
dotenvy = "0.15"
log = "0.4"
env_logger = "0.11"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }
base64 = "0.22"
anyhow = "1"
thiserror = "1"

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true

[profile.dev]
incremental = true
