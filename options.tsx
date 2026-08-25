import React, { useEffect, useMemo, useState } from "react"
import { AIManager, DEFAULT_CONFIG } from "./lib/ai/manager"
import type { AIConfig, ProviderId, AIAccount } from "./lib/ai/types"
import { RlyLogoIcon } from "./components/Logo"

export type SettingsTab = "keys" | "preferences" | "guides"

const PROVIDER_METADATA: Record<
  ProviderId,
  { name: string; link: string; portalName: string; defaultModel: string }
> = {
  gemini: {
    name: "Google Gemini",
    link: "https://aistudio.google.com/app/apikey",
    portalName: "Google AI Studio",
    defaultModel: "gemini-2.5-flash"
  },
  openai: {
    name: "OpenAI",
    link: "https://platform.openai.com/api-keys",
    portalName: "OpenAI Platform",
    defaultModel: "gpt-4o-mini"
  },
  anthropic: {
    name: "Anthropic (Claude)",
    link: "https://console.anthropic.com/settings/keys",
    portalName: "Anthropic Console",
    defaultModel: "claude-3-5-haiku-latest"
  },
  deepseek: {
    name: "DeepSeek",
    link: "https://platform.deepseek.com/api_keys",
    portalName: "DeepSeek Platform",
    defaultModel: "deepseek-chat"
  },
  meta: {
    name: "Meta (Llama)",
    link: "https://llama.meta.com/",
    portalName: "Meta Llama",
    defaultModel: "llama-3.3-70b-versatile"
  },
  xai: {
    name: "xAI (Grok)",
    link: "https://console.x.ai/",
    portalName: "xAI Console",
    defaultModel: "grok-2"
  },
  groq: {
    name: "Groq Cloud",
    link: "https://console.groq.com/keys",
    portalName: "Groq Console",
    defaultModel: "llama-3.3-70b-versatile"
  },
  openrouter: {
    name: "OpenRouter",
    link: "https://openrouter.ai/keys",
    portalName: "OpenRouter Keys",
    defaultModel: "openrouter/auto"
  },
  nvidia: {
    name: "NVIDIA NIM",
    link: "https://build.nvidia.com/",
    portalName: "NVIDIA Build",
    defaultModel: "meta/llama-3.1-70b-instruct"
  },
  mistral: {
    name: "Mistral AI",
    link: "https://console.mistral.ai/api-keys/",
    portalName: "Mistral Console",
    defaultModel: "mistral-small-latest"
  },
  together: {
    name: "Together AI",
    link: "https://api.together.ai/settings/api-keys",
    portalName: "Together AI",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo"
  },
  perplexity: {
    name: "Perplexity",
    link: "https://www.perplexity.ai/settings/api",
    portalName: "Perplexity Settings",
    defaultModel: "sonar"
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

function Switch({
  checked,
  onChange,
  disabled = false
}: {
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange(!checked)
      }}
      style={{
        width: "36px",
        height: "20px",
        backgroundColor: checked ? "#7c3aed" : "#e5e7eb",
        borderRadius: "9999px",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        padding: "2px",
        transition: "background-color 0.2s ease",
        display: "inline-flex",
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
        outline: "none",
        flexShrink: 0
      }}
    >
      <span
        style={{
          width: "16px",
          height: "16px",
          backgroundColor: "#ffffff",
          borderRadius: "50%",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
          transform: checked ? "translateX(16px)" : "translateX(0px)",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "block"
        }}
      />
    </button>
  )
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#111827",
            color: "#ffffff",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 100,
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.18)",
            letterSpacing: "0.2px"
          }}
        >
          {label}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              borderWidth: "4px",
              borderStyle: "solid",
              borderColor: "#111827 transparent transparent transparent"
            }}
          />
        </div>
      )}
    </div>
  )
}

function KeyActivationButton({
  isActive,
  onClick,
  disabled = false
}: {
  isActive: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip label={isActive ? "Active Key • Click to toggle" : "Click to set as active key"}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) onClick()
        }}
        disabled={disabled}
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "6px",
          border: isActive ? "1px solid #10b981" : "1px solid #e5e7eb",
          backgroundColor: isActive ? "#ecfdf5" : "#f9fafb",
          color: isActive ? "#059669" : "#9ca3af",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition: "all 0.15s ease",
          outline: "none"
        }}
        onMouseEnter={(e) => {
          if (!isActive && !disabled) {
            e.currentTarget.style.backgroundColor = "#f3f4f6"
            e.currentTarget.style.borderColor = "#cbd5e1"
            e.currentTarget.style.color = "#4b5563"
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive && !disabled) {
            e.currentTarget.style.backgroundColor = "#f9fafb"
            e.currentTarget.style.borderColor = "#e5e7eb"
            e.currentTarget.style.color = "#9ca3af"
          }
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </button>
    </Tooltip>
  )
}

export function Options() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("keys")
  const [searchQuery, setSearchQuery] = useState("")

  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [isExtensionEnabled, setIsExtensionEnabled] = useState(true)

  const [defaultTone, setDefaultTone] = useState<string>("Smart")
  const [defaultNumReplies, setDefaultNumReplies] = useState<number>(3)
  const [globalCustomPrompt, setGlobalCustomPrompt] = useState<string>("")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderId>("gemini")
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editKey, setEditKey] = useState("")
  const [showKey, setShowKey] = useState(false)

  const [testingId, setTestingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ providerId: ProviderId; accountId: string } | null>(null)

  const [statusMsg, setStatusMsg] = useState("")
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | "">("")

  const providerList: ProviderId[] = [
    "gemini",
    "openai",
    "anthropic",
    "deepseek",
    "meta",
    "xai",
    "groq",
    "openrouter",
    "nvidia",
    "mistral",
    "together",
    "perplexity"
  ]

  useEffect(() => {
    document.title = "Replyly Settings"
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.type = "image/png"
    link.href = RLY_FAVICON_DATA_URI

    AIManager.getConfig().then((c) => {
      setConfig(c)
      setLoading(false)
    })

    chrome.storage.local.get(
      ["isExtensionEnabled", "replyly_defaultTone", "replyly_numReplies", "replyly_globalCustomPrompt"],
      (res) => {
        if (res.isExtensionEnabled !== undefined) setIsExtensionEnabled(res.isExtensionEnabled)
        if (res.replyly_defaultTone) setDefaultTone(res.replyly_defaultTone)
        if (res.replyly_numReplies) setDefaultNumReplies(res.replyly_numReplies)
        if (res.replyly_globalCustomPrompt) setGlobalCustomPrompt(res.replyly_globalCustomPrompt)
      }
    )

    const interval = setInterval(() => {
      setConfig((c) => ({ ...c }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const showStatus = (msg: string, type: "success" | "error" | "info") => {
    setStatusMsg(msg)
    setStatusType(type)
    setTimeout(() => setStatusMsg(""), 4500)
  }

  const handleActiveProviderChange = async (newActive: ProviderId | null) => {
    const newConfig = { ...config, activeProvider: newActive }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    showStatus(`Active provider switched to ${newActive ? PROVIDER_METADATA[newActive]?.name || newActive : "None"}`, "success")
  }

  const handleFallbackEnabledChange = async (enabled: boolean) => {
    const newConfig = { ...config, fallbackEnabled: enabled }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    showStatus(`Auto-failover ${enabled ? "enabled" : "disabled"}`, "info")
  }

  const toggleFallbackProvider = async (provider: ProviderId) => {
    const newConfig = { ...config }
    if (newConfig.fallbackProviders.includes(provider)) {
      newConfig.fallbackProviders = newConfig.fallbackProviders.filter((p) => p !== provider)
    } else {
      newConfig.fallbackProviders.push(provider)
    }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
  }

  const startAdding = (preferredProvider: ProviderId = "gemini") => {
    setEditingProvider(preferredProvider)
    setEditingAccountId(null)
    setEditName(`${PROVIDER_METADATA[preferredProvider]?.name || preferredProvider} Key`)
    setEditKey("")
    setShowKey(false)
    setIsModalOpen(true)
  }

  const startEditing = (providerId: ProviderId, account: AIAccount) => {
    setEditingProvider(providerId)
    setEditingAccountId(account.id)
    setEditName(account.name)
    setEditKey(account.apiKey)
    setShowKey(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAccountId(null)
  }

  const handleProviderSelectChange = (newProvider: ProviderId) => {
    setEditingProvider(newProvider)
    if (!editingAccountId) {
      setEditName(`${PROVIDER_METADATA[newProvider]?.name || newProvider} Key`)
    }
  }

  const saveAccount = async () => {
    if (!editingProvider) return
    if (!editName.trim() || !editKey.trim()) {
      showStatus("Please provide both a key name and an API key.", "error")
      return
    }

    const newConfig = { ...config }
    if (!newConfig.providers[editingProvider]) {
      newConfig.providers[editingProvider] = { accounts: [] }
    }

    const pConfig = newConfig.providers[editingProvider]!
    const defaultModel = PROVIDER_METADATA[editingProvider]?.defaultModel || "default"

    if (editingAccountId) {
      const idx = pConfig.accounts.findIndex((a) => a.id === editingAccountId)
      if (idx > -1) {
        const isNewKey = pConfig.accounts[idx].apiKey !== editKey.trim()
        pConfig.accounts[idx] = {
          ...pConfig.accounts[idx],
          name: editName.trim(),
          apiKey: editKey.trim(),
          model: pConfig.accounts[idx].model || defaultModel,
          enabled: true,
          ...(isNewKey ? { status: "unknown", cooldownUntil: null, lastErrorAt: null } : {})
        }
      }
    } else {
      pConfig.accounts.push({
        id: crypto.randomUUID(),
        name: editName.trim(),
        apiKey: editKey.trim(),
        model: defaultModel,
        enabled: true,
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
    closeModal()
  }

  const toggleAccountEnabled = async (providerId: ProviderId, accountId: string, currentEnabled: boolean) => {
    await AIManager.updateAccountState(providerId, accountId, { enabled: !currentEnabled })
    const updated = await AIManager.getConfig()
    setConfig(updated)
    showStatus(`Key ${!currentEnabled ? "enabled" : "disabled"}`, "info")
  }

  const removeAccount = async (providerId: ProviderId, accountId: string) => {
    const newConfig = { ...config }
    if (newConfig.providers[providerId]) {
      newConfig.providers[providerId]!.accounts = newConfig.providers[providerId]!.accounts.filter(
        (a) => a.id !== accountId
      )

      if (newConfig.providers[providerId]!.accounts.length === 0 && newConfig.activeProvider === providerId) {
        const remaining = providerList.find((p) => (newConfig.providers[p]?.accounts.length || 0) > 0) || null
        newConfig.activeProvider = remaining
      }
    }
    setConfig(newConfig)
    await AIManager.saveConfig(newConfig)
    setDeleteConfirmId(null)
    showStatus("Key deleted.", "info")
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

  const allAccounts = useMemo(() => {
    const list: { providerId: ProviderId; account: AIAccount }[] = []
    for (const pid of providerList) {
      const accounts = config.providers[pid]?.accounts || []
      for (const acc of accounts) {
        list.push({ providerId: pid, account: acc })
      }
    }
    return list
  }, [config])

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return allAccounts
    const q = searchQuery.toLowerCase()
    return allAccounts.filter((item) => {
      const meta = PROVIDER_METADATA[item.providerId]
      const nameMatch = item.account.name.toLowerCase().includes(q)
      const providerMatch = (meta?.name || item.providerId).toLowerCase().includes(q)
      const keyMatch = item.account.apiKey.toLowerCase().includes(q)
      return nameMatch || providerMatch || keyMatch
    })
  }, [allAccounts, searchQuery])

  const maskApiKey = (key: string) => {
    if (!key) return ""
    if (key.length <= 10) return "••••••••"
    return `${key.slice(0, 7)}...${key.slice(-4)}`
  }

  const getCooldownText = (cooldownUntil: number | null | undefined) => {
    if (!cooldownUntil) return null
    const diff = cooldownUntil - Date.now()
    if (diff <= 0) return null
    return `Cooldown (${Math.ceil(diff / 1000)}s)`
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          color: "#7c3aed",
          fontWeight: 600
        }}
      >
        Loading Settings...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#fafafa",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#111827",
        boxSizing: "border-box"
      }}
    >
      <style>{`
        @keyframes rly-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #7c3aed !important;
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15) !important;
        }
      `}</style>

      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          minHeight: "100vh",
          backgroundColor: "#ffffff",
          borderLeft: "1px solid #e5e7eb",
          borderRight: "1px solid #e5e7eb",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div style={{ padding: "36px 32px 0 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <RlyLogoIcon size={28} />
                <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: "#111827", letterSpacing: "-0.5px" }}>
                  Settings
                </h1>
              </div>
              <p style={{ margin: "5px 0 0", fontSize: "13.5px", color: "#6b7280", lineHeight: "1.5" }}>
                Manage your API keys, reply preferences, and helpful guides.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 12px",
                backgroundColor: "#f9fafb",
                borderRadius: "9999px",
                border: "1px solid #e5e7eb"
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563" }}>Extension:</span>
              <button
                onClick={() => handleExtensionToggle(!isExtensionEnabled)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "12px",
                  fontWeight: 600,
                  color: isExtensionEnabled ? "#7c3aed" : "#9ca3af"
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: isExtensionEnabled ? "#7c3aed" : "#9ca3af"
                  }}
                />
                {isExtensionEnabled ? "Active" : "Disabled"}
              </button>
            </div>
          </div>
        </div>

        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: "28px",
            borderBottom: "1px solid #e5e7eb",
            marginTop: "20px",
            paddingLeft: "32px",
            paddingRight: "32px",
            overflow: "hidden"
          }}
        >
          {[
            { id: "keys", label: "API Keys", count: allAccounts.length },
            { id: "preferences", label: "Preferences" },
            { id: "guides", label: "Guides & FAQ" }
          ].map((tab) => {
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
                  fontWeight: 500,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  marginBottom: "-1px",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
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
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      padding: "1px 7px",
                      borderRadius: "9999px",
                      backgroundColor: isActive ? "#f5f3ff" : "#f3f4f6",
                      color: isActive ? "#7c3aed" : "#6b7280"
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ padding: "24px 32px 80px 32px", flex: 1 }}>

          {activeTab === "keys" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
                  <div style={{ position: "relative", width: "260px" }}>
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "12px" }}>
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Search keys or providers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px 7px 30px",
                        borderRadius: "7px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                        color: "#111827",
                        backgroundColor: "#ffffff",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <button
                    onClick={() => startAdding("gemini")}
                    style={{
                      backgroundColor: "#7c3aed",
                      color: "#ffffff",
                      border: "none",
                      padding: "7px 14px",
                      borderRadius: "7px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      transition: "background-color 0.15s ease",
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6d28d9")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#7c3aed")}
                  >
                    <span style={{ fontSize: "14px", lineHeight: "1" }}>+</span>
                    <span>Add Key</span>
                  </button>
                </div>

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff"
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "#6b7280", fontSize: "11.5px" }}>Key</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "#6b7280", fontSize: "11.5px" }}>Provider</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "#6b7280", fontSize: "11.5px" }}>Status</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "#6b7280", fontSize: "11.5px", textAlign: "center", width: "60px" }}>Active</th>
                        <th style={{ padding: "8px 12px", fontWeight: 500, color: "#6b7280", fontSize: "11.5px", textAlign: "right", width: "110px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.length > 0 ? (
                        filteredAccounts.map(({ providerId, account }) => {
                          const meta = PROVIDER_METADATA[providerId]
                          const isPrimary = config.activeProvider === providerId
                          const isTesting = testingId === account.id
                          const cooldown = getCooldownText(account.cooldownUntil)

                          return (
                            <tr
                              key={account.id}
                              style={{
                                borderBottom: "1px solid #f3f4f6",
                                transition: "background-color 0.15s ease",
                                backgroundColor: isPrimary ? "#faf5ff" : "transparent"
                              }}
                              onMouseEnter={(e) => {
                                if (!isPrimary) e.currentTarget.style.backgroundColor = "#f9fafb"
                              }}
                              onMouseLeave={(e) => {
                                if (!isPrimary) e.currentTarget.style.backgroundColor = "transparent"
                              }}
                            >
                              <td style={{ padding: "9px 12px" }}>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontWeight: 600, color: "#111827" }}>{account.name}</span>
                                    {isPrimary && (
                                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 5px", borderRadius: "4px", backgroundColor: "#ede9fe", color: "#7c3aed" }}>
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "monospace", marginTop: "1px" }}>
                                    {maskApiKey(account.apiKey)}
                                  </span>
                                </div>
                              </td>

                              <td style={{ padding: "9px 12px" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    backgroundColor: "#f3f4f6",
                                    fontSize: "11.5px",
                                    color: "#374151",
                                    fontWeight: 500
                                  }}
                                >
                                  {meta?.name || providerId}
                                </span>
                              </td>

                              <td style={{ padding: "9px 12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                  <span
                                    style={{
                                      width: "6.5px",
                                      height: "6.5px",
                                      borderRadius: "50%",
                                      backgroundColor: !account.enabled ? "#9ca3af" : cooldown ? "#f59e0b" : "#10b981",
                                      animation: account.enabled && !cooldown ? "rly-pulse 2.5s infinite" : "none"
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "11.5px",
                                      fontWeight: 500,
                                      color: !account.enabled ? "#9ca3af" : cooldown ? "#d97706" : "#059669"
                                    }}
                                  >
                                    {!account.enabled ? "Disabled" : cooldown ? cooldown : "Ready"}
                                  </span>
                                </div>
                              </td>

                              <td style={{ padding: "9px 12px", textAlign: "center" }}>
                                <KeyActivationButton
                                  isActive={isPrimary && account.enabled}
                                  onClick={() => {
                                    const currentlyActive = isPrimary && account.enabled
                                    if (!currentlyActive) {
                                      if (!account.enabled) {
                                        toggleAccountEnabled(providerId, account.id, false)
                                      }
                                      handleActiveProviderChange(providerId)
                                    } else {
                                      toggleAccountEnabled(providerId, account.id, true)
                                    }
                                  }}
                                />
                              </td>

                              <td style={{ padding: "9px 12px", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Tooltip label={isTesting ? "Testing connection..." : "Test connection"}>
                                    <button
                                      onClick={() => testAccount(providerId, account)}
                                      disabled={isTesting}
                                      style={{
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "6px",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #e5e7eb",
                                        color: "#4b5563",
                                        cursor: isTesting ? "not-allowed" : "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: 0,
                                        transition: "all 0.15s ease"
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isTesting) {
                                          e.currentTarget.style.backgroundColor = "#f9fafb"
                                          e.currentTarget.style.borderColor = "#cbd5e1"
                                          e.currentTarget.style.color = "#111827"
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isTesting) {
                                          e.currentTarget.style.backgroundColor = "#ffffff"
                                          e.currentTarget.style.borderColor = "#e5e7eb"
                                          e.currentTarget.style.color = "#4b5563"
                                        }
                                      }}
                                    >
                                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                      </svg>
                                    </button>
                                  </Tooltip>

                                  <Tooltip label="Edit key">
                                    <button
                                      onClick={() => startEditing(providerId, account)}
                                      style={{
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "6px",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #e5e7eb",
                                        color: "#4b5563",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: 0,
                                        transition: "all 0.15s ease"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f9fafb"
                                        e.currentTarget.style.borderColor = "#cbd5e1"
                                        e.currentTarget.style.color = "#111827"
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#ffffff"
                                        e.currentTarget.style.borderColor = "#e5e7eb"
                                        e.currentTarget.style.color = "#4b5563"
                                      }}
                                    >
                                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </button>
                                  </Tooltip>

                                  <Tooltip label="Delete key">
                                    <button
                                      onClick={() => setDeleteConfirmId({ providerId, accountId: account.id })}
                                      style={{
                                        width: "28px",
                                        height: "28px",
                                        borderRadius: "6px",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #fecaca",
                                        color: "#dc2626",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: 0,
                                        transition: "all 0.15s ease"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#fef2f2"
                                        e.currentTarget.style.borderColor = "#f87171"
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#ffffff"
                                        e.currentTarget.style.borderColor = "#fecaca"
                                      }}
                                    >
                                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      </svg>
                                    </button>
                                  </Tooltip>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: "32px 20px", textAlign: "center", color: "#6b7280" }}>
                            <div style={{ fontSize: "13px", marginBottom: "8px" }}>
                              {searchQuery ? "No matching API keys found." : "No API keys added yet."}
                            </div>
                            {!searchQuery && (
                              <button
                                onClick={() => startAdding("gemini")}
                                style={{
                                  backgroundColor: "#f5f3ff",
                                  border: "1px solid #ddd6fe",
                                  color: "#7c3aed",
                                  padding: "5px 12px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                + Add your first key
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {filteredAccounts.length > 0 && (
                    <div style={{ padding: "7px 12px", backgroundColor: "#f9fafb", borderTop: "1px solid #f3f4f6", fontSize: "11px", color: "#9ca3af" }}>
                      {filteredAccounts.length} {filteredAccounts.length === 1 ? "key configured" : "keys configured"}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "18px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "10px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                      Smart Failover
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                      Automatically switches to a backup key if your active provider encounters rate limits (HTTP 429).
                    </p>
                  </div>

                  <Switch
                    checked={config.fallbackEnabled}
                    onChange={(val) => handleFallbackEnabledChange(val)}
                  />
                </div>

                {config.fallbackEnabled && (
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      border: "1px solid #e5e7eb",
                      marginTop: "8px"
                    }}
                  >
                    <div style={{ fontSize: "11.5px", fontWeight: 500, color: "#4b5563", marginBottom: "6px" }}>
                      Allowed Backup Providers:
                    </div>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      {providerList.map((id) => {
                        const meta = PROVIDER_METADATA[id]
                        const isPrimary = id === config.activeProvider
                        const hasAccounts = (config.providers[id]?.accounts.length || 0) > 0
                        const isChecked = config.fallbackProviders.includes(id)

                        return (
                          <label
                            key={id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "12px",
                              color: isPrimary ? "#9ca3af" : "#374151",
                              cursor: isPrimary || !hasAccounts ? "not-allowed" : "pointer"
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked && !isPrimary}
                              disabled={isPrimary || !hasAccounts}
                              onChange={() => toggleFallbackProvider(id)}
                              style={{ width: "13px", height: "13px", accentColor: "#7c3aed" }}
                            />
                            <span>{meta?.name || id}</span>
                            {isPrimary && <span style={{ fontSize: "10px", color: "#7c3aed" }}>(Primary)</span>}
                            {!hasAccounts && <span style={{ fontSize: "10px", color: "#9ca3af" }}>(No key)</span>}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "18px" }}>🎭</span>
                  <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                    Default Reply Tone
                  </h2>
                </div>
                <p style={{ margin: "0 0 14px 0", fontSize: "13px", color: "#6b7280" }}>
                  Choose which tone is pre-selected when opening the Replyly generator.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px" }}>
                  {TONES.map((t) => {
                    const isSelected = defaultTone === t.value
                    return (
                      <div
                        key={t.value}
                        onClick={() => handleDefaultToneChange(t.value)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: isSelected ? "1.5px solid #7c3aed" : "1px solid #e5e7eb",
                          backgroundColor: isSelected ? "#faf5ff" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
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
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: isSelected ? "#7c3aed" : "#111827" }}>
                          <span>{t.emoji}</span>
                          <span>{t.label}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "3px", lineHeight: "1.4" }}>
                          {t.desc}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "18px" }}>🔢</span>
                  <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                    Replies Per Generation
                  </h2>
                </div>
                <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#6b7280" }}>
                  Choose how many reply options are created for each post.
                </p>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[1, 2, 3, 5].map((num) => {
                    const isSelected = defaultNumReplies === num
                    return (
                      <button
                        key={num}
                        onClick={() => handleNumRepliesChange(num)}
                        style={{
                          padding: "7px 16px",
                          borderRadius: "8px",
                          border: isSelected ? "1.5px solid #7c3aed" : "1px solid #e5e7eb",
                          backgroundColor: isSelected ? "#faf5ff" : "#ffffff",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: isSelected ? "#7c3aed" : "#374151",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#f9fafb"
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#ffffff"
                        }}
                      >
                        {num} {num === 1 ? "Option" : "Options"} {num === 3 && "(Recommended)"}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "18px" }}>📝</span>
                  <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                    Custom Instructions
                  </h2>
                </div>
                <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#6b7280" }}>
                  Rules added to all prompt generations (e.g. &quot;No hashtags, write concisely, keep under 150 chars&quot;).
                </p>

                <textarea
                  value={globalCustomPrompt}
                  onChange={(e) => handleGlobalCustomPromptChange(e.target.value)}
                  placeholder="e.g. Keep replies concise and insightful. Focus on builder/engineering angle. Avoid buzzwords."
                  style={{
                    width: "100%",
                    height: "85px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    color: "#111827",
                    boxSizing: "border-box",
                    resize: "none",
                    backgroundColor: "#ffffff"
                  }}
                />
              </div>

              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px" }}>⚡</span>
                      <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                        Extension Active State
                      </h2>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#6b7280" }}>
                      Toggle injection and reply buttons on supported social feeds (X and LinkedIn).
                    </p>
                  </div>

                  <Switch
                    checked={isExtensionEnabled}
                    onChange={(val) => handleExtensionToggle(val)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "guides" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #e5e7eb"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>💎</span>
                    <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 600, color: "#111827" }}>
                      How to get a Free Google Gemini API Key
                    </h3>
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#7c3aed",
                      backgroundColor: "#f5f3ff",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      border: "1px solid #ddd6fe"
                    }}
                  >
                    Open AI Studio ↗
                  </a>
                </div>
                <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#4b5563", lineHeight: "1.8" }}>
                  <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "#7c3aed", fontWeight: 600 }}>Google AI Studio (aistudio.google.com)</a>.</li>
                  <li>Sign in with your Google account.</li>
                  <li>Click <strong>&quot;Create API Key&quot;</strong>.</li>
                  <li>Copy your key and paste it into the <strong>API Keys</strong> tab.</li>
                </ol>
              </div>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #e5e7eb"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>⚡</span>
                    <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 600, color: "#111827" }}>
                      How to get a Free GroqCloud API Key
                    </h3>
                  </div>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#7c3aed",
                      backgroundColor: "#f5f3ff",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      border: "1px solid #ddd6fe"
                    }}
                  >
                    Open Groq Console ↗
                  </a>
                </div>
                <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#4b5563", lineHeight: "1.8" }}>
                  <li>Visit the <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: "#7c3aed", fontWeight: 600 }}>Groq Console</a>.</li>
                  <li>Create a free account or sign in with GitHub/Google.</li>
                  <li>Click <strong>&quot;Create API Key&quot;</strong>.</li>
                  <li>Paste the key into Replyly for instant ultra-fast responses!</li>
                </ol>
              </div>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "1px solid #e5e7eb"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px" }}>🔒</span>
                  <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 600, color: "#111827" }}>
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
        </div>

        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(17, 24, 39, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
              padding: "16px",
              backdropFilter: "blur(3px)"
            }}
            onClick={closeModal}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "22px 24px",
                maxWidth: "420px",
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                boxSizing: "border-box"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                  {editingAccountId ? "Edit API Key" : "Add New API Key"}
                </h3>
                <button
                  onClick={closeModal}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "18px",
                    color: "#9ca3af",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#4b5563", marginBottom: "5px" }}>
                  Provider
                </label>
                <select
                  value={editingProvider}
                  onChange={(e) => handleProviderSelectChange(e.target.value as ProviderId)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "7px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    backgroundColor: "#ffffff",
                    color: "#111827"
                  }}
                >
                  {providerList.map((pid) => (
                    <option key={pid} value={pid}>
                      {PROVIDER_METADATA[pid]?.name || pid}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#4b5563", marginBottom: "5px" }}>
                  Key Name / Nickname
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Personal Key, Work Account"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "7px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#4b5563" }}>
                    API Key
                  </label>
                  {PROVIDER_METADATA[editingProvider]?.link && (
                    <a
                      href={PROVIDER_METADATA[editingProvider].link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: "11px", color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}
                    >
                      Get API Key on {PROVIDER_METADATA[editingProvider].portalName} ↗
                    </a>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type={showKey ? "text" : "password"}
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder={`Paste ${PROVIDER_METADATA[editingProvider]?.name || ""} API key`}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: "7px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      padding: "0 10px",
                      borderRadius: "7px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "#ffffff",
                      fontSize: "11.5px",
                      fontWeight: 500,
                      color: "#4b5563",
                      cursor: "pointer"
                    }}
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "7px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    fontSize: "12.5px",
                    fontWeight: 500,
                    color: "#4b5563",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAccount}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "7px",
                    border: "none",
                    backgroundColor: "#7c3aed",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirmId && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(17, 24, 39, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
              padding: "16px",
              backdropFilter: "blur(3px)"
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "18px 22px",
                maxWidth: "360px",
                width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
              }}
            >
              <h3 style={{ margin: "0 0 6px 0", fontSize: "14.5px", fontWeight: 700, color: "#111827" }}>
                Delete API Key?
              </h3>
              <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#6b7280", lineHeight: "1.5" }}>
                Are you sure you want to remove this API key? You can always add it again later.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#4b5563",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeAccount(deleteConfirmId.providerId, deleteConfirmId.accountId)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#dc2626",
                    fontSize: "12px",
                    fontWeight: 600,
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

        {statusMsg && (
          <div
            style={{
              position: "fixed",
              bottom: "28px",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "9px 18px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 500,
              backgroundColor: statusType === "error" ? "#dc2626" : statusType === "success" ? "#16a34a" : "#7c3aed",
              color: "#ffffff",
              boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>{statusType === "error" ? "✕" : statusType === "success" ? "✓" : "ℹ"}</span>
            <span>{statusMsg}</span>
          </div>
        )}

      </div>
    </div>
  )
}

export default Options
