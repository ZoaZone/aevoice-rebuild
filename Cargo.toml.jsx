[package]
name = "aevoice-desktop"
version = "1.0.0"
authors = ["AEVOICE"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri = { version = "2", features = ["updater", "shell-open", "global-shortcut"] }

# Optional screenshot support (scaffold)
# screenshots = "0.8"