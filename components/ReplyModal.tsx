import React, { useEffect, useState } from "react"
import { AIManager, PROVIDERS } from "../lib/ai/manager"
import { MissingApiKeyError } from "../lib/ai/types"
import { openReplyComposer } from "../lib/x-dom"
import { getGrokContext, generateRepliesWithGrok, regenerateSingleReplyWithGrok } from "../lib/grok-dom"

export interface ModalData {
  author: string
  postText: string
  article: HTMLElement
  hasMedia: boolean
}

interface ReplyState {
  id: string
  text: string
  draftText: string
  isEditing: boolean
  isRegenerating: boolean
  error?: string
}

interface CachedPostData {
  replies: ReplyState[] | null
  selectedTone: string
  customInstruction: string
  generationInfo: { provider: string; usedFallback: boolean } | null
  grokContext?: string | null
}

export interface ToneOption {
  value: string
  label: string
  emoji: string
  description: string
}

export const TONE_OPTIONS: ToneOption[] = [
  { value: "Smart", label: "Smart", emoji: "💡", description: "Concise, useful observation or perspective" },
  { value: "Casual", label: "Casual", emoji: "☕", description: "Relaxed, natural and conversational" },
  { value: "Curious", label: "Curious", emoji: "🧐", description: "Ask a relevant, genuine question" },
  { value: "Funny", label: "Funny", emoji: "😂", description: "Subtle, natural humor without cringe" },
  { value: "Technical", label: "Technical", emoji: "💻", description: "Developer & engineering-focused angle" },
  { value: "Bold", label: "Bold", emoji: "🔥", description: "Direct, confident reaction or opinion" },
  { value: "Supportive", label: "Supportive", emoji: "🤝", description: "Encouraging, positive & specific" },
  { value: "Contrarian", label: "Contrarian", emoji: "🤔", description: "Respectful challenge to assumptions" }
]

const postCache = new Map<string, CachedPostData>()

function getCacheKey(author: string, postText: string): string {
  return `${author}::${postText}`
}

export const ReplyModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<ModalData | null>(null)
  
  const [selectedTone, setSelectedTone] = useState<string>("Smart")
  const [isToneModalOpen, setIsToneModalOpen] = useState(false)
  const [customInstruction, setCustomInstruction] = useState<string>("")
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [replies, setReplies] = useState<ReplyState[] | null>(null)
  const [generationInfo, setGenerationInfo] = useState<{ provider: string; usedFallback: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [postingId, setPostingId] = useState<string | null>(null)
  
  const [isMissingKey, setIsMissingKey] = useState(false)
  const [hasApiConfigured, setHasApiConfigured] = useState(false)
  const [activeProviderName, setActiveProviderName] = useState<string>("")

  // Grok context state
  const [grokContext, setGrokContext] = useState<string | null>(null)
  const [isGrokLoading, setIsGrokLoading] = useState(false)
  const [grokError, setGrokError] = useState<string | null>(null)
  const [isGrokExpanded, setIsGrokExpanded] = useState(false)

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent<ModalData>
      const newPostData = customEvent.detail
      setData(newPostData)
      setIsOpen(true)
      setIsToneModalOpen(false)
      
      // Check whether user has configured API keys
      AIManager.getConfig().then(cfg => {
        const activePid = cfg.activeProvider
        const hasKeys = activePid && activePid !== 'grok' 
          ? (cfg.providers[activePid]?.accounts?.some(a => a.enabled && a.status !== 'invalid') ?? false) 
          : false
        setHasApiConfigured(Boolean(hasKeys))
        if (activePid && (PROVIDERS as any)[activePid]) {
          setActiveProviderName((PROVIDERS as any)[activePid].name)
        }
      })

      const key = getCacheKey(newPostData.author, newPostData.postText)
      const cached = postCache.get(key)
      if (cached) {
        setReplies(cached.replies)
        setSelectedTone(cached.selectedTone)
        setCustomInstruction(cached.customInstruction)
        setGenerationInfo(cached.generationInfo)
        setGrokContext(cached.grokContext || null)
        setIsGrokExpanded(Boolean(cached.grokContext))
      } else {
        setReplies(null)
        setGenerationInfo(null)
        setGrokContext(null)
        setIsGrokExpanded(false)

        chrome.storage.local.get(["replyly_defaultTone", "replyly_globalCustomPrompt"], (res) => {
          if (res.replyly_defaultTone) setSelectedTone(res.replyly_defaultTone)
          if (res.replyly_globalCustomPrompt) setCustomInstruction(res.replyly_globalCustomPrompt)
        })
      }
      
      setIsGenerating(false)
      setError(null)
      setCopiedId(null)
      setPostingId(null)
      setIsMissingKey(false)
      setIsGrokLoading(false)
      setGrokError(null)
    }

    document.addEventListener("replyly-open-modal", handleOpenModal)
    return () => document.removeEventListener("replyly-open-modal", handleOpenModal)
  }, [])

  // Auto-save to cache whenever replies, tone, customInstruction, or grokContext change
  useEffect(() => {
    if (data && (replies || grokContext)) {
      const key = getCacheKey(data.author, data.postText)
      postCache.set(key, {
        replies,
        selectedTone,
        customInstruction,
        generationInfo,
        grokContext
      })
    }
  }, [data, replies, selectedTone, customInstruction, generationInfo, grokContext])

  if (!isOpen || !data) return null

  const handleClose = () => {
    setIsOpen(false)
    setIsToneModalOpen(false)
  }

  // Generate replies using X's built-in Grok
  const handleGenerateWithGrok = async () => {
    if (!data.article) return
    
    setIsGenerating(true)
    setError(null)
    setReplies(null)
    setGenerationInfo(null)
    setIsMissingKey(false)

    try {
      const rawReplies = await generateRepliesWithGrok(
        data.article,
        selectedTone,
        customInstruction,
        3,
        (liveReplies) => {
          const liveStates: ReplyState[] = liveReplies.map((text, i) => ({
            id: `grok-${Date.now()}-${i}`,
            text,
            draftText: text,
            isEditing: false,
            isRegenerating: false
          }))
          setReplies(liveStates)
        }
      )

      const newReplies: ReplyState[] = rawReplies.map((text, i) => ({
        id: `grok-${Date.now()}-${i}`,
        text,
        draftText: text,
        isEditing: false,
        isRegenerating: false
      }))

      setReplies(newReplies)
      setGenerationInfo({ provider: "Grok (X built-in)", usedFallback: false })
    } catch (err: any) {
      setError(err.message || "Failed to generate replies with Grok. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate replies via configured API (or Grok fallback)
  const handleGenerate = async () => {
    if (!hasApiConfigured) {
      await handleGenerateWithGrok()
      return
    }

    if (!data.postText && !grokContext) {
      await handleGenerateWithGrok()
      return
    }
    
    setIsGenerating(true)
    setError(null)
    setReplies(null)
    setGenerationInfo(null)
    setIsMissingKey(false)

    try {
      const storageRes = await chrome.storage.local.get(["replyly_numReplies"])
      const numRepliesToGen = storageRes.replyly_numReplies || 3

      const result = await AIManager.generateReplies(
        data.postText,
        selectedTone,
        customInstruction,
        numRepliesToGen,
        grokContext || ""
      )
      
      const newReplies: ReplyState[] = result.replies.map((text, i) => ({
        id: `reply-${Date.now()}-${i}`,
        text,
        draftText: text,
        isEditing: false,
        isRegenerating: false
      }))
      
      setReplies(newReplies)
      setGenerationInfo({ provider: result.provider, usedFallback: result.usedFallback })
    } catch (err: any) {
      if (err instanceof MissingApiKeyError) {
        setIsMissingKey(true)
      } else {
        setError(err.message || "Something went wrong while generating replies.")
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async (id: string) => {
    if (!replies) return

    setReplies(prev => prev!.map(r => 
      r.id === id ? { ...r, isRegenerating: true, error: undefined } : r
    ))

    try {
      let newText = ""

      if (generationInfo?.provider?.toLowerCase().includes("grok") && data.article) {
        newText = await regenerateSingleReplyWithGrok(data.article, selectedTone, customInstruction)
      } else {
        const regenerated = await AIManager.generateReplies(
          data.postText,
          selectedTone,
          customInstruction,
          1,
          grokContext || ""
        )
        newText = regenerated.replies[0]
      }
      
      setReplies(prev => prev!.map(r => 
        r.id === id ? { ...r, text: newText, draftText: newText, isRegenerating: false, isEditing: false } : r
      ))
    } catch (err: any) {
      setReplies(prev => prev!.map(r => 
        r.id === id ? { ...r, isRegenerating: false, error: err.message || "Couldn't regenerate. Try again." } : r
      ))
    }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }
  
  const handlePost = async (id: string, text: string) => {
    setPostingId(id)
    setError(null)
    
    try {
      if (!data.article) {
        throw new Error("Original post reference lost. The page might have changed.")
      }
      
      setIsOpen(false)
      await openReplyComposer(data.article, text)
      
    } catch (err: any) {
      setIsOpen(true)
      setError(err.message || "Failed to open X's reply composer. Please use Copy instead.")
    } finally {
      setPostingId(null)
    }
  }

  const toggleEdit = (id: string, editing: boolean) => {
    setReplies(prev => prev!.map(r => 
      r.id === id ? { ...r, isEditing: editing, draftText: r.text } : r
    ))
  }

  const saveEdit = (id: string) => {
    setReplies(prev => prev!.map(r => 
      r.id === id ? { ...r, isEditing: false, text: r.draftText } : r
    ))
  }

  const handleDraftChange = (id: string, newText: string) => {
    if (newText.length > 280) return
    setReplies(prev => prev!.map(r => 
      r.id === id ? { ...r, draftText: newText } : r
    ))
  }

  const openSettings = () => {
    chrome.runtime.openOptionsPage()
  }

  const handleGrokContext = async () => {
    if (!data?.article) return
    setIsGrokLoading(true)
    setGrokError(null)
    setGrokContext(null)

    try {
      const context = await getGrokContext(data.article, {
        postText: data.postText,
        author: data.author,
        onProgress: (liveText) => {
          setGrokContext(liveText)
          setIsGrokExpanded(true)
        }
      })
      setGrokContext(context.analysis)
      setIsGrokExpanded(true)
    } catch (err: any) {
      setGrokError(err.message || "Failed to get real-time context from Grok. You can still generate replies without it.")
    } finally {
      setIsGrokLoading(false)
    }
  }

  const handleClearGrokContext = () => {
    setGrokContext(null)
    setGrokError(null)
    setIsGrokExpanded(false)
  }

  const activeTone = TONE_OPTIONS.find(t => t.value === selectedTone) || TONE_OPTIONS[0]

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.6)", zIndex: 2147483647,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: "550px", maxWidth: "90%", maxHeight: "90vh",
          backgroundColor: "#15202b", borderRadius: "16px", border: "1px solid #38444d",
          boxShadow: "0 8px 28px rgba(0, 0, 0, 0.28)", color: "#fff",
          display: "flex", flexDirection: "column", overflow: "hidden",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid #38444d" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#1d9bf0">
              <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
            </svg>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Replyly</h2>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "none", border: "none", color: "#8899a6", cursor: "pointer",
              padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%"
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 105.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"></path>
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
          
          {/* Post Reference */}
          <div>
            <div style={{ fontSize: "13px", color: "#8899a6", marginBottom: "6px" }}>
              Post you're replying to:
            </div>
            <div style={{ 
              fontSize: "14px", lineHeight: "1.5", maxHeight: "90px", overflowY: "auto",
              padding: "10px 12px", backgroundColor: "#192734", borderRadius: "8px", border: "1px solid #38444d"
            }}>
              <strong style={{ color: "#fff", display: "block", marginBottom: "2px" }}>{data.author}</strong>
              <span style={{ color: "#e1e8ed" }}>{data.postText || "Media post (no text)"}</span>
            </div>
          </div>

          {/* Grok Context Section - shown for media posts */}
          {data.hasMedia && (
            <div>
              <div style={{ 
                display: "flex", alignItems: "center", gap: "6px", 
                fontSize: "12px", color: "#8899a6", marginBottom: "8px"
              }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"></path>
                </svg>
                This post contains media
              </div>

              {!grokContext && !isGrokLoading && (
                <div>
                  <button
                    onClick={handleGrokContext}
                    disabled={isGrokLoading}
                    style={{
                      width: "100%", padding: "10px 16px", borderRadius: "8px",
                      border: "1px dashed #38444d", backgroundColor: "transparent",
                      color: "#1d9bf0", cursor: "pointer", fontSize: "13px", fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#1d9bf0"
                      e.currentTarget.style.backgroundColor = "rgba(29, 155, 240, 0.05)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#38444d"
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
                    </svg>
                    Get real-time context from Grok
                  </button>
                  <div style={{ fontSize: "11px", color: "#536471", marginTop: "4px", textAlign: "center" }}>
                    Uses X's built-in Grok to analyze images/videos in this post
                  </div>
                </div>
              )}

              {isGrokLoading && (
                <div style={{
                  padding: "12px", backgroundColor: "#192734", borderRadius: "8px",
                  border: "1px solid #38444d", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "10px"
                }}>
                  <div style={{
                    width: "14px", height: "14px", border: "2px solid #38444d",
                    borderTopColor: "#1d9bf0", borderRadius: "50%",
                    animation: "replyly-spin 1s linear infinite"
                  }} />
                  <span style={{ color: "#8899a6", fontSize: "13px" }}>Analyzing with Grok in real-time...</span>
                  <style>{`@keyframes replyly-spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {grokError && (
                <div style={{
                  padding: "8px 12px", backgroundColor: "rgba(244, 33, 46, 0.08)", 
                  borderRadius: "8px", border: "1px solid rgba(244, 33, 46, 0.2)",
                  fontSize: "12px", color: "#f4212e", display: "flex", 
                  justifyContent: "space-between", alignItems: "center"
                }}>
                  <span>{grokError}</span>
                  <button
                    onClick={handleGrokContext}
                    style={{
                      background: "transparent", border: "none", color: "#1d9bf0",
                      cursor: "pointer", fontSize: "12px", fontWeight: 600, padding: "2px 6px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {grokContext && (
                <div style={{
                  borderRadius: "8px", border: "1px solid #1d9bf0",
                  backgroundColor: "rgba(29, 155, 240, 0.05)", overflow: "hidden"
                }}>
                  <div
                    style={{
                      width: "100%", padding: "8px 12px", display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                      boxSizing: "border-box"
                    }}
                  >
                    <div 
                      onClick={() => setIsGrokExpanded(!isGrokExpanded)}
                      style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", flex: 1 }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="#00ba7c">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
                      </svg>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#00ba7c" }}>
                        Grok context active
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={handleGrokContext}
                        disabled={isGrokLoading}
                        style={{
                          background: "transparent", border: "none", color: "#1d9bf0",
                          fontSize: "12px", fontWeight: 600, cursor: isGrokLoading ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: "3px", padding: 0
                        }}
                        title="Fetch fresh real-time analysis from Grok"
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                        </svg>
                        Refresh
                      </button>
                      <span style={{ color: "#38444d" }}>|</span>
                      <button
                        type="button"
                        onClick={handleClearGrokContext}
                        style={{ background: "transparent", border: "none", fontSize: "12px", color: "#8899a6", cursor: "pointer", padding: 0 }}
                      >
                        Clear
                      </button>
                      <svg 
                        onClick={() => setIsGrokExpanded(!isGrokExpanded)}
                        viewBox="0 0 24 24" width="14" height="14" fill="#8899a6"
                        style={{ transform: isGrokExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", cursor: "pointer" }}
                      >
                        <path d="M7 10l5 5 5-5z"></path>
                      </svg>
                    </div>
                  </div>

                  {isGrokExpanded && (
                    <div style={{
                      padding: "0 12px 10px", fontSize: "12px", lineHeight: "1.5",
                      color: "#e1e8ed", maxHeight: "120px", overflowY: "auto",
                      borderTop: "1px solid rgba(29, 155, 240, 0.15)"
                    }}>
                      <div style={{ paddingTop: "8px", whiteSpace: "pre-wrap" }}>{grokContext}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tone Selector Button */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#fff" }}>
              Tone
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsToneModalOpen(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: "10px",
                backgroundColor: "#192734", border: "1px solid #38444d",
                cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#1d9bf0"
                e.currentTarget.style.backgroundColor = "rgba(29, 155, 240, 0.05)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#38444d"
                e.currentTarget.style.backgroundColor = "#192734"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>{activeTone.emoji}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{activeTone.label}</span>
                  <span style={{ fontSize: "11px", color: "#8899a6" }}>{activeTone.description}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1d9bf0", fontSize: "12px", fontWeight: 600 }}>
                <span>Change</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Custom Instruction */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px", color: "#fff" }}>
              Custom Instruction <span style={{ color: "#8899a6", fontWeight: 400 }}>(Optional)</span>
            </div>
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g. Mention MCP security, ask about their stack..."
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "8px",
                border: "1px solid #38444d", backgroundColor: "#192734", color: "#fff",
                fontSize: "13px", boxSizing: "border-box", outline: "none"
              }}
            />
          </div>

          {/* Replies */}
          {replies && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                  Generated Replies
                </div>
                {generationInfo && (
                  <div style={{ fontSize: "12px", color: generationInfo.usedFallback ? "#f91880" : "#8899a6", fontWeight: 600 }}>
                    {generationInfo.usedFallback ? `Generated with ${generationInfo.provider} · fallback` : `Generated with ${generationInfo.provider}`}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {replies.map((reply) => {
                  const isAnyPosting = postingId !== null
                  
                  return (
                    <div key={reply.id} style={{
                      padding: "14px", backgroundColor: "#192734", borderRadius: "12px",
                      border: "1px solid #38444d", position: "relative"
                    }}>
                      
                      {reply.isRegenerating ? (
                        <div style={{ padding: "12px 0", textAlign: "center", color: "#8899a6", fontSize: "13px" }}>
                          Regenerating...
                        </div>
                      ) : reply.isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <textarea
                            value={reply.draftText}
                            onChange={(e) => handleDraftChange(reply.id, e.target.value)}
                            style={{
                              width: "100%", height: "70px", padding: "10px", borderRadius: "8px",
                              border: "1px solid #1d9bf0", backgroundColor: "#15202b", color: "#e1e8ed",
                              fontSize: "14px", lineHeight: "1.5", resize: "none", boxSizing: "border-box", outline: "none",
                              fontFamily: "inherit"
                            }}
                          />
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: reply.draftText.length === 280 ? "#f4212e" : "#8899a6" }}>
                              {reply.draftText.length} / 280
                            </span>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => toggleEdit(reply.id, false)}
                                style={{
                                  background: "transparent", border: "none", color: "#8899a6",
                                  fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "6px 12px"
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEdit(reply.id)}
                                style={{
                                  background: "#1d9bf0", border: "none", color: "#fff", borderRadius: "9999px",
                                  fontSize: "13px", fontWeight: 700, cursor: "pointer", padding: "6px 16px"
                                }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", color: "#e1e8ed", whiteSpace: "pre-wrap" }}>
                            {reply.text}
                          </p>
                          
                          {reply.error && (
                            <div style={{ color: "#f4212e", fontSize: "12px" }}>{reply.error}</div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => toggleEdit(reply.id, true)}
                                disabled={isAnyPosting}
                                style={{
                                  background: "transparent", border: "1px solid #38444d", color: "#8899a6",
                                  borderRadius: "9999px", padding: "3px 10px", fontSize: "12px", fontWeight: 600,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer"
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRegenerate(reply.id)}
                                disabled={isAnyPosting}
                                style={{
                                  background: "transparent", border: "1px solid #38444d", color: "#8899a6",
                                  borderRadius: "9999px", padding: "3px 10px", fontSize: "12px", fontWeight: 600,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer"
                                }}
                              >
                                Regenerate
                              </button>
                            </div>
                            
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => handleCopy(reply.id, reply.text)}
                                disabled={isAnyPosting}
                                style={{
                                  background: "transparent",
                                  border: `1px solid ${copiedId === reply.id ? "#00ba7c" : "#38444d"}`,
                                  color: copiedId === reply.id ? "#00ba7c" : "#8899a6",
                                  borderRadius: "9999px", padding: "5px 14px", fontSize: "12px", fontWeight: 600,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer", transition: "all 0.2s"
                                }}
                              >
                                {copiedId === reply.id ? "Copied!" : "Copy"}
                              </button>
                              
                              <button
                                onClick={() => handlePost(reply.id, reply.text)}
                                disabled={isAnyPosting}
                                style={{
                                  background: postingId === reply.id ? "#192734" : "#1d9bf0",
                                  border: `1px solid ${postingId === reply.id ? "#1d9bf0" : "transparent"}`,
                                  color: postingId === reply.id ? "#1d9bf0" : "#fff",
                                  borderRadius: "9999px", padding: "5px 14px", fontSize: "12px", fontWeight: 700,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer", transition: "all 0.2s"
                                }}
                              >
                                {postingId === reply.id ? "Opening..." : "Post this →"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Global Error & Missing Key Fallback */}
          {error && (
            <div style={{
              padding: "10px 14px", backgroundColor: "#ffe9e9", color: "#f4212e", 
              borderRadius: "8px", fontSize: "13px", fontWeight: 500, lineHeight: "1.4",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <span>{error}</span>
              <button
                onClick={handleGenerateWithGrok}
                style={{
                  background: "#1d9bf0", color: "#fff", border: "none", borderRadius: "9999px",
                  padding: "4px 10px", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
                }}
              >
                Try Grok instead
              </button>
            </div>
          )}

          {isMissingKey && (
            <div style={{
              padding: "14px", backgroundColor: "#192734", border: "1px solid #1d9bf0", 
              borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start"
            }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#e1e8ed", lineHeight: "1.5" }}>
                No API key configured for {activeProviderName || "AI"}. You can generate replies directly with Grok for free!
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleGenerateWithGrok}
                  style={{
                    background: "#1d9bf0", color: "#fff", border: "none", borderRadius: "9999px",
                    padding: "6px 14px", fontSize: "13px", fontWeight: 700, cursor: "pointer"
                  }}
                >
                  Generate with Grok (Free)
                </button>
                <button
                  onClick={openSettings}
                  style={{
                    background: "transparent", color: "#8899a6", border: "1px solid #38444d", borderRadius: "9999px",
                    padding: "6px 14px", fontSize: "13px", fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Settings
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer with Generation Engines */}
        <div style={{
          padding: "14px 16px", borderTop: "1px solid #38444d",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          backgroundColor: "#15202b"
        }}>
          {/* Left: Quick Grok button or free indicator */}
          <div>
            {hasApiConfigured ? (
              <button
                onClick={handleGenerateWithGrok}
                disabled={isGenerating || postingId !== null}
                style={{
                  background: "transparent", border: "1px solid #38444d", color: "#1d9bf0",
                  borderRadius: "9999px", padding: "8px 16px", fontSize: "13px", fontWeight: 600,
                  cursor: isGenerating || postingId !== null ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#1d9bf0"
                  e.currentTarget.style.backgroundColor = "rgba(29, 155, 240, 0.05)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#38444d"
                  e.currentTarget.style.backgroundColor = "transparent"
                }}
                title="Generate directly using X's built-in Grok"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
                </svg>
                Generate with Grok (Free)
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8899a6", fontSize: "12px" }}>
                <span style={{ color: "#00ba7c" }}>●</span>
                <span>Using built-in Grok (Free)</span>
              </div>
            )}
          </div>

          {/* Right: Main Generate Button */}
          <div>
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || postingId !== null}
              style={{
                backgroundColor: isGenerating || postingId !== null ? "#192734" : "#1d9bf0",
                color: isGenerating || postingId !== null ? "#8899a6" : "#fff",
                border: "none", borderRadius: "9999px", padding: "9px 22px", fontSize: "14px", fontWeight: 700,
                cursor: isGenerating || postingId !== null ? "not-allowed" : "pointer",
                transition: "background-color 0.2s", display: "flex", alignItems: "center", gap: "8px"
              }}
            >
              {isGenerating ? (
                "Thinking..."
              ) : replies ? (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
                  </svg>
                  Generate Again
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
                  </svg>
                  {hasApiConfigured ? `Generate Reply (${activeProviderName || "API"})` : "Generate with Grok"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tone Selection Sub-Modal */}
        {isToneModalOpen && (
          <div
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.75)", zIndex: 100,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px", boxSizing: "border-box", borderRadius: "16px",
              backdropFilter: "blur(4px)"
            }}
            onClick={() => setIsToneModalOpen(false)}
          >
            <div
              style={{
                width: "100%", maxWidth: "480px", backgroundColor: "#15202b",
                borderRadius: "14px", border: "1px solid #38444d",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
                display: "flex", flexDirection: "column", overflow: "hidden"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", borderBottom: "1px solid #38444d"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>🎭</span>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>Select Tone</h3>
                </div>
                <button
                  onClick={() => setIsToneModalOpen(false)}
                  style={{
                    background: "none", border: "none", color: "#8899a6", cursor: "pointer",
                    padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%"
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 105.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"></path>
                  </svg>
                </button>
              </div>

              <div style={{
                padding: "14px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px", maxHeight: "380px", overflowY: "auto"
              }}>
                {TONE_OPTIONS.map(tone => {
                  const isSelected = selectedTone === tone.value
                  return (
                    <div
                      key={tone.value}
                      onClick={() => {
                        setSelectedTone(tone.value)
                        setIsToneModalOpen(false)
                      }}
                      style={{
                        padding: "12px", borderRadius: "10px",
                        border: `1px solid ${isSelected ? "#1d9bf0" : "#38444d"}`,
                        backgroundColor: isSelected ? "rgba(29, 155, 240, 0.12)" : "#192734",
                        cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px",
                        transition: "all 0.15s", position: "relative"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#1d9bf0"
                          e.currentTarget.style.backgroundColor = "rgba(29, 155, 240, 0.05)"
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#38444d"
                          e.currentTarget.style.backgroundColor = "#192734"
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "16px" }}>{tone.emoji}</span>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: isSelected ? "#1d9bf0" : "#fff" }}>
                            {tone.label}
                          </span>
                        </div>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="#1d9bf0">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: "12px", color: "#8899a6", lineHeight: "1.3" }}>
                        {tone.description}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
