import React, { useEffect, useState } from "react"
import { AIManager } from "./lib/ai/manager"
import type { AIConfig, ProviderId } from "./lib/ai/types"
import { RlyLogoIcon } from "./components/Logo"

interface CurrentSiteInfo {
  name: string
  key: "x" | "linkedin" | "other"
}

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [currentSite, setCurrentSite] = useState<CurrentSiteInfo>({
    name: "X (Twitter)",
    key: "other"
  })

  useEffect(() => {
    // 1. Load extension enabled state
    chrome.storage.local.get(["isExtensionEnabled"], (result) => {
      if (result.isExtensionEnabled !== undefined) {
        setIsEnabled(result.isExtensionEnabled)
      } else {
        chrome.storage.local.set({ isExtensionEnabled: true })
      }
    })

    // 2. Check if API keys exist
    AIManager.getConfig().then((config: AIConfig) => {
      const providerList: ProviderId[] = ["gemini", "groq", "openrouter"]
      const hasConfigured = providerList.some(
        (id) => (config.providers[id]?.accounts.length || 0) > 0
      )
      setHasApiKey(hasConfigured)
    })

    // 3. Detect current active tab website
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.url) {
        try {
          const url = new URL(activeTab.url)
          const hostname = url.hostname.toLowerCase()

          if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
            setCurrentSite({
              name: "X (Twitter)",
              key: "x"
            })
          } else if (hostname.includes("linkedin.com")) {
            setCurrentSite({
              name: "LinkedIn",
              key: "linkedin"
            })
          } else {
            setCurrentSite({
              name: "X (Twitter)",
              key: "other"
            })
          }
        } catch {
          setCurrentSite({
            name: "X (Twitter)",
            key: "other"
          })
        }
      }
    })
  }, [])

  const handleToggle = () => {
    const newValue = !isEnabled
    setIsEnabled(newValue)
    chrome.storage.local.set({ isExtensionEnabled: newValue })
  }

  const openSettings = () => {
    chrome.runtime.openOptionsPage()
  }

  const openX = () => {
    chrome.tabs.create({ url: "https://x.com" })
  }

  const openLinkedIn = () => {
    chrome.tabs.create({ url: "https://linkedin.com" })
  }

  // Site label helper inside the button
  const getSiteStatusText = () => {
    if (!isEnabled) return "Tap to turn ON"
    if (currentSite.key === "x") return "Active on X (Twitter)"
    if (currentSite.key === "linkedin") return "Active on LinkedIn"
    return "Ready on X & LinkedIn"
  }

  return (
    <div
      style={{
        width: "320px",
        padding: "16px 18px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#0f1419",
        backgroundColor: "#ffffff",
        boxSizing: "border-box"
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "12px",
          marginBottom: "14px",
          borderBottom: "1px solid #eff3f4"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <RlyLogoIcon size={28} />
          <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.2px", color: "#0f172a" }}>
            Replyly
          </span>
        </div>

        {/* Quick Settings Icon Button */}
        <button
          onClick={openSettings}
          title="Settings & Accounts"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc"
            e.currentTarget.style.color = "#0f1419"
            e.currentTarget.style.borderColor = "#cbd5e1"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff"
            e.currentTarget.style.color = "#64748b"
            e.currentTarget.style.borderColor = "#e2e8f0"
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 13.5 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
          </svg>
        </button>
      </div>

      {/* Hero Activation Button (All-in-One, Clear & Simple) */}
      <button
        onClick={handleToggle}
        style={{
          width: "100%",
          padding: "16px 16px",
          borderRadius: "14px",
          border: isEnabled ? "2px solid #10b981" : "2px solid #cbd5e1",
          backgroundColor: isEnabled ? "#ecfdf5" : "#f8fafc",
          color: isEnabled ? "#065f46" : "#475569",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          marginBottom: "12px",
          transition: "all 0.15s ease",
          boxShadow: isEnabled ? "0 2px 8px rgba(16, 185, 129, 0.15)" : "none"
        }}
        onMouseEnter={(e) => {
          if (isEnabled) {
            e.currentTarget.style.backgroundColor = "#d1fae5"
          } else {
            e.currentTarget.style.backgroundColor = "#f1f5f9"
            e.currentTarget.style.borderColor = "#94a3b8"
          }
        }}
        onMouseLeave={(e) => {
          if (isEnabled) {
            e.currentTarget.style.backgroundColor = "#ecfdf5"
            e.currentTarget.style.borderColor = "#10b981"
          } else {
            e.currentTarget.style.backgroundColor = "#f8fafc"
            e.currentTarget.style.borderColor = "#cbd5e1"
          }
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Big Power Icon */}
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: isEnabled ? "#10b981" : "#cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              flexShrink: 0
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0 1 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.05.88-3.89 2.29-5.17L5.87 5.17A8.932 8.932 0 0 0 3 12a9 9 0 0 0 18 0c0-2.61-1.11-4.96-2.9-6.66z" />
            </svg>
          </div>

          {/* Text Info with Embedded Site Status */}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "15px", fontWeight: 800, lineHeight: "1.2" }}>
              {isEnabled ? "Replyly is ON" : "Replyly is OFF"}
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: isEnabled ? "#047857" : "#64748b",
                marginTop: "3px",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <span>{getSiteStatusText()}</span>
            </div>
          </div>
        </div>

        {/* State Badge */}
        <div
          style={{
            fontSize: "12px",
            fontWeight: 800,
            padding: "4px 10px",
            borderRadius: "9999px",
            backgroundColor: isEnabled ? "#10b981" : "#e2e8f0",
            color: isEnabled ? "#ffffff" : "#475569"
          }}
        >
          {isEnabled ? "ON" : "OFF"}
        </div>
      </button>

      {/* Card: Clean API Key Status & 1-Click Management */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "12px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🔑</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f1419" }}>
                API Keys
              </div>
              <div style={{ fontSize: "11px", color: hasApiKey ? "#059669" : "#dc2626", fontWeight: 600 }}>
                {hasApiKey ? "✓ Keys Ready" : "⚠ Not Configured"}
              </div>
            </div>
          </div>

          <button
            onClick={openSettings}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: hasApiKey ? "1px solid #cfd9de" : "none",
              backgroundColor: hasApiKey ? "#ffffff" : "#E76F51",
              color: hasApiKey ? "#0f1419" : "#ffffff",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              if (hasApiKey) {
                e.currentTarget.style.backgroundColor = "#f8fafc"
              } else {
                e.currentTarget.style.backgroundColor = "#D65A3C"
              }
            }}
            onMouseLeave={(e) => {
              if (hasApiKey) {
                e.currentTarget.style.backgroundColor = "#ffffff"
              } else {
                e.currentTarget.style.backgroundColor = "#E76F51"
              }
            }}
          >
            {hasApiKey ? "Manage" : "Connect Key"}
          </button>
        </div>
      </div>

      {/* Footer: Simple Direct Links */}
      <div
        style={{
          borderTop: "1px solid #eff3f4",
          paddingTop: "12px",
          display: "flex",
          gap: "8px"
        }}
      >
        <button
          onClick={openX}
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            color: "#0f1419",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc"
            e.currentTarget.style.borderColor = "#cbd5e1"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff"
            e.currentTarget.style.borderColor = "#e2e8f0"
          }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Open X.com
        </button>

        <button
          onClick={openLinkedIn}
          title="Open LinkedIn in a new tab"
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            color: "#0f1419",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc"
            e.currentTarget.style.borderColor = "#cbd5e1"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff"
            e.currentTarget.style.borderColor = "#e2e8f0"
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="#0a66c2">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
          Open LinkedIn
        </button>
      </div>
    </div>
  )
}

export default IndexPopup
