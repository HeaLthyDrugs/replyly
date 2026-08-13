import React, { useEffect, useState } from "react"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [hasApiKey, setHasApiKey] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(["isExtensionEnabled", "geminiApiKey"], (result) => {
      if (result.isExtensionEnabled !== undefined) {
        setIsEnabled(result.isExtensionEnabled)
      } else {
        // Default to true if not set
        chrome.storage.local.set({ isExtensionEnabled: true })
      }

      if (result.geminiApiKey) {
        setHasApiKey(true)
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

  return (
    <div style={{
      width: "320px",
      padding: "24px",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: "#0f1419",
      backgroundColor: "#fff"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="#1d9bf0">
          <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
        </svg>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>Replyly</h1>
      </div>

      <div style={{
        backgroundColor: "#f7f9f9",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 700 }}>Extension Status</h2>
          <span style={{ fontSize: "13px", color: isEnabled ? "#00ba7c" : "#536471", fontWeight: 600 }}>
            {isEnabled ? "Active on X" : "Paused"}
          </span>
        </div>
        
        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          style={{
            width: "48px",
            height: "24px",
            borderRadius: "12px",
            backgroundColor: isEnabled ? "#00ba7c" : "#cfd9de",
            border: "none",
            position: "relative",
            cursor: "pointer",
            transition: "background-color 0.2s"
          }}
          title={isEnabled ? "Disable Replyly" : "Enable Replyly"}
        >
          <div style={{
            position: "absolute",
            top: "2px",
            left: isEnabled ? "26px" : "2px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          }} />
        </button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>API Key</span>
          <span style={{ 
            fontSize: "12px", 
            fontWeight: 700, 
            color: hasApiKey ? "#00ba7c" : "#f4212e",
            backgroundColor: hasApiKey ? "#dcfce3" : "#ffe9e9",
            padding: "4px 10px",
            borderRadius: "9999px"
          }}>
            {hasApiKey ? "Saved" : "Not Set"}
          </span>
        </div>
        {!hasApiKey && (
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#536471", lineHeight: "1.4" }}>
            You need to add your Gemini API key before Replyly can generate replies.
          </p>
        )}
        <button
          onClick={openSettings}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "9999px",
            border: "1px solid #cfd9de",
            backgroundColor: "#fff",
            color: "#0f1419",
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
            transition: "background-color 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f7f9f9"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 3.9a5.1 5.1 0 110 10.2 5.1 5.1 0 010-10.2z"/>
          </svg>
          Manage API Keys
        </button>
      </div>

    </div>
  )
}

export default IndexPopup
