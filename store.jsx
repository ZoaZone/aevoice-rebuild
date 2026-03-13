/// Typed wrappers around tauri-plugin-store for persisting app settings.
use serde::{de::DeserializeOwned, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "aevoice_settings.json";

pub fn get<T: DeserializeOwned>(app: &AppHandle, key: &str) -> Option<T> {
    let store = app.store(STORE_FILE).ok()?;
    store.get(key).and_then(|v| serde_json::from_value(v).ok())
}

pub fn set<T: Serialize>(app: &AppHandle, key: &str, value: &T) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.set(
        key,
        serde_json::to_value(value).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| e.to_string())
}

pub fn delete(app: &AppHandle, key: &str) -> Result<bool, String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    let existed = store.delete(key);
    store.save().map_err(|e| e.to_string())?;
    Ok(existed)
}

pub fn clear(app: &AppHandle) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.clear();
    store.save().map_err(|e| e.to_string())
}