import React, { useEffect, useState } from "react"
import { AIManager, DEFAULT_CONFIG } from "./lib/ai/manager"
import { AIConfig, ProviderId, ProviderConfig } from "./lib/ai/types"
import { PROVIDERS } from "./lib/ai/manager"

const MODELS: Record<ProviderId, { id: string; name: string }[]> = {
  gemini: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" }
  ],
  groq: [
    { id: "llama3-70b-8192", name: "Llama 3 70B" },
    { id: "llama3-8b-8192", name: "Llama 3 8B" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" }
  ],
  openrouter: [
    { id: "openrouter/auto", name: "Auto (Router)" },
    { id: "meta-llama/llama-3-8b-instruct:free", name: "Llama 3 8B (Free)" },
    { id: "google/gemini-flash-1.5", name: "Gemini 1.5 Flash" }
  ]
}

const GUIDES: Record<ProviderId, React.ReactNode> = {
  gemini: (
    <>
      <ol style={{ paddingLeft: "20px", margin: "12px 0", color: "#536471" }}>
        <li>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#1d9bf0" }}>Google AI Studio</a>.</li>
        <li>Sign in with your Google account.</li>
        <li>Click <strong>Create API key</strong>.</li>
        <li>Copy the generated API key and paste it above.</li>
      </ol>
    </>
  ),
  groq: (
    <>
      <ol style={{ paddingLeft: "20px", margin: "12px 0", color: "#536471" }}>
        <li>Open <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: "#1d9bf0" }}>GroqCloud Console</a>.</li>
        <li>Sign in or create an account.</li>
        <li>Click <strong>Create API Key</strong>.</li>
        <li>Copy the generated API key and paste it above.</li>
      </ol>
    </>
  ),
  openrouter: (
    <>
      <ol style={{ paddingLeft: "20px", margin: "12px 0", color: "#536471" }}>
        <li>Open <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: "#1d9bf0" }}>OpenRouter Keys</a>.</li>
        <li>Sign in with your account.</li>
        <li>Click <strong>Create Key</strong>.</li>
        <li>Copy the generated API key and paste it above.</li>
      </ol>
    </>
  )
}

function Options() {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<ProviderId | null>(null)
  
  // Edit state
  const [editKey, setEditKey] = useState("")
  const [editModel, setEditModel] = useState("")
  const [showKey, setShowKey] = useState(false)
  
  const [statusMsg, setStatusMsg] = useState("")
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("")

  const providerList: ProviderId[] = ["gemini", "groq", "openrouter"]

  useEffect(() => {
    AIManager.getConfig().then(c => {
      setConfig(c)
      setLoading(false)
    })
  }, [])

  const showStatus = (msg: string, type: "success" | "error" | "info") => {
    setStatusMsg(msg)
    setStatusType(type)
    setTimeout(() => setStatusMsg(""), 4000)
  }

  const handleActiveProviderChange = async (newActive: ProviderId | null) => {
    const newConfig = { ...config, activeProvider: newActive }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
  }

  const startEditing = (id: ProviderId) => {
    const pConfig = config.providers[id]
    setEditKey(pConfig?.apiKey || "")
    setEditModel(pConfig?.model || MODELS[id][0].id)
    setShowKey(false)
    setEditingProvider(id)
  }

  const cancelEditing = () => {
    setEditingProvider(null)
    setEditKey("")
    setEditModel("")
  }

  const saveProvider = async () => {
    if (!editingProvider) return
    if (!editKey.trim()) {
      showStatus("Please enter an API key", "error")
      return
    }

    const newConfig = { ...config }
    newConfig.providers[editingProvider] = {
      apiKey: editKey.trim(),
      model: editModel,
      enabled: true
    }

    // Auto-set as active if none is active
    if (!newConfig.activeProvider) {
      newConfig.activeProvider = editingProvider
    }

    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    
    showStatus(`${PROVIDERS[editingProvider].name} configured successfully!`, "success")
    cancelEditing()
  }

  const removeProvider = async () => {
    if (!editingProvider) return

    const newConfig = { ...config }
    delete newConfig.providers[editingProvider]
    
    // If we removed the active provider, try to fall back
    if (newConfig.activeProvider === editingProvider) {
      const remaining = Object.keys(newConfig.providers) as ProviderId[]
      newConfig.activeProvider = remaining.length > 0 ? remaining[0] : null
    }

    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    
    showStatus(`${PROVIDERS[editingProvider].name} removed.`, "info")
    cancelEditing()
  }

  const testProvider = async () => {
    if (!editingProvider) return
    if (!editKey.trim()) {
      showStatus("Please enter an API key to test.", "error")
      return
    }

    showStatus("Testing connection...", "info")
    try {
      const provider = PROVIDERS[editingProvider]
      const success = await provider.testConnection(editKey.trim(), editModel)
      if (success) {
        showStatus("✓ Connection successful!", "success")
      }
    } catch (err: any) {
      showStatus(err.message || "Connection failed.", "error")
    }
  }

  if (loading) return null

  // Providers that have keys saved
  const configuredProviders = providerList.filter(id => config.providers[id]?.apiKey)

  return (
    <div style={{ maxWidth: "680px", margin: "40px auto", fontFamily: "system-ui, sans-serif", color: "#0f1419", padding: "0 20px", paddingBottom: "100px" }}>
      <h1 style={{ display: "flex", alignItems: "center", gap: "12px", color: "#1d9bf0", fontSize: "28px", margin: "0 0 16px 0" }}>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
        </svg>
        Replyly Settings
      </h1>
      
      <p style={{ color: "#536471", marginBottom: "32px", fontSize: "15px", lineHeight: "1.5" }}>
        Manage your AI providers. Keys are stored locally and securely via BYOK (Bring Your Own Key).
      </p>

      {/* Active Provider Selector */}
      <div style={{ background: "#f7f9f9", border: "1px solid #eff3f4", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>Active AI Provider</label>
        <select 
          value={config.activeProvider || ""}
          onChange={(e) => handleActiveProviderChange(e.target.value as ProviderId)}
          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cfd9de", fontSize: "15px", outline: "none", backgroundColor: "#fff" }}
        >
          {configuredProviders.length === 0 && <option value="">No AI provider configured</option>}
          {configuredProviders.map(id => (
            <option key={id} value={id}>{PROVIDERS[id].name}</option>
          ))}
        </select>
        <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#536471" }}>
          This provider will be used to generate replies on X.
        </p>
      </div>

      <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 20px 0" }}>AI Providers</h2>

      {/* Provider Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {providerList.map(id => {
          const providerDef = PROVIDERS[id]
          const isConfigured = !!config.providers[id]?.apiKey
          const isEditing = editingProvider === id

          return (
            <div key={id} style={{ background: "#fff", border: "1px solid #eff3f4", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{providerDef.name}</h3>
                    <span style={{ background: "#e1effe", color: "#1d9bf0", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>Free + Paid</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: isConfigured ? "#00ba7c" : "#8899a6", fontWeight: 600 }}>
                    <span style={{ fontSize: "16px" }}>{isConfigured ? "●" : "○"}</span>
                    {isConfigured ? "Connected" : "Not configured"}
                  </div>
                </div>
                
                {!isEditing && (
                  <button
                    onClick={() => startEditing(id)}
                    style={{ padding: "8px 16px", borderRadius: "9999px", border: "1px solid #cfd9de", background: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600, color: "#0f1419" }}
                  >
                    {isConfigured ? "Manage" : "Add Key"}
                  </button>
                )}
              </div>

              {/* Editing Pane */}
              {isEditing && (
                <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #eff3f4" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>API Key</label>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <input
                        type={showKey ? "text" : "password"}
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        placeholder={`Enter your ${providerDef.name} API Key`}
                        style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: "1px solid #cfd9de", fontSize: "14px", outline: "none" }}
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        style={{ padding: "0 16px", borderRadius: "8px", border: "1px solid #cfd9de", background: "#f7f9f9", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
                      >
                        {showKey ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>Model</label>
                    <select
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cfd9de", fontSize: "14px", outline: "none", backgroundColor: "#fff" }}
                    >
                      {MODELS[id].map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
                    <button
                      onClick={saveProvider}
                      style={{ padding: "10px 20px", borderRadius: "9999px", border: "none", background: "#1d9bf0", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
                    >
                      Save Configuration
                    </button>
                    <button
                      onClick={testProvider}
                      style={{ padding: "10px 20px", borderRadius: "9999px", border: "1px solid #1d9bf0", background: "transparent", color: "#1d9bf0", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
                    >
                      Test Connection
                    </button>
                    <button
                      onClick={cancelEditing}
                      style={{ padding: "10px 20px", borderRadius: "9999px", border: "1px solid #cfd9de", background: "transparent", color: "#536471", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
                    >
                      Cancel
                    </button>
                    {isConfigured && (
                      <button
                        onClick={removeProvider}
                        style={{ padding: "10px 20px", borderRadius: "9999px", border: "none", background: "#ffe9e9", color: "#f4212e", fontWeight: 700, cursor: "pointer", fontSize: "14px", marginLeft: "auto" }}
                      >
                        Remove Key
                      </button>
                    )}
                  </div>

                  <div style={{ background: "#f7f9f9", padding: "16px", borderRadius: "8px", border: "1px solid #eff3f4" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>How to get your API key</div>
                    <div style={{ fontSize: "14px" }}>
                      {GUIDES[id]}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {statusMsg && (
        <div style={{
          position: "fixed", bottom: "40px", left: "50%", transform: "translateX(-50%)",
          padding: "16px 24px", borderRadius: "8px", fontSize: "15px", fontWeight: 600,
          backgroundColor: statusType === "error" ? "#f4212e" : statusType === "success" ? "#00ba7c" : "#1d9bf0",
          color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 9999
        }}>
          {statusMsg}
        </div>
      )}

    </div>
  )
}

export default Options
