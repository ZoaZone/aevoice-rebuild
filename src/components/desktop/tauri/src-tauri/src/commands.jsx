use serde::{Deserialize, Serialize};
use tauri::State;

// ─────────────────────────────────────────────────────────────────────────────
// Shared App State
// ─────────────────────────────────────────────────────────────────────────────

pub struct AppState {
    pub handle: tauri::AppHandle,
    pub base_url: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        Self { success: true, data: Some(data), error: None }
    }
    pub fn err(msg: impl Into<String>) -> ApiResponse<serde_json::Value> {
        ApiResponse { success: false, data: None, error: Some(msg.into()) }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AssistantMode {
    pub mode: String,         // "voice" | "text" | "agentic" | "developer"
    pub sub_mode: String,     // "sree" | "sree_mini" | "overlay" etc.
    pub auto_start: bool,
    pub language: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeatureFlags {
    pub voice_enabled: bool,
    pub sree_enabled: bool,
    pub developer_mode: bool,
    pub desktop_overlay: bool,
    pub phase17_workforce: bool,
    pub marketing_hub: bool,
    pub crm_enabled: bool,
    pub kb_enabled: bool,
    pub analytics_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KbRetrievalRequest {
    pub query: String,
    pub client_id: String,
    pub top_k: Option<u32>,
    pub threshold: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KbResult {
    pub chunk_id: String,
    pub content: String,
    pub score: f64,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmProxyRequest {
    pub prompt: String,
    pub model: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    pub system_prompt: Option<String>,
    pub response_json_schema: Option<serde_json::Value>,
    pub add_context_from_internet: Option<bool>,
    pub file_urls: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmProxyResponse {
    pub content: String,
    pub model: String,
    pub tokens_used: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClientInfo {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub status: String,
    pub account_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvokeRequest {
    pub function_name: String,
    pub payload: serde_json::Value,
    pub auth_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub os: String,
    pub arch: String,
    pub build_date: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Build HTTP client with auth
// ─────────────────────────────────────────────────────────────────────────────

async fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .use_rustls_tls()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())
}

fn get_base_url() -> String {
    std::env::var("VITE_BASE44_APP_URL")
        .unwrap_or_else(|_| "https://app.base44.com".to_string())
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: Assistant Mode
// ─────────────────────────────────────────────────────────────────────────────

/// Get the current assistant mode from secure store
#[tauri::command]
pub async fn get_assistant_mode(
    app: tauri::AppHandle,
) -> Result<ApiResponse<AssistantMode>, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("aevoice_settings.json").map_err(|e| e.to_string())?;

    let mode = store
        .get("assistant_mode")
        .and_then(|v| serde_json::from_value::<AssistantMode>(v).ok())
        .unwrap_or(AssistantMode {
            mode: "voice".to_string(),
            sub_mode: "sree".to_string(),
            auto_start: false,
            language: "en-US".to_string(),
        });

    Ok(ApiResponse::ok(mode))
}

/// Persist the chosen assistant mode
#[tauri::command]
pub async fn set_assistant_mode(
    app: tauri::AppHandle,
    mode: AssistantMode,
) -> Result<ApiResponse<bool>, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("aevoice_settings.json").map_err(|e| e.to_string())?;
    store.set("assistant_mode", serde_json::to_value(&mode).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;

    log::info!("Assistant mode set to: {}", mode.mode);
    Ok(ApiResponse::ok(true))
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: Feature Flags
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_feature_flags(
    app: tauri::AppHandle,
) -> Result<ApiResponse<FeatureFlags>, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("aevoice_settings.json").map_err(|e| e.to_string())?;

    let flags = store
        .get("feature_flags")
        .and_then(|v| serde_json::from_value::<FeatureFlags>(v).ok())
        .unwrap_or(FeatureFlags {
            voice_enabled: true,
            sree_enabled: true,
            developer_mode: cfg!(debug_assertions),
            desktop_overlay: true,
            phase17_workforce: true,
            marketing_hub: true,
            crm_enabled: true,
            kb_enabled: true,
            analytics_enabled: true,
        });

    Ok(ApiResponse::ok(flags))
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: Knowledge Base Retrieval
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn kb_retrieval(
    request: KbRetrievalRequest,
    state: State<'_, AppState>,
) -> Result<ApiResponse<Vec<KbResult>>, String> {
    let client = build_client().await?;
    let url = format!("{}/api/functions/kbRetrieval", get_base_url());

    let payload = serde_json::json!({
        "query": request.query,
        "client_id": request.client_id,
        "top_k": request.top_k.unwrap_or(5),
        "threshold": request.threshold.unwrap_or(0.7),
    });

    let resp = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let results: Vec<KbResult> =
        serde_json::from_value(data["results"].clone()).unwrap_or_default();

    log::info!("KB retrieval: {} results for query '{}'", results.len(), request.query);
    Ok(ApiResponse::ok(results))
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: LLM Proxy
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn llm_proxy(
    request: LlmProxyRequest,
    state: State<'_, AppState>,
) -> Result<ApiResponse<LlmProxyResponse>, String> {
    let client = build_client().await?;
    let url = format!("{}/api/functions/llmProxy", get_base_url());

    let payload = serde_json::json!({
        "prompt": request.prompt,
        "model": request.model.unwrap_or_else(|| "gpt-4o-mini".to_string()),
        "temperature": request.temperature.unwrap_or(0.7),
        "max_tokens": request.max_tokens.unwrap_or(1000),
        "system_prompt": request.system_prompt,
        "response_json_schema": request.response_json_schema,
        "add_context_from_internet": request.add_context_from_internet.unwrap_or(false),
        "file_urls": request.file_urls.unwrap_or_default(),
    });

    let resp = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let result = LlmProxyResponse {
        content: data["content"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        model: data["model"]
            .as_str()
            .unwrap_or("gpt-4o-mini")
            .to_string(),
        tokens_used: data["tokens_used"].as_u64().unwrap_or(0) as u32,
    };

    Ok(ApiResponse::ok(result))
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: Get My Client
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_my_client(
    state: State<'_, AppState>,
) -> Result<ApiResponse<ClientInfo>, String> {
    let client = build_client().await?;
    let url = format!("{}/api/functions/getMyClient", get_base_url());

    let resp = client
        .post(&url)
        .json(&serde_json::json!({}))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let info = ClientInfo {
        id: data["client"]["id"].as_str().unwrap_or("").to_string(),
        name: data["client"]["name"].as_str().unwrap_or("").to_string(),
        slug: data["client"]["slug"].as_str().unwrap_or("").to_string(),
        status: data["client"]["status"].as_str().unwrap_or("active").to_string(),
        account_type: data["client"]["account_type"]
            .as_str()
            .unwrap_or("business")
            .to_string(),
    };

    Ok(ApiResponse::ok(info))
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: Sree Auto-Scan Service
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn sree_auto_scan_service(
    state: State<'_, AppState>,
    scan_target: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let client = build_client().await?;
    let url = format!("{}/api/functions/sreeAutoScanService", get_base_url());

    let payload = serde_json::json!({
        "target": scan_target.unwrap_or_else(|| "full".to_string()),
        "source": "desktop",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    let resp = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    log::info!("Sree auto-scan completed");
    Ok(ApiResponse::ok(data))
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: Generic Backend Invoke (Sree OS passthrough)
// ─────────────────────────────────────────────────────────────────────────────

/// Generic passthrough that lets any Sree OS module call any backend function
/// by name without requiring a dedicated Rust command.
#[tauri::command]
pub async fn invoke_backend(
    request: InvokeRequest,
    state: State<'_, AppState>,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let client = build_client().await?;
    let url = format!(
        "{}/api/functions/{}",
        get_base_url(),
        request.function_name
    );

    let mut builder = client.post(&url).json(&request.payload);

    if let Some(token) = &request.auth_token {
        builder = builder.bearer_auth(token);
    }

    let resp = builder.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Ok(ApiResponse {
            success: false,
            data: Some(data),
            error: Some(format!("HTTP {}", status)),
        });
    }

    log::info!("invoke_backend: {} → {}", request.function_name, status);
    Ok(ApiResponse::ok(data))
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: Secure Store (Keychain wrappers)
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn secure_store_set(key: String, value: String) -> Result<ApiResponse<bool>, String> {
    let entry = keyring::Entry::new("aevoice", &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())?;
    log::info!("Secure store: set key '{}'", key);
    Ok(ApiResponse::ok(true))
}

#[tauri::command]
pub async fn secure_store_get(key: String) -> Result<ApiResponse<Option<String>>, String> {
    let entry = keyring::Entry::new("aevoice", &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(val) => Ok(ApiResponse::ok(Some(val))),
        Err(keyring::Error::NoEntry) => Ok(ApiResponse::ok(None)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn secure_store_delete(key: String) -> Result<ApiResponse<bool>, String> {
    let entry = keyring::Entry::new("aevoice", &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(ApiResponse::ok(true)),
        Err(keyring::Error::NoEntry) => Ok(ApiResponse::ok(false)),
        Err(e) => Err(e.to_string()),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: App Info
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_app_info() -> ApiResponse<AppInfo> {
    ApiResponse::ok(AppInfo {
        name: "AEVOICE".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        build_date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands: DevTools (debug builds only)
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn open_devtools(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        if let Some(window) = app.get_webview_window("main") {
            window.open_devtools();
        }
    }
    Ok(())
}