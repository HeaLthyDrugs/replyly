import React, { useEffect, useMemo, useState } from "react"
import { AIManager, DEFAULT_CONFIG, PROVIDERS } from "./lib/ai/manager"
import type { AIConfig, ProviderId, AIAccount } from "./lib/ai/types"

export type SettingsTab = "providers" | "failover" | "preferences" | "guides"

const MODELS: Record<ProviderId, { id: string; name: string; tag: string; description: string }[]> = {
  gemini: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tag: "Recommended", description: "Ultra-fast, smart & generous free tier" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", tag: "Deep Reasoning", description: "Highest quality & nuanced replies" }
  ],
  groq: [
    { id: "llama3-70b-8192", name: "Llama 3 70B", tag: "High Quality", description: "Fastest response with top-tier intelligence" },
    { id: "llama3-8b-8192", name: "Llama 3 8B", tag: "Blazing Fast", description: "Near instant responses for quick comments" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", tag: "Creative", description: "Versatile and expressive conversational model" }
  ],
  openrouter: [
    { id: "openrouter/auto", name: "Auto (Router)", tag: "Automatic", description: "Smart routing to the best available model" },
    { id: "meta-llama/llama-3-8b-instruct:free", name: "Llama 3 8B (Free)", tag: "100% Free", description: "Free community tier on OpenRouter" },
    { id: "google/gemini-flash-1.5", name: "Gemini 1.5 Flash", tag: "Balanced", description: "Fast Gemini model via OpenRouter API" }
  ]
}

const PROVIDER_METADATA: Record<ProviderId, { name: string; badge: string; icon: string; description: string; link: string; portalName: string }> = {
  gemini: {
    name: "Google Gemini",
    badge: "Free Tier Available",
    icon: "✨",
    description: "Google's flagship AI. Generous free tier with high rate limits.",
    link: "https://aistudio.google.com/app/apikey",
    portalName: "Google AI Studio"
  },
  groq: {
    name: "Groq Cloud",
    badge: "Ultra Fast Speed",
    icon: "⚡",
    description: "Lightning-fast inference engine powered by LPUs for instant replies.",
    link: "https://console.groq.com/keys",
    portalName: "Groq Console"
  },
  openrouter: {
    name: "OpenRouter",
    badge: "Multi-Model Access",
    icon: "🌐",
    description: "Single unified API key to access Claude, GPT-4, Llama, and hundreds of models.",
    link: "https://openrouter.ai/keys",
    portalName: "OpenRouter Keys"
  }
}

const TONES = [
  { value: "Smart", label: "Smart", emoji: "💡", desc: "Concise, insightful & perspective-driven" },
  { value: "Casual", label: "Casual", emoji: "☕", desc: "Relaxed, natural & friendly conversation" },
  { value: "Curious", label: "Curious", emoji: "🧐", desc: "Asks a genuine, engaging question" },
  { value: "Funny", label: "Funny", emoji: "😂", desc: "Natural humor without cringe" },
  { value: "Technical", label: "Technical", emoji: "💻", desc: "Engineering & builder-focused angle" },
  { value: "Bold", label: "Bold", emoji: "🔥", desc: "Direct, punchy & confident stance" },
  { value: "Supportive", label: "Supportive", emoji: "🤝", desc: "Encouraging, positive & uplifting" },
  { value: "Contrarian", label: "Contrarian", emoji: "🤔", desc: "Respectful alternate perspective" }
]

function Options() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("providers")
  const [searchQuery, setSearchQuery] = useState("")
  
  // Extension Config
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [isExtensionEnabled, setIsExtensionEnabled] = useState(true)
  
  // Preference States
  const [defaultTone, setDefaultTone] = useState<string>("Smart")
  const [defaultNumReplies, setDefaultNumReplies] = useState<number>(3)
  const [globalCustomPrompt, setGlobalCustomPrompt] = useState<string>("")
  
  // Edit Account State
  const [editingProvider, setEditingProvider] = useState<ProviderId | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editKey, setEditKey] = useState("")
  const [editModel, setEditModel] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [editEnabled, setEditEnabled] = useState(true)
  
  // Testing status state per account
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ providerId: ProviderId; accountId: string } | null>(null)

  // Status message toast
  const [statusMsg, setStatusMsg] = useState("")
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("")

  const providerList: ProviderId[] = ["gemini", "groq", "openrouter"]

  useEffect(() => {
    // 1. Load AI Config
    AIManager.getConfig().then(c => {
      setConfig(c)
      setLoading(false)
    })

    // 2. Load Extension Preferences
    chrome.storage.local.get(
      ["isExtensionEnabled", "replyly_defaultTone", "replyly_numReplies", "replyly_globalCustomPrompt"],
      (res) => {
        if (res.isExtensionEnabled !== undefined) setIsExtensionEnabled(res.isExtensionEnabled)
        if (res.replyly_defaultTone) setDefaultTone(res.replyly_defaultTone)
        if (res.replyly_numReplies) setDefaultNumReplies(res.replyly_numReplies)
        if (res.replyly_globalCustomPrompt) setGlobalCustomPrompt(res.replyly_globalCustomPrompt)
      }
    )
    
    // Interval to refresh cooldown countdown timers
    const interval = setInterval(() => {
      setConfig(c => ({ ...c }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const showStatus = (msg: string, type: "success" | "error" | "info") => {
    setStatusMsg(msg)
    setStatusType(type)
    setTimeout(() => setStatusMsg(""), 4500)
  }

  // Active Provider
  const handleActiveProviderChange = async (newActive: ProviderId | null) => {
    const newConfig = { ...config, activeProvider: newActive }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    showStatus(`Active provider switched to ${newActive ? PROVIDERS[newActive].name : "None"}`, "success")
  }
  
  // Fallback Settings
  const handleFallbackEnabledChange = async (enabled: boolean) => {
    const newConfig = { ...config, fallbackEnabled: enabled }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    showStatus(`Auto-failover ${enabled ? "enabled" : "disabled"}`, "info")
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

  // Account editing
  const startAdding = (id: ProviderId) => {
    setEditingProvider(id)
    setEditingAccountId(null)
    setEditName(`${PROVIDER_METADATA[id].name} Key`)
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
      showStatus("Please provide both an account name and an API key.", "error")
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
    
    showStatus(`✓ ${editName.trim()} saved successfully!`, "success")
    cancelEditing()
  }

  const toggleAccountEnabled = async (providerId: ProviderId, accountId: string, currentEnabled: boolean) => {
    await AIManager.updateAccountState(providerId, accountId, { enabled: !currentEnabled })
    const updated = await AIManager.getConfig()
    setConfig(updated)
    showStatus(`Account ${!currentEnabled ? "enabled" : "disabled"}`, "info")
  }

  const removeAccount = async (providerId: ProviderId, accountId: string) => {
    const newConfig = { ...config }
    const pConfig = newConfig.providers[providerId]
    if (pConfig && pConfig.accounts) {
      pConfig.accounts = pConfig.accounts.filter(a => a.id !== accountId)
    }

    // If active provider has no accounts left, pick another provider or null
    if (newConfig.activeProvider === providerId) {
      const remainingProviders = providerList.filter(id => (newConfig.providers[id]?.accounts.length || 0) > 0)
      newConfig.activeProvider = remainingProviders[0] || null
    }

    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    setDeleteConfirmId(null)
    showStatus(`Account deleted.`, "info")
  }

  const testAccount = async (providerId: ProviderId, accountId: string) => {
    const pConfig = config.providers[providerId]
    const account = pConfig?.accounts.find(a => a.id === accountId)
    if (!account) return

    setTestingId(accountId)
    const startTime = Date.now()

    try {
      const provider = PROVIDERS[providerId]
      const success = await provider.testConnection(account.apiKey, account.model)
      const duration = Date.now() - startTime
      
      if (success) {
        showStatus(`✓ Success! Connected in ${duration}ms`, "success")
        await AIManager.updateAccountState(providerId, accountId, { status: "healthy", cooldownUntil: null })
        const c = await AIManager.getConfig()
        setConfig(c)
      }
    } catch (err: any) {
      showStatus(err.message || "Connection failed. Please check the API key.", "error")
      await AIManager.updateAccountState(providerId, accountId, { 
        status: err.type === "RATE_LIMITED" ? "rate_limited" : (err.type === "INVALID_API_KEY" ? "invalid" : "unknown")
      })
      const c = await AIManager.getConfig()
      setConfig(c)
    } finally {
      setTestingId(null)
    }
  }

  // Preference handlers
  const handleExtensionToggle = (enabled: boolean) => {
    setIsExtensionEnabled(enabled)
    chrome.storage.local.set({ isExtensionEnabled: enabled })
    showStatus(`Replyly extension is now ${enabled ? "turned ON" : "turned OFF"}`, "info")
  }

  const handleDefaultToneChange = (tone: string) => {
    setDefaultTone(tone)
    chrome.storage.local.set({ replyly_defaultTone: tone })
    showStatus(`Default tone set to "${tone}"`, "success")
  }

  const handleNumRepliesChange = (count: number) => {
    setDefaultNumReplies(count)
    chrome.storage.local.set({ replyly_numReplies: count })
    showStatus(`Default reply count set to ${count}`, "success")
  }

  const handleGlobalCustomPromptChange = (val: string) => {
    setGlobalCustomPrompt(val)
    chrome.storage.local.set({ replyly_globalCustomPrompt: val })
  }

  // Search filter helper
  const totalConfiguredAccounts = useMemo(() => {
    return providerList.reduce((acc, id) => acc + (config.providers[id]?.accounts.length || 0), 0)
  }, [config])

  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providerList
    const q = searchQuery.toLowerCase().trim()
    return providerList.filter(id => {
      const meta = PROVIDER_METADATA[id]
      const accounts = config.providers[id]?.accounts || []
      const models = MODELS[id]
      return (
        meta.name.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q) ||
        accounts.some(a => a.name.toLowerCase().includes(q) || a.model.toLowerCase().includes(q)) ||
        models.some(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
      )
    })
  }, [searchQuery, config])

  const getCooldownText = (timestamp: number | null) => {
    if (!timestamp) return null
    const diff = timestamp - Date.now()
    if (diff <= 0) return null
    return `Available again in ${Math.ceil(diff / 1000)}s`
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#64748b" }}>
        Loading Replyly Settings...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: "#0f172a",
      padding: "24px 16px 80px",
      boxSizing: "border-box"
    }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        
        {/* Top Header Card */}
        <header style={{
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          border: "1px solid #e2e8f0",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#e0f2fe",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px"
              }}>
                ✨
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.4px" }}>
                    Replyly Settings
                  </h1>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "9999px",
                    backgroundColor: isExtensionEnabled ? "#dcfce7" : "#f1f5f9",
                    color: isExtensionEnabled ? "#15803d" : "#64748b"
                  }}>
                    {isExtensionEnabled ? "● Extension Active" : "○ Turned Off"}
                  </span>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#64748b" }}>
                  Super simple AI configuration. Your keys never leave your browser.
                </p>
              </div>
            </div>

            {/* Quick Extension Master Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
                Extension Power:
              </span>
              <button
                onClick={() => handleExtensionToggle(!isExtensionEnabled)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  border: "none",
                  backgroundColor: isExtensionEnabled ? "#10b981" : "#cbd5e1",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease"
                }}
              >
                {isExtensionEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Universal Search Bar */}
          <div style={{ marginTop: "16px", position: "relative" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "#f1f5f9",
              borderRadius: "12px",
              padding: "10px 14px",
              border: "1px solid #e2e8f0"
            }}>
              <span style={{ fontSize: "16px", color: "#64748b" }}>🔍</span>
              <input
                type="text"
                placeholder="Search settings, AI providers, models, or guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  color: "#0f172a"
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    border: "none",
                    background: "#cbd5e1",
                    color: "#475569",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px", paddingLeft: "4px" }}>
                Found matches in <strong>{filteredProviders.length}</strong> AI provider{filteredProviders.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </header>

        {/* Quick First-Time Onboarding Banner (if no accounts added) */}
        {totalConfiguredAccounts === 0 && (
          <div style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "16px",
            padding: "18px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>👋</span>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#1e40af" }}>
                  Get started in 30 seconds
                </div>
                <div style={{ fontSize: "13px", color: "#3b82f6" }}>
                  Add a 100% free Google Gemini key or Groq key to start generating replies immediately!
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => {
                  setActiveTab("providers")
                  startAdding("gemini")
                }}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                + Add Free Gemini Key
              </button>
              <button
                onClick={() => setActiveTab("guides")}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                View Step-by-Step Guide
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          backgroundColor: "#ffffff",
          padding: "6px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          overflowX: "auto"
        }}>
          <button
            onClick={() => setActiveTab("providers")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: activeTab === "providers" ? "#0284c7" : "transparent",
              color: activeTab === "providers" ? "#ffffff" : "#475569",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease"
            }}
          >
            <span>🔑</span> AI Providers & Keys
            {totalConfiguredAccounts > 0 && (
              <span style={{
                backgroundColor: activeTab === "providers" ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                color: activeTab === "providers" ? "#ffffff" : "#475569",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "11px"
              }}>
                {totalConfiguredAccounts}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("failover")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: activeTab === "failover" ? "#0284c7" : "transparent",
              color: activeTab === "failover" ? "#ffffff" : "#475569",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease"
            }}
          >
            <span>🛡️</span> Smart Failover
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: activeTab === "preferences" ? "#0284c7" : "transparent",
              color: activeTab === "preferences" ? "#ffffff" : "#475569",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease"
            }}
          >
            <span>⚙️</span> Preferences
          </button>

          <button
            onClick={() => setActiveTab("guides")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: activeTab === "guides" ? "#0284c7" : "transparent",
              color: activeTab === "guides" ? "#ffffff" : "#475569",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease"
            }}
          >
            <span>📖</span> Guides & Help
          </button>
        </nav>

        {/* TAB 1: AI PROVIDERS & KEYS */}
        {activeTab === "providers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Primary Provider Selector Card */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Primary AI Provider
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
                    Select which AI provider is used first when generating replies.
                  </p>
                </div>
                {config.activeProvider && (
                  <span style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: "9999px",
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1"
                  }}>
                    Active: {PROVIDERS[config.activeProvider].name}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "14px" }}>
                {providerList.map(id => {
                  const meta = PROVIDER_METADATA[id]
                  const hasAccounts = (config.providers[id]?.accounts.length || 0) > 0
                  const isSelected = config.activeProvider === id

                  return (
                    <button
                      key={id}
                      onClick={() => hasAccounts && handleActiveProviderChange(id)}
                      disabled={!hasAccounts}
                      style={{
                        padding: "14px",
                        borderRadius: "12px",
                        border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                        backgroundColor: isSelected ? "#f0f9ff" : hasAccounts ? "#ffffff" : "#f8fafc",
                        cursor: hasAccounts ? "pointer" : "not-allowed",
                        textAlign: "left",
                        opacity: hasAccounts ? 1 : 0.6,
                        transition: "all 0.15s ease",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "18px" }}>{meta.icon}</span>
                          <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>{meta.name}</span>
                        </div>
                        {isSelected && (
                          <span style={{ color: "#0284c7", fontSize: "16px", fontWeight: 800 }}>✓</span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: hasAccounts ? "#64748b" : "#94a3b8", marginTop: "6px" }}>
                        {hasAccounts ? `${config.providers[id]!.accounts.length} key connected` : "No key connected yet"}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Provider List Sections */}
            {filteredProviders.map(id => {
              const meta = PROVIDER_METADATA[id]
              const pConfig = config.providers[id]
              const accounts = pConfig?.accounts || []
              const isAddingNew = editingProvider === id && !editingAccountId

              return (
                <div
                  key={id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    padding: "20px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                  }}
                >
                  {/* Provider Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        backgroundColor: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px"
                      }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                            {meta.name}
                          </h3>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            backgroundColor: "#f1f5f9",
                            color: "#475569"
                          }}>
                            {meta.badge}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <a
                        href={meta.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "12px",
                          color: "#0284c7",
                          textDecoration: "none",
                          fontWeight: 600,
                          padding: "6px 10px",
                          borderRadius: "8px",
                          backgroundColor: "#f0f9ff",
                          border: "1px solid #bae6fd"
                        }}
                      >
                        Get Free Key ↗
                      </a>

                      {!isAddingNew && (
                        <button
                          onClick={() => startAdding(id)}
                          style={{
                            backgroundColor: "#0284c7",
                            color: "#ffffff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          + Add Key
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Configured Accounts List */}
                  {accounts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: isAddingNew ? "16px" : "0" }}>
                      {accounts.map(account => {
                        const cooldownText = getCooldownText(account.cooldownUntil)
                        const isHealthy = account.status === "healthy"
                        const isRateLimited = account.status === "rate_limited" || Boolean(cooldownText)
                        const isInvalid = account.status === "invalid"
                        const isTesting = testingId === account.id
                        const isEditingThis = editingProvider === id && editingAccountId === account.id

                        if (isEditingThis) return null // Handled in edit pane below

                        return (
                          <div
                            key={account.id}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              padding: "14px 16px",
                              backgroundColor: isRateLimited ? "#fffbeb" : isInvalid ? "#fef2f2" : "#f8fafc",
                              opacity: account.enabled ? 1 : 0.65,
                              transition: "all 0.15s ease"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                                    {account.name}
                                  </span>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", backgroundColor: "#ffffff", padding: "2px 6px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                    {account.model}
                                  </span>
                                  {!account.enabled && (
                                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "6px" }}>
                                      Disabled
                                    </span>
                                  )}
                                </div>

                                {/* Status Tag */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", fontSize: "12px", fontWeight: 600 }}>
                                  {isInvalid ? (
                                    <span style={{ color: "#dc2626" }}>🔴 Invalid API Key (Please update)</span>
                                  ) : isRateLimited ? (
                                    <span style={{ color: "#d97706" }}>🟡 Rate limited {cooldownText ? `— ${cooldownText}` : ""}</span>
                                  ) : isHealthy ? (
                                    <span style={{ color: "#16a34a" }}>🟢 Ready & Healthy</span>
                                  ) : (
                                    <span style={{ color: "#64748b" }}>⚪ Connected (Not tested yet)</span>
                                  )}
                                </div>
                              </div>

                              {/* Account Actions */}
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <button
                                  onClick={() => testAccount(id, account.id)}
                                  disabled={isTesting}
                                  title="Test connection with this key"
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#ffffff",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: "#334155",
                                    cursor: isTesting ? "wait" : "pointer"
                                  }}
                                >
                                  {isTesting ? "Testing..." : "⚡ Test"}
                                </button>

                                <button
                                  onClick={() => toggleAccountEnabled(id, account.id, account.enabled)}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#ffffff",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: account.enabled ? "#475569" : "#16a34a",
                                    cursor: "pointer"
                                  }}
                                >
                                  {account.enabled ? "Disable" : "Enable"}
                                </button>

                                <button
                                  onClick={() => startEditing(id, account)}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#ffffff",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "#0f172a",
                                    cursor: "pointer"
                                  }}
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() => setDeleteConfirmId({ providerId: id, accountId: account.id })}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "8px",
                                    border: "1px solid #fee2e2",
                                    backgroundColor: "#fff5f5",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "#dc2626",
                                    cursor: "pointer"
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Empty state for provider */}
                  {accounts.length === 0 && !isAddingNew && (
                    <div style={{
                      textAlign: "center",
                      padding: "20px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "12px",
                      border: "1px dashed #cbd5e1"
                    }}>
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                        No API keys configured for {meta.name} yet.
                      </div>
                      <button
                        onClick={() => startAdding(id)}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          color: "#0284c7",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        + Add {meta.name} Key
                      </button>
                    </div>
                  )}

                  {/* Add / Edit Form Pane */}
                  {editingProvider === id && (
                    <div style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: "14px",
                      padding: "18px",
                      border: "1px solid #bae6fd",
                      marginTop: accounts.length > 0 ? "12px" : "0"
                    }}>
                      <h4 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                        {editingAccountId ? "✏️ Edit API Key Account" : `➕ Add New ${meta.name} Key`}
                      </h4>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                            Account Nickname
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. Personal Free Key, Work Backup, etc."
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "14px",
                              boxSizing: "border-box",
                              backgroundColor: "#ffffff"
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                              API Key
                            </label>
                            <a
                              href={meta.link}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: "11px", color: "#0284c7", fontWeight: 600, textDecoration: "none" }}
                            >
                              Get key on {meta.portalName} ↗
                            </a>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input
                              type={showKey ? "text" : "password"}
                              value={editKey}
                              onChange={(e) => setEditKey(e.target.value)}
                              placeholder={`Paste your ${meta.name} API key here`}
                              style={{
                                flex: 1,
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "14px",
                                boxSizing: "border-box",
                                backgroundColor: "#ffffff"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              style={{
                                padding: "0 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#475569",
                                cursor: "pointer"
                              }}
                            >
                              {showKey ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                            AI Model
                          </label>
                          <select
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "14px",
                              boxSizing: "border-box",
                              backgroundColor: "#ffffff",
                              color: "#0f172a"
                            }}
                          >
                            {MODELS[id].map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} — {m.tag} ({m.description})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={editEnabled}
                              onChange={(e) => setEditEnabled(e.target.checked)}
                              style={{ width: "16px", height: "16px" }}
                            />
                            Enable this account immediately
                          </label>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                          <button
                            onClick={saveAccount}
                            style={{
                              backgroundColor: "#0284c7",
                              color: "#ffffff",
                              border: "none",
                              padding: "9px 18px",
                              borderRadius: "8px",
                              fontSize: "13px",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            Save Account
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              backgroundColor: "transparent",
                              color: "#64748b",
                              border: "1px solid #cbd5e1",
                              padding: "9px 16px",
                              borderRadius: "8px",
                              fontSize: "13px",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )
            })}

          </div>
        )}

        {/* TAB 2: SMART FAILOVER */}
        {activeTab === "failover" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                    Automatic Failover & Backup Protection
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                    Never get stuck waiting when an AI provider hits rate limits or experiences downtime.
                  </p>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={config.fallbackEnabled}
                    onChange={(e) => handleFallbackEnabledChange(e.target.checked)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: config.fallbackEnabled ? "#0284c7" : "#64748b" }}>
                    {config.fallbackEnabled ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>

              {/* Visual Flow Representation */}
              <div style={{
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid #e2e8f0",
                marginBottom: "20px"
              }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                  How Smart Failover Works:
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "13px" }}>
                  <div style={{ padding: "6px 12px", backgroundColor: "#e0f2fe", color: "#0369a1", borderRadius: "8px", fontWeight: 700 }}>
                    1. Primary ({config.activeProvider ? PROVIDERS[config.activeProvider].name : "Select Provider"})
                  </div>
                  <span style={{ color: "#94a3b8", fontWeight: 700 }}>➔ (If rate-limited) ➔</span>
                  <div style={{ padding: "6px 12px", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "8px", fontWeight: 700 }}>
                    2. Automatic Fallback Provider
                  </div>
                  <span style={{ color: "#94a3b8", fontWeight: 700 }}>➔</span>
                  <div style={{ padding: "6px 12px", backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "8px", fontWeight: 700 }}>
                    3. Instant Reply Generated ✨
                  </div>
                </div>
              </div>

              {/* Fallback Selection */}
              {config.fallbackEnabled && (
                <div>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                    Select Allowed Fallback Providers:
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                    {providerList.map(id => {
                      const meta = PROVIDER_METADATA[id]
                      const isPrimary = id === config.activeProvider
                      const hasAccounts = (config.providers[id]?.accounts.length || 0) > 0
                      const isChecked = config.fallbackProviders.includes(id)

                      return (
                        <div
                          key={id}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "12px 14px",
                            backgroundColor: isPrimary ? "#f1f5f9" : isChecked ? "#f0f9ff" : "#ffffff",
                            opacity: isPrimary || !hasAccounts ? 0.7 : 1
                          }}
                        >
                          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isPrimary || !hasAccounts ? "not-allowed" : "pointer" }}>
                            <input
                              type="checkbox"
                              checked={isChecked && !isPrimary}
                              disabled={isPrimary || !hasAccounts}
                              onChange={() => toggleFallbackProvider(id)}
                              style={{ width: "16px", height: "16px" }}
                            />
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                                {meta.name} {isPrimary && "(Current Primary)"}
                              </div>
                              <div style={{ fontSize: "11px", color: hasAccounts ? "#64748b" : "#dc2626" }}>
                                {hasAccounts ? `${config.providers[id]!.accounts.length} key connected` : "Requires API key"}
                              </div>
                            </div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PREFERENCES */}
        {activeTab === "preferences" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                Reply Defaults & Custom Rules
              </h2>

              {/* Default Tone */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Default Reply Tone
                </label>
                <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b" }}>
                  The default tone pre-selected whenever you open the Replyly modal.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
                  {TONES.map(t => {
                    const isSelected = defaultTone === t.value
                    return (
                      <button
                        key={t.value}
                        onClick={() => handleDefaultToneChange(t.value)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                          backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{t.emoji}</span> {t.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                          {t.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Number of Replies */}
              <div style={{ marginBottom: "24px", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Replies Generated Per Post
                </label>
                <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#64748b" }}>
                  Choose how many reply variations you want generated at once.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[1, 2, 3, 5].map(num => {
                    const isSelected = defaultNumReplies === num
                    return (
                      <button
                        key={num}
                        onClick={() => handleNumRepliesChange(num)}
                        style={{
                          padding: "10px 20px",
                          borderRadius: "10px",
                          border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                          backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: isSelected ? "#0284c7" : "#475569",
                          cursor: "pointer"
                        }}
                      >
                        {num} {num === 1 ? "Reply" : "Replies"} {num === 3 && "(Recommended)"}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Global Custom Prompt Instructions */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                  Persistent Persona & Guidelines (Optional)
                </label>
                <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#64748b" }}>
                  Rules added here are automatically appended to all your reply generations (e.g. &quot;Always sound like a senior software engineer&quot; or &quot;Never use buzzwords&quot;).
                </p>
                <textarea
                  value={globalCustomPrompt}
                  onChange={(e) => handleGlobalCustomPromptChange(e.target.value)}
                  placeholder="e.g. Keep replies under 150 characters. Do not use exclamation marks. Speak like an AI engineer."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    boxSizing: "border-box",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    fontFamily: "inherit"
                  }}
                />
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: GUIDES & FAQ */}
        {activeTab === "guides" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Guide Card 1: Google Gemini */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>✨</span>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    How to get a Free Google Gemini API Key
                  </h3>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#0284c7",
                    backgroundColor: "#f0f9ff",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    border: "1px solid #bae6fd"
                  }}
                >
                  Open AI Studio ↗
                </a>
              </div>
              <ol style={{ margin: "0", paddingLeft: "20px", fontSize: "13px", color: "#475569", lineHeight: "1.8" }}>
                <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#0284c7", fontWeight: 600 }}>Google AI Studio (aistudio.google.com)</a>.</li>
                <li>Sign in with your standard Google account.</li>
                <li>Click on the blue <strong>&quot;Create API Key&quot;</strong> button.</li>
                <li>Copy the key, switch to the <strong>AI Providers & Keys</strong> tab here, and paste it into Gemini.</li>
              </ol>
            </div>

            {/* Guide Card 2: Groq */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>⚡</span>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    How to get a Free GroqCloud API Key
                  </h3>
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#0284c7",
                    backgroundColor: "#f0f9ff",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    border: "1px solid #bae6fd"
                  }}
                >
                  Open Groq Console ↗
                </a>
              </div>
              <ol style={{ margin: "0", paddingLeft: "20px", fontSize: "13px", color: "#475569", lineHeight: "1.8" }}>
                <li>Visit the <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: "#0284c7", fontWeight: 600 }}>Groq Console</a>.</li>
                <li>Create a free account or sign in with GitHub/Google.</li>
                <li>Click <strong>&quot;Create API Key&quot;</strong>.</li>
                <li>Paste the key into Replyly for instant ultra-fast responses!</li>
              </ol>
            </div>

            {/* Privacy & Security FAQ Card */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ fontSize: "20px" }}>🔒</span>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                  Privacy & Bring Your Own Key (BYOK) Security
                </h3>
              </div>
              <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
                <p style={{ margin: "0 0 10px 0" }}>
                  <strong>Are my API keys sent to any third-party server?</strong><br />
                  No! Replyly uses a 100% client-side BYOK architecture. Your keys are stored strictly in your browser&apos;s local storage and only communicate directly with official provider endpoints (Google, Groq, OpenRouter).
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Is this free?</strong><br />
                  Yes! Google Gemini and Groq offer generous free daily quotas suitable for hundreds of replies daily without any subscription fees.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "16px"
          }}>
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                Delete Account?
              </h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>
                Are you sure you want to remove this API key account? You can always add it back later.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeAccount(deleteConfirmId.providerId, deleteConfirmId.accountId)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#dc2626",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {statusMsg && (
          <div style={{
            position: "fixed",
            bottom: "32px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 20px",
            borderRadius: "9999px",
            fontSize: "14px",
            fontWeight: 700,
            backgroundColor: statusType === "error" ? "#dc2626" : statusType === "success" ? "#16a34a" : "#0284c7",
            color: "#ffffff",
            boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "fadeIn 0.2s ease-in-out"
          }}>
            <span>{statusType === "error" ? "✕" : statusType === "success" ? "✓" : "ℹ"}</span>
            <span>{statusMsg}</span>
          </div>
        )}

      </div>
    </div>
  )
}

export default Options
