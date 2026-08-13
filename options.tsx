import React, { useEffect, useState } from "react"
import { AIManager, DEFAULT_CONFIG } from "./lib/ai/manager"
import { AIConfig, ProviderId, AIAccount } from "./lib/ai/types"
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
    <ol style={{ paddingLeft: "20px", margin: "12px 0", color: "#536471" }}>
      <li>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#1d9bf0" }}>Google AI Studio</a>.</li>
      <li>Sign in with your Google account.</li>
      <li>Click <strong>Create API key</strong>.</li>
      <li>Copy the generated API key and paste it above.</li>
    </ol>
  ),
  groq: (
    <ol style={{ paddingLeft: "20px", margin: "12px 0", color: "#536471" }}>
      <li>Open <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: "#1d9bf0" }}>GroqCloud Console</a>.</li>
      <li>Sign in or create an account.</li>
      <li>Click <strong>Create API Key</strong>.</li>
      <li>Copy the generated API key and paste it above.</li>
    </ol>
  ),
  openrouter: (
    <ol style={{ paddingLeft: "20px", margin: "12px 0", color: "#536471" }}>
      <li>Open <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: "#1d9bf0" }}>OpenRouter Keys</a>.</li>
      <li>Sign in with your account.</li>
      <li>Click <strong>Create Key</strong>.</li>
      <li>Copy the generated API key and paste it above.</li>
    </ol>
  )
}

function Options() {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  
  // Edit state
  const [editingProvider, setEditingProvider] = useState<ProviderId | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  
  const [editName, setEditName] = useState("")
  const [editKey, setEditKey] = useState("")
  const [editModel, setEditModel] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [editEnabled, setEditEnabled] = useState(true)
  
  const [statusMsg, setStatusMsg] = useState("")
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("")

  const providerList: ProviderId[] = ["gemini", "groq", "openrouter"]

  useEffect(() => {
    AIManager.getConfig().then(c => {
      setConfig(c)
      setLoading(false)
    })
    
    // Interval to force re-render for cooldown timers
    const interval = setInterval(() => {
      setConfig(c => ({...c}))
    }, 1000)
    return () => clearInterval(interval)
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
  
  const handleFallbackEnabledChange = async (enabled: boolean) => {
    const newConfig = { ...config, fallbackEnabled: enabled }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
  }
  
  const toggleFallbackProvider = async (provider: ProviderId) => {
    const newConfig = { ...config }
    if (newConfig.fallbackProviders.includes(provider)) {
      newConfig.fallbackProviders = newConfig.fallbackProviders.filter(p => p !== provider)
    } else {
      newConfig.fallbackProviders.push(provider)
    }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
  }

  const startAdding = (id: ProviderId) => {
    setEditingProvider(id)
    setEditingAccountId(null)
    setEditName("")
    setEditKey("")
    setEditModel(MODELS[id][0].id)
    setEditEnabled(true)
    setShowKey(false)
  }

  const startEditing = (id: ProviderId, account: AIAccount) => {
    setEditingProvider(id)
    setEditingAccountId(account.id)
    setEditName(account.name)
    setEditKey(account.apiKey)
    setEditModel(account.model)
    setEditEnabled(account.enabled)
    setShowKey(false)
  }

  const cancelEditing = () => {
    setEditingProvider(null)
    setEditingAccountId(null)
  }

  const saveAccount = async () => {
    if (!editingProvider) return
    if (!editName.trim() || !editKey.trim()) {
      showStatus("Name and API key are required", "error")
      return
    }

    const newConfig = { ...config }
    if (!newConfig.providers[editingProvider]) {
      newConfig.providers[editingProvider] = { accounts: [] }
    }

    const pConfig = newConfig.providers[editingProvider]!
    
    if (editingAccountId) {
      const idx = pConfig.accounts.findIndex(a => a.id === editingAccountId)
      if (idx > -1) {
        // If key changed, reset status
        const isNewKey = pConfig.accounts[idx].apiKey !== editKey.trim()
        
        pConfig.accounts[idx] = {
          ...pConfig.accounts[idx],
          name: editName.trim(),
          apiKey: editKey.trim(),
          model: editModel,
          enabled: editEnabled,
          ...(isNewKey ? { status: "unknown", cooldownUntil: null, lastErrorAt: null } : {})
        }
      }
    } else {
      pConfig.accounts.push({
        id: crypto.randomUUID(),
        name: editName.trim(),
        apiKey: editKey.trim(),
        model: editModel,
        enabled: editEnabled,
        status: "unknown",
        lastUsedAt: null,
        lastErrorAt: null,
        cooldownUntil: null
      })
    }

    if (!newConfig.activeProvider) {
      newConfig.activeProvider = editingProvider
    }

    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    
    showStatus(`Account saved successfully!`, "success")
    cancelEditing()
  }

  const removeAccount = async (providerId: ProviderId, accountId: string) => {
    const newConfig = { ...config }
    const pConfig = newConfig.providers[providerId]
    if (pConfig && pConfig.accounts) {
      pConfig.accounts = pConfig.accounts.filter(a => a.id !== accountId)
    }

    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    showStatus(`Account removed.`, "info")
  }

  const testAccount = async (providerId: ProviderId, accountId: string) => {
    const pConfig = config.providers[providerId]
    const account = pConfig?.accounts.find(a => a.id === accountId)
    if (!account) return

    showStatus("Testing connection...", "info")
    try {
      const provider = PROVIDERS[providerId]
      const success = await provider.testConnection(account.apiKey, account.model)
      if (success) {
        showStatus("✓ Connection successful!", "success")
        await AIManager.updateAccountState(providerId, accountId, { status: "healthy", cooldownUntil: null })
        const c = await AIManager.getConfig()
        setConfig(c)
      }
    } catch (err: any) {
      showStatus(err.message || "Connection failed.", "error")
      await AIManager.updateAccountState(providerId, accountId, { 
        status: err.type === "RATE_LIMITED" ? "rate_limited" : (err.type === "INVALID_API_KEY" ? "invalid" : "unknown")
      })
      const c = await AIManager.getConfig()
      setConfig(c)
    }
  }

  if (loading) return null

  const hasConfiguredProviders = providerList.some(id => (config.providers[id]?.accounts.length || 0) > 0)
  
  const getCooldownText = (timestamp: number | null) => {
    if (!timestamp) return null
    const diff = timestamp - Date.now()
    if (diff <= 0) return null
    return `Available again in ${Math.ceil(diff / 1000)}s`
  }

  return (
    <div style={{ maxWidth: "680px", margin: "40px auto", fontFamily: "system-ui, sans-serif", color: "#0f1419", padding: "0 20px", paddingBottom: "100px" }}>
      <h1 style={{ display: "flex", alignItems: "center", gap: "12px", color: "#1d9bf0", fontSize: "28px", margin: "0 0 16px 0" }}>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
        </svg>
        Replyly Settings
      </h1>
      
      <p style={{ color: "#536471", marginBottom: "32px", fontSize: "15px", lineHeight: "1.5" }}>
        Configure multiple API accounts for automatic failover. Keys are stored locally via BYOK.
      </p>

      {/* Active Provider Selector */}
      <div style={{ background: "#f7f9f9", border: "1px solid #eff3f4", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>Active Provider</label>
        <select 
          value={config.activeProvider || ""}
          onChange={(e) => handleActiveProviderChange(e.target.value as ProviderId)}
          style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cfd9de", fontSize: "15px", outline: "none", backgroundColor: "#fff" }}
        >
          {!hasConfiguredProviders && <option value="">No AI providers configured</option>}
          {providerList.map(id => {
            if ((config.providers[id]?.accounts.length || 0) > 0) {
              return <option key={id} value={id}>{PROVIDERS[id].name}</option>
            }
            return null
          })}
        </select>
        
        <div style={{ marginTop: "20px", borderTop: "1px solid #cfd9de", paddingTop: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={config.fallbackEnabled} 
              onChange={(e) => handleFallbackEnabledChange(e.target.checked)} 
              style={{ width: "16px", height: "16px" }}
            />
            Fallback providers
          </label>
          <p style={{ margin: "8px 0 12px 0", fontSize: "13px", color: "#536471" }}>
            Automatically use another provider if the selected provider is unavailable.
          </p>
          
          {config.fallbackEnabled && (
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {providerList.map(id => {
                if (id === config.activeProvider) return null // Don't show active as fallback
                if ((config.providers[id]?.accounts.length || 0) === 0) return null
                
                return (
                  <label key={id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={config.fallbackProviders.includes(id)}
                      onChange={() => toggleFallbackProvider(id)}
                    />
                    {PROVIDERS[id].name}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 20px 0" }}>AI Accounts</h2>

      {/* Provider Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {providerList.map(id => {
          const providerDef = PROVIDERS[id]
          const pConfig = config.providers[id]
          const accounts = pConfig?.accounts || []
          const isAddingNew = editingProvider === id && !editingAccountId

          return (
            <div key={id} style={{ background: "#fff", border: "1px solid #eff3f4", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{providerDef.name}</h3>
                <span style={{ background: "#e1effe", color: "#1d9bf0", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>Free + Paid</span>
              </div>

              {/* Accounts List */}
              {accounts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                  {accounts.map(account => {
                    const cooldownText = getCooldownText(account.cooldownUntil)
                    const isHealthy = account.status === "healthy"
                    const isRateLimited = account.status === "rate_limited" || !!cooldownText
                    const isInvalid = account.status === "invalid"

                    return (
                      <div key={account.id} style={{ 
                        border: "1px solid #cfd9de", borderRadius: "8px", padding: "16px", 
                        opacity: account.enabled ? 1 : 0.6, backgroundColor: isRateLimited ? "#fff9f0" : "#fff" 
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>{account.name}</div>
                            <div style={{ fontSize: "13px", color: "#536471", marginBottom: "8px" }}>{account.model}</div>
                            
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, 
                              color: isInvalid ? "#f4212e" : isRateLimited ? "#f9a826" : isHealthy ? "#00ba7c" : "#8899a6" 
                            }}>
                              {isInvalid ? "✕ Invalid" : isRateLimited ? "⚠ Rate limited" : isHealthy ? "✓ Healthy" : "○ Unknown status"}
                            </div>
                            
                            {cooldownText && (
                              <div style={{ fontSize: "12px", color: "#f9a826", marginTop: "4px", fontWeight: 600 }}>
                                {cooldownText}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={() => testAccount(id, account.id)} style={{ padding: "4px 12px", borderRadius: "9999px", border: "1px solid #cfd9de", background: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Test</button>
                              <button onClick={() => startEditing(id, account)} style={{ padding: "4px 12px", borderRadius: "9999px", border: "1px solid #cfd9de", background: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Edit</button>
                              <button onClick={() => removeAccount(id, account.id)} style={{ padding: "4px 12px", borderRadius: "9999px", border: "1px solid #ffe9e9", color: "#f4212e", background: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Remove</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add / Edit Pane */}
              {(editingProvider === id) ? (
                <div style={{ background: "#f7f9f9", padding: "20px", borderRadius: "12px", border: "1px solid #cfd9de" }}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>{editingAccountId ? "Edit Account" : `Add ${providerDef.name} Key`}</h4>
                  
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", fontSize: "13px" }}>Account Name</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Personal or Backup" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cfd9de", fontSize: "14px", boxSizing: "border-box" }} />
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", fontSize: "13px" }}>API Key</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input type={showKey ? "text" : "password"} value={editKey} onChange={e => setEditKey(e.target.value)} placeholder="API Key" style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cfd9de", fontSize: "14px", boxSizing: "border-box" }} />
                      <button onClick={() => setShowKey(!showKey)} style={{ padding: "0 12px", borderRadius: "8px", border: "1px solid #cfd9de", background: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>{showKey ? "Hide" : "Show"}</button>
                    </div>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: "8px", fontSize: "13px" }}>Model</label>
                    <select value={editModel} onChange={e => setEditModel(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cfd9de", fontSize: "14px", boxSizing: "border-box", backgroundColor: "#fff" }}>
                      {MODELS[id].map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                      <input type="checkbox" checked={editEnabled} onChange={e => setEditEnabled(e.target.checked)} />
                      Account enabled
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                    <button onClick={saveAccount} style={{ padding: "8px 20px", borderRadius: "9999px", border: "none", background: "#1d9bf0", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>Save</button>
                    <button onClick={cancelEditing} style={{ padding: "8px 20px", borderRadius: "9999px", border: "1px solid #cfd9de", background: "transparent", color: "#536471", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>Cancel</button>
                  </div>

                  {isAddingNew && (
                    <div style={{ fontSize: "13px", marginTop: "16px", borderTop: "1px solid #cfd9de", paddingTop: "16px" }}>
                      <strong>How to get your API key:</strong>
                      {GUIDES[id]}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => startAdding(id)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#1d9bf0", fontWeight: 700, fontSize: "14px", cursor: "pointer", padding: 0 }}
                >
                  <span style={{ fontSize: "18px" }}>+</span> Add {providerDef.name} API Key
                </button>
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
