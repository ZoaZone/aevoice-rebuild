/// macOS Keychain / cross-platform credential store helpers.
/// Uses the `keyring` crate which delegates to:
///   - macOS: Keychain Services
///   - Windows: Windows Credential Manager
///   - Linux: libsecret / KWallet

const SERVICE: &str = "com.aevoice.desktop";

pub fn store(key: &str, value: &str) -> Result<(), String> {
    keyring::Entry::new(SERVICE, key)
        .map_err(|e| e.to_string())?
        .set_password(value)
        .map_err(|e| e.to_string())
}

pub fn retrieve(key: &str) -> Result<Option<String>, String> {
    match keyring::Entry::new(SERVICE, key)
        .map_err(|e| e.to_string())?
        .get_password()
    {
        Ok(val) => Ok(Some(val)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn remove(key: &str) -> Result<bool, String> {
    match keyring::Entry::new(SERVICE, key)
        .map_err(|e| e.to_string())?
        .delete_credential()
    {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

// ── Convenience helpers for AEVOICE-specific secrets ─────────────────────────

pub fn store_api_token(token: &str) -> Result<(), String> {
    store("api_token", token)
}

pub fn retrieve_api_token() -> Result<Option<String>, String> {
    retrieve("api_token")
}

pub fn store_client_id(client_id: &str) -> Result<(), String> {
    store("client_id", client_id)
}

pub fn retrieve_client_id() -> Result<Option<String>, String> {
    retrieve("client_id")
}