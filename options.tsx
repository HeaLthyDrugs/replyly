import React, { useEffect, useMemo, useState } from "react"
import { AIManager, DEFAULT_CONFIG, PROVIDERS } from "./lib/ai/manager"
import type { AIConfig, ProviderId, AIAccount } from "./lib/ai/types"
import { RlyLogoIcon } from "./components/Logo"

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
    icon: "💎",
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

const RLY_FAVICON_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADb0lEQVR4nO1WW0iTYRi28K6DYjeaWBcFgoIJWc6c5rFs0yzdhUJdSBCEFF6U8zRtE0/plMCIKDLocKGZmzdlkUuiwAsVDBsdNHXLnU/+5mFO33i/+f0bhexgIoQP/PD9/354nv99n/d9FhCwjW34iJ07AgOjw84Kzse2dxQl9CqKOHLFuZj2jqjQHAH+tqnk4cGxcddSB5WSHBNIsk0g5htBzDPCzTN4GaCY+1G5f29s3KaQHwzhcEU8FbMeeU2WAWpO66Es/QdzIDieuyXk1af0UJ2pA2HqBBMRfPzfiPCVXJSBlxaEKeNMRNAGRfhLXpWuhao0LZQmf/dfhD/kDXl6qM3WEfKqVA2I0jUgzp3wXQS6Hcnr88xw76oVZG1zIGtloLNuFiR8J3lDngFaL5pAwtez5CsOAPUXO1RnaKAyRQOjb+cBcad4ignbfcS76cBZpqMmb5uDPzHYO0++fOT1Arl/cctGyo5fzphWyDN5qw0elBjJGUW1FOjg8tEBpVd7ApcMLbtsTcD4iB1kUoacLVoHKftIn0sA7Xl3o5U8+2VdAe3EMjm/e8JAOVcNZVw1RO7jCzwKwA1He45lR4y9X4T7JRaXgEwdDK8J6G6ysT3Hsk+P2dlqzZocIM6aIeRliSrgH27t8CgA1ys1HBXgDuWHRdJzlwArS16ZMgN3rxjYd7vqzCy58IQKCqM7FZ4FcOQK6nZadoqpT3ZoyDeQng/3OQ2GZafkFSdnoCL5J/t+k0DDkgsTVFAY5YUADBY6aj3SWWdPbU5zLTCr0FxgID0ffuUuwEVenuQmIF/DkpdypoF3SOq5BZhqdM57WpwC0HDjQ0vkPNq/QHpOBUyOLsHQy3kYeMoQcjQcRWOehiUvjZ+GyBCeZxPiqGCq4aj1NDsFYL9vFxlheWmV3D8SmlkBFGaNg3W7S8AMS34ppt+7MURgpGKq4ZKRXjBCXa6elP3NQ6cnepqtUJuthWfVZnheb4Guegs8LjeyhtNPLsPS/CrUZKoJeUncZyZ0V4xvMY2RiqnmvtvR7S0F+r96Tr+cGk6UpgZxlos8fM8x//IAIxVTzX3OPZG793xD5KyIoONcTLUtIXcXcSPpG7Ml5O4irid+ZbaEnAIjFVNtPXIcNZ/d7itwljHVMFhwt+N6xQ2HS2bT/5Zv47/Eb4tqgGNC1bwjAAAAAElFTkSuQmCC"

export function Options() {
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
    // 0. Set Title and Favicon
    document.title = "Replyly Settings"
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.type = "image/png"
    link.href = RLY_FAVICON_DATA_URI

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
    if (newConfig.providers[providerId]) {
      newConfig.providers[providerId]!.accounts = newConfig.providers[providerId]!.accounts.filter(a => a.id !== accountId)
      
      if (newConfig.providers[providerId]!.accounts.length === 0 && newConfig.activeProvider === providerId) {
        const remaining = providerList.find(p => (newConfig.providers[p]?.accounts.length || 0) > 0) || null
        newConfig.activeProvider = remaining
      }
    }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    setDeleteConfirmId(null)
    showStatus("Account deleted.", "info")
  }

  const testAccount = async (providerId: ProviderId, account: AIAccount) => {
    setTestingId(account.id)
    try {
      await AIManager.testAccountConnection(providerId, account)
      const updated = await AIManager.getConfig()
      setConfig(updated)
      showStatus(`✓ ${account.name} verified successfully!`, "success")
    } catch (err: any) {
      const updated = await AIManager.getConfig()
      setConfig(updated)
      showStatus(`✕ Test failed: ${err.message}`, "error")
    } finally {
      setTestingId(null)
    }
  }

  const handleExtensionToggle = (enabled: boolean) => {
    setIsExtensionEnabled(enabled)
    chrome.storage.local.set({ isExtensionEnabled: enabled })
    showStatus(`Extension ${enabled ? "enabled" : "disabled"}`, "info")
  }

  const handleDefaultToneChange = (tone: string) => {
    setDefaultTone(tone)
    chrome.storage.local.set({ replyly_defaultTone: tone })
    showStatus(`Default tone set to ${tone}`, "success")
  }

  const handleNumRepliesChange = (num: number) => {
    setDefaultNumReplies(num)
    chrome.storage.local.set({ replyly_numReplies: num })
    showStatus(`Default replies count set to ${num}`, "success")
  }

  const handleGlobalCustomPromptChange = (prompt: string) => {
    setGlobalCustomPrompt(prompt)
    chrome.storage.local.set({ replyly_globalCustomPrompt: prompt })
  }

  const totalConfiguredAccounts = useMemo(() => {
    return Object.values(config.providers).reduce((sum, p) => sum + (p?.accounts.length || 0), 0)
  }, [config])

  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providerList
    const q = searchQuery.toLowerCase()
    return providerList.filter(id => {
      const meta = PROVIDER_METADATA[id]
      const matchesName = meta.name.toLowerCase().includes(q)
      const matchesDesc = meta.description.toLowerCase().includes(q)
      const matchesModel = MODELS[id].some(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
      return matchesName || matchesDesc || matchesModel
    })
  }, [searchQuery, providerList])

  const getCooldownText = (cooldownUntil: number | null | undefined) => {
    if (!cooldownUntil) return null
    const diff = cooldownUntil - Date.now()
    if (diff <= 0) return null
    return `Cooldown active (${Math.ceil(diff / 1000)}s left)`
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "system-ui, sans-serif", color: "#7c3aed", fontWeight: 700 }}>
        Loading Settings...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#fafafa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: "#111827",
      boxSizing: "border-box"
    }}>
      <style>{`
        @keyframes rly-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Main Structured Column with Left & Right Vertical Separators */}
      <div style={{
        maxWidth: "840px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        borderLeft: "1px solid #e5e7eb",
        borderRight: "1px solid #e5e7eb",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column"
      }}>
        
        {/* Header Section */}
        <div style={{ padding: "36px 32px 0 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <RlyLogoIcon size={30} />
                <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#111827", letterSpacing: "-0.6px" }}>
                  Settings
                </h1>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
                Manage your AI provider keys, failover rules, and reply preferences.
              </p>
            </div>

            {/* Extension Power Toggle */}
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "5px 12px", backgroundColor: "#f9fafb", borderRadius: "9999px", border: "1px solid #e5e7eb"
            }}>
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#4b5563" }}>
                Extension:
              </span>
              <button
                onClick={() => handleExtensionToggle(!isExtensionEnabled)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: "12.5px", fontWeight: 700,
                  color: isExtensionEnabled ? "#7c3aed" : "#9ca3af"
                }}
              >
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: isExtensionEnabled ? "#7c3aed" : "#9ca3af"
                }} />
                {isExtensionEnabled ? "Active" : "Disabled"}
              </button>
            </div>
          </div>
        </div>

        {/* Full-bleed Line Tabs Bar touching left and right vertical borders */}
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: "32px",
            borderBottom: "1px solid #e5e7eb",
            marginTop: "24px",
            paddingLeft: "32px",
            paddingRight: "32px",
            overflow: "hidden"
          }}
        >
          {[
            { id: "providers", label: "AI Providers & Keys", count: totalConfiguredAccounts },
            { id: "failover", label: "Smart Failover" },
            { id: "preferences", label: "Preferences" },
            { id: "guides", label: "Guides & FAQ" }
          ].map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                style={{
                  padding: "12px 2px",
                  background: "none",
                  border: "none",
                  borderBottom: isActive ? "2px solid #7c3aed" : "2px solid transparent",
                  color: isActive ? "#7c3aed" : "#6b7280",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  marginBottom: "-1px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#111827"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "#6b7280"
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span style={{
                    fontSize: "11px", fontWeight: 700, padding: "1px 7px",
                    borderRadius: "9999px",
                    backgroundColor: isActive ? "#f5f3ff" : "#f3f4f6",
                    color: isActive ? "#7c3aed" : "#6b7280"
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content Section between the Vertical Separators */}
        <div style={{ padding: "28px 32px 80px 32px", flex: 1 }}>

        {/* TAB 1: AI PROVIDERS & KEYS */}
        {activeTab === "providers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Primary Provider Selector */}
            <div style={{
              backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 22px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                    Primary AI Provider
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6b7280" }}>
                    Select which AI engine handles your replies by default.
                  </p>
                </div>
                {config.activeProvider && (
                  <span style={{
                    fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "9999px",
                    backgroundColor: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe"
                  }}>
                    Active: {PROVIDERS[config.activeProvider].name}
                  </span>
                )}
              </div>

              {/* 3 Selectable Provider Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {providerList.map(id => {
                  const meta = PROVIDER_METADATA[id]
                  const isSelected = config.activeProvider === id
                  const accountCount = config.providers[id]?.accounts.length || 0

                  return (
                    <div
                      key={id}
                      onClick={() => handleActiveProviderChange(id)}
                      style={{
                        padding: "14px 16px", borderRadius: "12px",
                        border: isSelected ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                        backgroundColor: isSelected ? "#faf5ff" : "#ffffff",
                        cursor: "pointer", transition: "all 0.15s ease",
                        position: "relative"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#d1d5db"
                          e.currentTarget.style.backgroundColor = "#f9fafb"
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#e5e7eb"
                          e.currentTarget.style.backgroundColor = "#ffffff"
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "18px" }}>{meta.icon}</span>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: isSelected ? "#7c3aed" : "#111827" }}>
                            {meta.name}
                          </span>
                        </div>
                        {isSelected && (
                          <span style={{ color: "#7c3aed", fontWeight: 800, fontSize: "15px" }}>✓</span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: accountCount > 0 ? "#059669" : "#6b7280", fontWeight: 500 }}>
                        {accountCount > 0 ? `${accountCount} key connected` : "No key added yet"}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Provider Configuration Cards */}
            {filteredProviders.map(id => {
              const meta = PROVIDER_METADATA[id]
              const accounts = config.providers[id]?.accounts || []
              const isAddingNew = editingProvider === id && !editingAccountId

              return (
                <div
                  key={id}
                  style={{
                    backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 22px",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "22px" }}>{meta.icon}</span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3 style={{ margin: 0, fontSize: "15.5px", fontWeight: 700, color: "#111827" }}>
                            {meta.name}
                          </h3>
                          <span style={{
                            fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "9999px",
                            backgroundColor: "#f3f4f6", color: "#4b5563"
                          }}>
                            {meta.badge}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#6b7280" }}>
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
                          fontSize: "12px", color: "#7c3aed", textDecoration: "none",
                          fontWeight: 700, padding: "6px 12px", borderRadius: "8px",
                          backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe"
                        }}
                      >
                        Get Free Key ↗
                      </a>

                      {!isAddingNew && (
                        <button
                          onClick={() => startAdding(id)}
                          style={{
                            backgroundColor: "#7c3aed", color: "#ffffff", border: "none",
                            padding: "6px 14px", borderRadius: "8px", fontSize: "12px",
                            fontWeight: 700, cursor: "pointer"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#6d28d9"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#7c3aed"}
                        >
                          + Add Key
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Connected Accounts List */}
                  {accounts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: editingProvider === id ? "14px" : "0" }}>
                      {accounts.map(acc => {
                        const isTesting = testingId === acc.id
                        const cooldown = getCooldownText(acc.cooldownUntil)
                        const modelInfo = MODELS[id].find(m => m.id === acc.model)

                        return (
                          <div
                            key={acc.id}
                            style={{
                              padding: "12px 14px", borderRadius: "10px",
                              backgroundColor: "#f9fafb", border: "1px solid #e5e7eb",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              flexWrap: "wrap", gap: "10px"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "8px", height: "8px", borderRadius: "50%",
                                backgroundColor: !acc.enabled ? "#9ca3af" : cooldown ? "#f59e0b" : "#10b981",
                                animation: acc.enabled && !cooldown ? "rly-pulse 2s infinite" : "none"
                              }} />
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>
                                    {acc.name}
                                  </span>
                                  <span style={{
                                    fontSize: "11px", fontWeight: 600, padding: "1px 6px", borderRadius: "4px",
                                    backgroundColor: "#ffffff", color: "#4b5563", border: "1px solid #e5e7eb"
                                  }}>
                                    {modelInfo?.name || acc.model}
                                  </span>
                                </div>
                                <div style={{ fontSize: "11px", color: !acc.enabled ? "#6b7280" : cooldown ? "#d97706" : "#059669", marginTop: "2px", fontWeight: 500 }}>
                                  {!acc.enabled ? "Disabled" : cooldown ? cooldown : "Ready & Active"}
                                </div>
                              </div>
                            </div>

                            {/* Account Actions */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button
                                onClick={() => testAccount(id, acc)}
                                disabled={isTesting}
                                style={{
                                  padding: "5px 10px", borderRadius: "6px",
                                  backgroundColor: "#ffffff", border: "1px solid #d1d5db",
                                  fontSize: "11.5px", fontWeight: 600, color: "#374151",
                                  cursor: isTesting ? "not-allowed" : "pointer"
                                }}
                              >
                                {isTesting ? "Testing..." : "⚡ Test"}
                              </button>
                              <button
                                onClick={() => toggleAccountEnabled(id, acc.id, acc.enabled)}
                                style={{
                                  padding: "5px 10px", borderRadius: "6px",
                                  backgroundColor: "#ffffff", border: "1px solid #d1d5db",
                                  fontSize: "11.5px", fontWeight: 600, color: "#374151", cursor: "pointer"
                                }}
                              >
                                {acc.enabled ? "Disable" : "Enable"}
                              </button>
                              <button
                                onClick={() => startEditing(id, acc)}
                                style={{
                                  padding: "5px 10px", borderRadius: "6px",
                                  backgroundColor: "#ffffff", border: "1px solid #d1d5db",
                                  fontSize: "11.5px", fontWeight: 600, color: "#374151", cursor: "pointer"
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId({ providerId: id, accountId: acc.id })}
                                style={{
                                  padding: "5px 10px", borderRadius: "6px",
                                  backgroundColor: "#fef2f2", border: "1px solid #fecaca",
                                  fontSize: "11.5px", fontWeight: 600, color: "#dc2626", cursor: "pointer"
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Empty State */}
                  {accounts.length === 0 && editingProvider !== id && (
                    <div style={{
                      padding: "16px", borderRadius: "10px",
                      backgroundColor: "#f9fafb", border: "1px dashed #e5e7eb",
                      textAlign: "center"
                    }}>
                      <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                        No API keys configured for {meta.name} yet.
                      </div>
                      <button
                        onClick={() => startAdding(id)}
                        style={{
                          backgroundColor: "#ffffff", border: "1px solid #d1d5db",
                          color: "#7c3aed", padding: "5px 12px", borderRadius: "6px",
                          fontSize: "12px", fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        + Add {meta.name} Key
                      </button>
                    </div>
                  )}

                  {/* Add / Edit Form Pane */}
                  {editingProvider === id && (
                    <div style={{
                      backgroundColor: "#faf5ff", borderRadius: "12px",
                      padding: "16px", border: "1px solid #ddd6fe",
                      marginTop: accounts.length > 0 ? "12px" : "0"
                    }}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
                        {editingAccountId ? "✏️ Edit API Key Account" : `➕ Add New ${meta.name} Key`}
                      </h4>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#4b5563", marginBottom: "4px" }}>
                            Account Nickname
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. Personal Free Key, Work Backup"
                            style={{
                              width: "100%", padding: "8px 12px", borderRadius: "8px",
                              border: "1px solid #d1d5db", fontSize: "13px",
                              boxSizing: "border-box", backgroundColor: "#ffffff"
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                              API Key
                            </label>
                            <a
                              href={meta.link}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 700, textDecoration: "none" }}
                            >
                              Get key on {meta.portalName} ↗
                            </a>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input
                              type={showKey ? "text" : "password"}
                              value={editKey}
                              onChange={(e) => setEditKey(e.target.value)}
                              placeholder={`Paste your ${meta.name} API key`}
                              style={{
                                flex: 1, padding: "8px 12px", borderRadius: "8px",
                                border: "1px solid #d1d5db", fontSize: "13px",
                                boxSizing: "border-box", backgroundColor: "#ffffff"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              style={{
                                padding: "0 12px", borderRadius: "8px",
                                border: "1px solid #d1d5db", backgroundColor: "#ffffff",
                                fontSize: "11.5px", fontWeight: 600, color: "#4b5563", cursor: "pointer"
                              }}
                            >
                              {showKey ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#4b5563", marginBottom: "4px" }}>
                            AI Model
                          </label>
                          <select
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            style={{
                              width: "100%", padding: "8px 12px", borderRadius: "8px",
                              border: "1px solid #d1d5db", fontSize: "13px",
                              boxSizing: "border-box", backgroundColor: "#ffffff", color: "#111827"
                            }}
                          >
                            {MODELS[id].map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} — {m.tag} ({m.description})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                          <button
                            onClick={saveAccount}
                            style={{
                              backgroundColor: "#7c3aed", color: "#ffffff", border: "none",
                              padding: "8px 16px", borderRadius: "8px", fontSize: "12.5px",
                              fontWeight: 700, cursor: "pointer"
                            }}
                          >
                            Save Account
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              backgroundColor: "transparent", color: "#6b7280",
                              border: "1px solid #d1d5db", padding: "8px 14px",
                              borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer"
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
              backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 22px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                    Smart Failover Protection
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6b7280" }}>
                    Automatically switches to your backup AI key if your primary key hits rate limits (HTTP 429).
                  </p>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={config.fallbackEnabled}
                    onChange={(e) => handleFallbackEnabledChange(e.target.checked)}
                    style={{ width: "18px", height: "18px", accentColor: "#7c3aed", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "13.5px", fontWeight: 700, color: config.fallbackEnabled ? "#7c3aed" : "#6b7280" }}>
                    {config.fallbackEnabled ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>

              {/* Visual Flow */}
              <div style={{
                backgroundColor: "#f9fafb", borderRadius: "12px", padding: "16px",
                border: "1px solid #e5e7eb", marginBottom: "20px"
              }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  How Smart Failover Works
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "13px" }}>
                  <div style={{ padding: "6px 12px", backgroundColor: "#f5f3ff", color: "#7c3aed", borderRadius: "8px", fontWeight: 700, border: "1px solid #ddd6fe" }}>
                    1. Primary ({config.activeProvider ? PROVIDERS[config.activeProvider].name : "Select Provider"})
                  </div>
                  <span style={{ color: "#9ca3af", fontWeight: 700 }}>➔ (If rate-limited) ➔</span>
                  <div style={{ padding: "6px 12px", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "8px", fontWeight: 700, border: "1px solid #fde68a" }}>
                    2. Automatic Fallback Provider
                  </div>
                  <span style={{ color: "#9ca3af", fontWeight: 700 }}>➔</span>
                  <div style={{ padding: "6px 12px", backgroundColor: "#ecfdf5", color: "#059669", borderRadius: "8px", fontWeight: 700, border: "1px solid #a7f3d0" }}>
                    3. Instant Reply Generated
                  </div>
                </div>
              </div>

              {/* Fallback Selection */}
              {config.fallbackEnabled && (
                <div>
                  <h3 style={{ margin: "0 0 10px 0", fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>
                    Allowed Fallback Providers:
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                    {providerList.map(id => {
                      const meta = PROVIDER_METADATA[id]
                      const isPrimary = id === config.activeProvider
                      const hasAccounts = (config.providers[id]?.accounts.length || 0) > 0
                      const isChecked = config.fallbackProviders.includes(id)

                      return (
                        <div
                          key={id}
                          style={{
                            border: `1.5px solid ${isChecked && !isPrimary ? "#7c3aed" : "#e5e7eb"}`,
                            borderRadius: "12px", padding: "12px 14px",
                            backgroundColor: isPrimary ? "#f9fafb" : isChecked ? "#f5f3ff" : "#ffffff",
                            opacity: isPrimary || !hasAccounts ? 0.7 : 1,
                            transition: "all 0.15s ease"
                          }}
                        >
                          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isPrimary || !hasAccounts ? "not-allowed" : "pointer" }}>
                            <input
                              type="checkbox"
                              checked={isChecked && !isPrimary}
                              disabled={isPrimary || !hasAccounts}
                              onChange={() => toggleFallbackProvider(id)}
                              style={{ width: "16px", height: "16px", accentColor: "#7c3aed" }}
                            />
                            <div>
                              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#111827" }}>
                                {meta.name} {isPrimary && "(Primary)"}
                              </div>
                              <div style={{ fontSize: "11px", color: hasAccounts ? "#6b7280" : "#dc2626", marginTop: "2px" }}>
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
              backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 22px",
              border: "1px solid #e5e7eb"
            }}>
              <h2 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                Reply Defaults & Custom Rules
              </h2>

              {/* Default Tone */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Default Reply Tone
                </label>
                <p style={{ margin: "0 0 10px 0", fontSize: "12.5px", color: "#6b7280" }}>
                  Pre-selected tone when opening the Replyly modal.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
                  {TONES.map(t => {
                    const isSelected = defaultTone === t.value
                    return (
                      <button
                        key={t.value}
                        onClick={() => handleDefaultToneChange(t.value)}
                        style={{
                          padding: "10px 12px", borderRadius: "10px",
                          border: isSelected ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                          backgroundColor: isSelected ? "#f5f3ff" : "#ffffff",
                          textAlign: "left", cursor: "pointer", transition: "all 0.15s ease"
                        }}
                      >
                        <div style={{ fontSize: "13.5px", fontWeight: 700, color: isSelected ? "#7c3aed" : "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{t.emoji}</span> {t.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                          {t.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Number of Replies */}
              <div style={{ marginBottom: "20px", borderTop: "1px solid #f3f4f6", paddingTop: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Replies Generated Per Post
                </label>
                <p style={{ margin: "0 0 10px 0", fontSize: "12.5px", color: "#6b7280" }}>
                  Choose how many reply variations you want generated at once.
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[1, 2, 3, 5].map(num => {
                    const isSelected = defaultNumReplies === num
                    return (
                      <button
                        key={num}
                        onClick={() => handleNumRepliesChange(num)}
                        style={{
                          padding: "8px 16px", borderRadius: "8px",
                          border: isSelected ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                          backgroundColor: isSelected ? "#f5f3ff" : "#ffffff",
                          fontSize: "13px", fontWeight: 700,
                          color: isSelected ? "#7c3aed" : "#4b5563", cursor: "pointer"
                        }}
                      >
                        {num} {num === 1 ? "Reply" : "Replies"} {num === 3 && "(Recommended)"}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Global Custom Prompt */}
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  Global Reply Instructions (Optional)
                </label>
                <p style={{ margin: "0 0 8px 0", fontSize: "12.5px", color: "#6b7280" }}>
                  Appended automatically to every generation request (e.g. &quot;Never use hashtags, keep under 150 chars&quot;).
                </p>
                <textarea
                  value={globalCustomPrompt}
                  onChange={(e) => handleGlobalCustomPromptChange(e.target.value)}
                  placeholder="e.g. Keep replies concise. Focus on engineering insights. Avoid marketing buzzwords."
                  style={{
                    width: "100%", height: "76px", padding: "10px 12px", borderRadius: "8px",
                    border: "1px solid #d1d5db", fontSize: "13px", color: "#111827",
                    boxSizing: "border-box", resize: "none", outline: "none", backgroundColor: "#ffffff"
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
              backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 22px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>💎</span>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                    How to get a Free Google Gemini API Key
                  </h3>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "12px", fontWeight: 700, color: "#7c3aed",
                    backgroundColor: "#f5f3ff", padding: "5px 12px", borderRadius: "8px",
                    textDecoration: "none", border: "1px solid #ddd6fe"
                  }}
                >
                  Open AI Studio ↗
                </a>
              </div>
              <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#4b5563", lineHeight: "1.8" }}>
                <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#7c3aed", fontWeight: 700 }}>Google AI Studio (aistudio.google.com)</a>.</li>
                <li>Sign in with your Google account.</li>
                <li>Click <strong>&quot;Create API Key&quot;</strong>.</li>
                <li>Copy your key and paste it into the <strong>AI Providers & Keys</strong> tab.</li>
              </ol>
            </div>

            {/* Guide Card 2: Groq */}
            <div style={{
              backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 22px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>⚡</span>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                    How to get a Free GroqCloud API Key
                  </h3>
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "12px", fontWeight: 700, color: "#7c3aed",
                    backgroundColor: "#f5f3ff", padding: "5px 12px", borderRadius: "8px",
                    textDecoration: "none", border: "1px solid #ddd6fe"
                  }}
                >
                  Open Groq Console ↗
                </a>
              </div>
              <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#4b5563", lineHeight: "1.8" }}>
                <li>Visit the <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: "#7c3aed", fontWeight: 700 }}>Groq Console</a>.</li>
                <li>Create a free account or sign in with GitHub/Google.</li>
                <li>Click <strong>&quot;Create API Key&quot;</strong>.</li>
                <li>Paste the key into Replyly for instant ultra-fast responses!</li>
              </ol>
            </div>

            {/* Privacy & Security FAQ Card */}
            <div style={{
              backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 22px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "20px" }}>🔒</span>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                  Privacy & Client-Side BYOK Security
                </h3>
              </div>
              <div style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.6" }}>
                <p style={{ margin: "0 0 8px 0" }}>
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
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(17, 24, 39, 0.4)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "16px",
            backdropFilter: "blur(4px)"
          }}>
            <div style={{
              backgroundColor: "#ffffff", borderRadius: "16px", padding: "20px 24px",
              maxWidth: "400px", width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                Delete Account?
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6b7280", lineHeight: "1.5" }}>
                Are you sure you want to remove this API key account? You can always add it back later.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    padding: "7px 14px", borderRadius: "8px",
                    border: "1px solid #d1d5db", backgroundColor: "#ffffff",
                    fontSize: "12.5px", fontWeight: 600, color: "#4b5563", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeAccount(deleteConfirmId.providerId, deleteConfirmId.accountId)}
                  style={{
                    padding: "7px 14px", borderRadius: "8px",
                    border: "none", backgroundColor: "#dc2626",
                    fontSize: "12.5px", fontWeight: 700, color: "#ffffff", cursor: "pointer"
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
            position: "fixed", bottom: "28px", left: "50%",
            transform: "translateX(-50%)", padding: "10px 20px",
            borderRadius: "9999px", fontSize: "13.5px", fontWeight: 700,
            backgroundColor: statusType === "error" ? "#dc2626" : statusType === "success" ? "#16a34a" : "#7c3aed",
            color: "#ffffff", boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
            zIndex: 9999, display: "flex", alignItems: "center", gap: "8px"
          }}>
            <span>{statusType === "error" ? "✕" : statusType === "success" ? "✓" : "ℹ"}</span>
            <span>{statusMsg}</span>
          </div>
        )}

        </div>
      </div>
    </div>
  )
}

export default Options
