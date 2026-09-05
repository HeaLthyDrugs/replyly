import React, { useEffect, useState } from "react"
import { AIManager } from "../lib/ai/manager"
import { MissingApiKeyError } from "../lib/ai/types"
import { openReplyComposer } from "../lib/x-dom"
import { openLinkedInCommentComposer, detectLinkedInPostMedia, extractLinkedInPostData } from "../lib/linkedin-dom"
import { detectPostMedia, findGrokSidebarPanel, getGrokContext, isGrokThinkingOrStreaming, scrapeGrokContext } from "../lib/grok-dom"
import { RlyLogoIcon } from "./Logo"

export interface ModalData {
  author: string
  postText: string
  article: HTMLElement
  hasMedia: boolean
  mediaType?: "video" | "image" | "document" | "media"
  mediaDescription?: string
  platform?: "x" | "linkedin"
}

interface ReplyState {
  id: string
  text: string
  draftText: string
  isEditing: boolean
  isRegenerating: boolean
  error?: string
}

export interface GenerationMetadata {
  provider: string
  providerName?: string
  accountId?: string
  accountName?: string
  maskedKey?: string
  model?: string
  tokensUsed?: number
  latencyMs?: number
  usedFallback: boolean
}

interface CachedPostData {
  replies: ReplyState[] | null
  selectedTone: string
  customInstruction: string
  generationInfo: GenerationMetadata | null
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

const GENERATION_STEPS = [
  "Analyzing post context & tone...",
  "Crafting thoughtful perspectives...",
  "Applying tone nuances...",
  "Polishing reply variations...",
  "Finalizing responses..."
]

// Module-level cache to persist generated replies for specific posts across modal opens
const postCache = new Map<string, CachedPostData>()

function getCacheKey(author: string, postText: string, article?: HTMLElement | null, platform?: string): string {
  if (article) {
    if (platform === "linkedin") {
      const urn = article.getAttribute('data-urn') || article.getAttribute('data-id')
      if (urn) return `li:${urn}`
      const statusLink = article.querySelector('a[href*="/feed/update/urn:li:activity:"]') as HTMLAnchorElement | null
      if (statusLink) {
        const href = statusLink.getAttribute('href') || statusLink.href || ''
        const match = href.match(/urn:li:activity:(\d+)/)
        if (match && match[1]) {
          return `li:activity:${match[1]}`
        }
      }
    } else {
      const statusLink = article.querySelector('a[href*="/status/"]') as HTMLAnchorElement | null
      if (statusLink) {
        const href = statusLink.getAttribute('href') || statusLink.href || ''
        const statusMatch = href.match(/\/status\/(\d+)/)
        if (statusMatch && statusMatch[1]) {
          return `status:${statusMatch[1]}`
        }
      }
    }
  }
  return `${platform || 'x'}::${author}::${postText}`
}

export const ReplyModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<ModalData | null>(null)
  
  const [selectedTone, setSelectedTone] = useState<string>("Smart")
  const [isToneModalOpen, setIsToneModalOpen] = useState(false)
  const [customInstruction, setCustomInstruction] = useState<string>("")
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [replies, setReplies] = useState<ReplyState[] | null>(null)
  const [generationInfo, setGenerationInfo] = useState<GenerationMetadata | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [postingId, setPostingId] = useState<string | null>(null)
  
  const [isMissingKey, setIsMissingKey] = useState(false)

  // Grok context state
  const [grokContext, setGrokContext] = useState<string | null>(null)
  const [isGrokLoading, setIsGrokLoading] = useState(false)
  const [isGrokStreaming, setIsGrokStreaming] = useState(false)
  const [isGrokDismissed, setIsGrokDismissed] = useState(false)
  const [grokError, setGrokError] = useState<string | null>(null)
  const [isGrokExpanded, setIsGrokExpanded] = useState(false)

  // Cycle engaging progress steps during active generation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isGenerating) {
      interval = setInterval(() => {
        setGenerationStep((prev) => (prev + 1) % GENERATION_STEPS.length)
      }, 1200)
    } else {
      setGenerationStep(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGenerating])

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent<ModalData>
      const newPostData = { ...customEvent.detail }

      // Re-extract if on LinkedIn and data is missing, default, or accidentally captured video controls
      if (
        newPostData.platform === "linkedin" &&
        (!newPostData.postText ||
          newPostData.author === "LinkedIn Member" ||
          newPostData.postText.toLowerCase().includes("remaining time") ||
          newPostData.postText.toLowerCase().includes("playback rate") ||
          newPostData.postText.toLowerCase().includes("vjs-") ||
          newPostData.postText.toLowerCase().includes("stream type live")) &&
        newPostData.article
      ) {
        const postCard =
          newPostData.article.closest<HTMLElement>(
            'div[data-view-name="feed-full-update"], div.feed-shared-update-v2, div.occludable-update, article'
          ) || newPostData.article
        const freshData = extractLinkedInPostData(postCard)
        if (freshData.text) newPostData.postText = freshData.text
        if (freshData.author && freshData.author !== "LinkedIn Member") newPostData.author = freshData.author
        if (freshData.hasMedia) {
          newPostData.hasMedia = true
          newPostData.mediaType = freshData.mediaType
          newPostData.mediaDescription = freshData.mediaDescription
        }
      }

      setData(newPostData)
      setIsOpen(true)
      setIsToneModalOpen(false)
      setIsGrokDismissed(false)
      
      const key = getCacheKey(newPostData.author, newPostData.postText, newPostData.article, newPostData.platform)
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

        // Load saved preferences for new posts
        chrome.storage.local.get(["replyly_defaultTone", "replyly_globalCustomPrompt"], (res) => {
          if (res.replyly_defaultTone) setSelectedTone(res.replyly_defaultTone)
          if (res.replyly_globalCustomPrompt) setCustomInstruction(res.replyly_globalCustomPrompt)
        })
      }
      
      setIsGenerating(false)
      setGenerationStep(0)
      setError(null)
      setCopiedId(null)
      setPostingId(null)
      setIsMissingKey(false)
      setIsGrokLoading(false)
      setIsGrokStreaming(false)
      setGrokError(null)
    }

    document.addEventListener("replyly-open-modal", handleOpenModal)
    return () => document.removeEventListener("replyly-open-modal", handleOpenModal)
  }, [])

  // Auto-refresh and synchronize real-time Grok context automatically while active (X.com only)
  useEffect(() => {
    if (!isOpen || !data?.article || isGrokDismissed || data.platform === "linkedin") return
    // Only auto-sync if Grok analysis is actively loading/streaming or already present for this post
    if (!isGrokLoading && !isGrokStreaming && !grokContext) return

    let isMounted = true
    const syncInterval = setInterval(() => {
      if (!isMounted) return

      const panel = findGrokSidebarPanel()
      if (!panel) {
        setIsGrokStreaming(false)
        return
      }

      const isThinking = isGrokThinkingOrStreaming(panel)
      const freshText = scrapeGrokContext({
        postText: data.postText,
        author: data.author,
        article: data.article
      })

      if (isThinking) {
        setIsGrokStreaming(true)
        if (freshText && freshText.length >= 20) {
          setGrokContext(freshText)
          setIsGrokExpanded(true)
        }
      } else {
        setIsGrokStreaming(false)
        if (freshText && freshText.length >= 20) {
          setGrokContext((prev) => {
            // If new text is longer or updated, update automatically
            if (!prev || freshText.length > prev.length || (freshText !== prev && !prev.includes(freshText))) {
              setIsGrokExpanded(true)
              return freshText
            }
            return prev
          })
        }
      }
    }, 400)

    return () => {
      isMounted = false
      clearInterval(syncInterval)
    }
  }, [isOpen, data, isGrokDismissed, isGrokLoading, isGrokStreaming, grokContext])

  // Auto-save to cache whenever replies, tone, customInstruction, or grokContext change
  useEffect(() => {
    if (data && (replies || grokContext)) {
      const key = getCacheKey(data.author, data.postText, data.article, data.platform)
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

  const handleGenerate = async () => {
    const mediaInfo =
      data.article && data.platform === "linkedin"
        ? detectLinkedInPostMedia(data.article)
        : { hasMedia: data.hasMedia, mediaType: data.mediaType, mediaDescription: data.mediaDescription }

    let effectiveText = data.postText
    if (data.platform === "linkedin" && (data.hasMedia || mediaInfo.hasMedia)) {
      const mediaLabel =
        (data.mediaType || mediaInfo.mediaType) === "video"
          ? "a video demonstration"
          : (data.mediaType || mediaInfo.mediaType) === "image"
            ? "an image / screenshot"
            : (data.mediaType || mediaInfo.mediaType) === "document"
              ? "a document / carousel"
              : "media content"

      if (effectiveText) {
        effectiveText = `${effectiveText}\n\n[Attached media context: The author also attached ${mediaLabel} to this post]`
      } else {
        effectiveText = `[Media post: Author ${data.author} shared ${mediaLabel} with no text caption]`
      }
    }

    if (!effectiveText && !grokContext) return
    
    setIsGenerating(true)
    setGenerationStep(0)
    setError(null)
    setReplies(null)
    setGenerationInfo(null)
    setIsMissingKey(false)

    try {
      const storageRes = await chrome.storage.local.get(["replyly_numReplies"])
      const numRepliesToGen = storageRes.replyly_numReplies || 3

      const result = await AIManager.generateReplies(
        effectiveText,
        selectedTone,
        customInstruction,
        numRepliesToGen,
        data.platform === "linkedin" ? "" : (grokContext || ""),
        data.platform || "x"
      )
      
      const newReplies: ReplyState[] = result.replies.map((text, i) => ({
        id: `reply-${Date.now()}-${i}`,
        text,
        draftText: text,
        isEditing: false,
        isRegenerating: false
      }))
      
      setReplies(newReplies)
      setGenerationInfo({
        provider: result.provider,
        providerName: result.providerName,
        accountId: result.accountId,
        accountName: result.accountName,
        maskedKey: result.maskedKey,
        model: result.model,
        tokensUsed: result.tokensUsed,
        latencyMs: result.latencyMs,
        usedFallback: result.usedFallback
      })
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
      const regeneratedReplies = await AIManager.generateReplies(
        data.postText,
        selectedTone,
        customInstruction,
        1,
        data.platform === "linkedin" ? "" : (grokContext || ""),
        data.platform || "x"
      )
      const newText = regeneratedReplies.replies[0]
      
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
      if (data.platform === "linkedin") {
        await openLinkedInCommentComposer(data.article, text)
      } else {
        await openReplyComposer(data.article, text)
      }
      
    } catch (err: any) {
      setIsOpen(true)
      setError(err.message || `Failed to open ${data.platform === "linkedin" ? "LinkedIn's" : "X's"} comment composer. Please use Copy instead.`)
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
    const maxChars = data?.platform === "linkedin" ? 3000 : 280
    if (newText.length > maxChars) return
    setReplies(prev => prev!.map(r => 
      r.id === id ? { ...r, draftText: newText } : r
    ))
  }

  const openSettings = () => {
    chrome.runtime.openOptionsPage()
  }

  const handleGrokContext = async () => {
    if (!data?.article) return
    setIsGrokDismissed(false)
    setIsGrokLoading(true)
    setIsGrokStreaming(true)
    setGrokError(null)
    setGrokContext(null) // Clear any previous context to prevent stale display

    try {
      const context = await getGrokContext(data.article, {
        postText: data.postText,
        author: data.author,
        onProgress: (liveText) => {
          setGrokContext(liveText)
          setIsGrokExpanded(true)
        }
      })
      if (context?.analysis) {
        setGrokContext(context.analysis)
        setIsGrokExpanded(true)
        setIsGrokLoading(false)
        setIsGrokStreaming(false)
        return
      }
    } catch {
      // Native Grok trigger wasn't available; fall through to instant AI context generation
    }

    try {
      const mediaDetected = detectPostMedia(data.article)
      const mediaStr = mediaDetected.hasMedia ? "Images / Video attached to post" : ""
      const aiContext = await AIManager.generatePostContext(data.postText, data.author, mediaStr)
      if (aiContext && aiContext.trim().length > 0) {
        setGrokContext(aiContext)
        setIsGrokExpanded(true)
      } else {
        setGrokError("Could not generate context for this post.")
      }
    } catch (aiErr: any) {
      setGrokError(aiErr.message || "Failed to get real-time context. You can still generate replies without it.")
    } finally {
      setIsGrokLoading(false)
      setIsGrokStreaming(false)
    }
  }

  const handleClearGrokContext = () => {
    setGrokContext(null)
    setGrokError(null)
    setIsGrokExpanded(false)
    setIsGrokDismissed(true)
    if (data) {
      const key = getCacheKey(data.author, data.postText, data.article)
      const existing = postCache.get(key)
      if (existing) {
        postCache.set(key, { ...existing, grokContext: null })
      }
    }
  }

  const activeTone = TONE_OPTIONS.find(t => t.value === selectedTone) || TONE_OPTIONS[0]

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.65)", zIndex: 2147483647,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        backdropFilter: "blur(4px)"
      }}
      onClick={handleClose}
    >
      {/* Styles for vibrant animations & custom sleek scrollbars */}
      <style>{`
        @keyframes replyly-spin { to { transform: rotate(360deg); } }
        @keyframes rly-gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes rly-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes rly-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes rly-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.5; }
        }
        @keyframes rly-fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .replyly-scroll {
          overflow-x: hidden !important;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .replyly-scroll::-webkit-scrollbar {
          width: 5px;
          height: 0px;
        }
        .replyly-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .replyly-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 9999px;
        }
        .replyly-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
        .replyly-scroll::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>

      <div
        style={{
          width: "560px", maxWidth: "92%", maxHeight: "90vh",
          backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0",
          boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 1px rgba(0, 0, 0, 0.1)",
          color: "#0f172a", display: "flex", flexDirection: "column", overflow: "hidden",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#ffffff"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <RlyLogoIcon size={26} />
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.2px" }}>Replyly</h2>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", cursor: "pointer",
              padding: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "8px", transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f1f5f9"
              e.currentTarget.style.color = "#0f172a"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f8fafc"
              e.currentTarget.style.color = "#64748b"
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 105.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"></path>
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div className="replyly-scroll" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", overflowX: "hidden" }}>
          
          {/* Post Reference */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {data.platform === "linkedin" ? "Post you're commenting on" : "Post you're replying to"}
            </div>
            <div className="replyly-scroll" style={{ 
              fontSize: "13.5px", lineHeight: "1.5", maxHeight: "90px", overflowY: "auto", overflowX: "hidden",
              wordBreak: "break-word", overflowWrap: "anywhere",
              padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0"
            }}>
              <strong style={{ color: "#0f172a", display: "block", marginBottom: "2px", fontWeight: 700 }}>{data.author}</strong>
              <span style={{ color: "#334155" }}>{data.postText || "Media post (no text)"}</span>
            </div>
          </div>

          {/* Media detected indicator for LinkedIn */}
          {data.article && data.platform === "linkedin" && (() => {
            const currentMedia = detectLinkedInPostMedia(data.article)
            const isMedia = data.hasMedia || currentMedia.hasMedia
            if (!isMedia) return null

            const type = data.mediaType || currentMedia.mediaType || "media"
            const label =
              type === "video"
                ? "Video attached"
                : type === "image"
                  ? "Image attached"
                  : type === "document"
                    ? "Document / Carousel attached"
                    : "Media attached"

            const icon =
              type === "video" ? "🎬" : type === "image" ? "🖼️" : type === "document" ? "📄" : "📷"

            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "9px 12px",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "8px",
                  border: "1px solid #bae6fd",
                  fontSize: "12px",
                  color: "#0369a1"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                  <span style={{ fontSize: "14px" }}>{icon}</span>
                  <span>{label}</span>
                </div>
                <div style={{ fontSize: "11.5px", color: "#0c4a6e", lineHeight: "1.4" }}>
                  💡 AI generates replies using the author's commentary & media context (fully optimized for free & text-only API models).
                </div>
              </div>
            )
          })()}

          {/* Grok Context Section - Only on X (Twitter) */}
          {data.article && data.platform !== "linkedin" && (
            <div>
              {/* Media detected indicator */}
              {(data.hasMedia || detectPostMedia(data.article).hasMedia) && (
                <div style={{ 
                  display: "flex", alignItems: "center", gap: "6px", 
                  fontSize: "12px", color: "#64748b", marginBottom: "8px", fontWeight: 600
                }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"></path>
                  </svg>
                  This post contains media
                </div>
              )}

              {/* Grok context states */}
              {!grokContext && !isGrokLoading && (
                <div>
                  <button
                    onClick={handleGrokContext}
                    disabled={isGrokLoading}
                    style={{
                      width: "100%", padding: "10px 16px", borderRadius: "10px",
                      border: "1.5px dashed #FCD5BA", backgroundColor: "#FFF8F5",
                      color: "#E76F51", cursor: "pointer", fontSize: "13px", fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#E76F51"
                      e.currentTarget.style.backgroundColor = "#FFF3EE"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#FCD5BA"
                      e.currentTarget.style.backgroundColor = "#FFF8F5"
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    Get real-time context from Grok
                  </button>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", textAlign: "center" }}>
                    Uses X's built-in Grok to analyze media & real-time context for this post
                  </div>
                </div>
              )}

              {/* Loading state */}
              {isGrokLoading && !grokContext && (
                <div style={{
                  padding: "12px", backgroundColor: "#f8fafc", borderRadius: "10px",
                  border: "1px solid #e2e8f0", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "10px"
                }}>
                  <div style={{
                    width: "14px", height: "14px", border: "2px solid #e2e8f0",
                    borderTopColor: "#E76F51", borderRadius: "50%",
                    animation: "replyly-spin 1s linear infinite"
                  }} />
                  <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>Analyzing with Grok in real-time...</span>
                </div>
              )}

              {/* Grok error */}
              {grokError && (
                <div style={{
                  padding: "8px 12px", backgroundColor: "#fef2f2", 
                  borderRadius: "8px", border: "1px solid #fecaca",
                  fontSize: "12px", color: "#b91c1c", display: "flex", 
                  justifyContent: "space-between", alignItems: "center"
                }}>
                  <span>{grokError}</span>
                  <button
                    onClick={handleGrokContext}
                    style={{
                      background: "transparent", border: "none", color: "#E76F51",
                      cursor: "pointer", fontSize: "12px", fontWeight: 700, padding: "2px 6px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Grok context preview with Live Auto-Refresh */}
              {grokContext && (
                <div style={{
                  borderRadius: "10px", border: "1px solid #FCD5BA",
                  backgroundColor: "#FFF8F5", overflow: "hidden"
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
                      {isGrokLoading || isGrokStreaming ? (
                        <>
                          <div style={{
                            width: "12px", height: "12px", border: "2px solid #FCD5BA",
                            borderTopColor: "#E76F51", borderRadius: "50%",
                            animation: "replyly-spin 0.8s linear infinite"
                          }} />
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#E76F51" }}>
                            Grok is thinking & streaming context...
                          </span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="#059669">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
                          </svg>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#059669" }}>
                            Grok context active
                          </span>
                        </>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {/* Real-time Refresh Button */}
                      <button
                        type="button"
                        onClick={handleGrokContext}
                        disabled={isGrokLoading}
                        style={{
                          background: "transparent", border: "none", color: "#E76F51",
                          fontSize: "12px", fontWeight: 700, cursor: isGrokLoading ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: "3px", padding: 0
                        }}
                        title="Fetch fresh real-time analysis from Grok"
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ animation: isGrokLoading ? "replyly-spin 1s linear infinite" : "none" }}>
                          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                        </svg>
                        Refresh
                      </button>
                      <span style={{ color: "#cbd5e1" }}>|</span>
                      <button
                        type="button"
                        onClick={handleClearGrokContext}
                        style={{ background: "transparent", border: "none", fontSize: "12px", color: "#64748b", cursor: "pointer", padding: 0, fontWeight: 600 }}
                      >
                        Clear
                      </button>
                      <svg 
                        onClick={() => setIsGrokExpanded(!isGrokExpanded)}
                        viewBox="0 0 24 24" width="14" height="14" fill="#64748b"
                        style={{ transform: isGrokExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", cursor: "pointer" }}
                      >
                        <path d="M7 10l5 5 5-5z"></path>
                      </svg>
                    </div>
                  </div>

                  {isGrokExpanded && (
                    <div className="replyly-scroll" style={{
                      padding: "0 12px 10px", fontSize: "12px", lineHeight: "1.5",
                      color: "#334155", maxHeight: "120px", overflowY: "auto", overflowX: "hidden",
                      wordBreak: "break-word", overflowWrap: "anywhere",
                      borderTop: "1px solid #FCD5BA"
                    }}>
                      <div style={{ paddingTop: "8px", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere" }}>{grokContext}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tone Selector Button */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Tone
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => !isGenerating && setIsToneModalOpen(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: "10px",
                backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
                cursor: isGenerating ? "not-allowed" : "pointer", transition: "all 0.15s ease",
                opacity: isGenerating ? 0.75 : 1
              }}
              onMouseEnter={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.borderColor = "#E76F51"
                  e.currentTarget.style.backgroundColor = "#FFF3EE"
                }
              }}
              onMouseLeave={(e) => {
                if (!isGenerating) {
                  e.currentTarget.style.borderColor = "#e2e8f0"
                  e.currentTarget.style.backgroundColor = "#f8fafc"
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>{activeTone.emoji}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{activeTone.label}</span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>{activeTone.description}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#E76F51", fontSize: "12px", fontWeight: 700 }}>
                <span>Change</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Custom Instruction */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Custom Instruction <span style={{ color: "#94a3b8", fontWeight: 500, textTransform: "none" }}>(Optional)</span>
            </div>
            <input
              type="text"
              value={customInstruction}
              disabled={isGenerating}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g. Mention MCP security, ask about their stack..."
              style={{
                width: "100%", padding: "10px 14px", borderRadius: "10px",
                border: "1px solid #cbd5e1", backgroundColor: isGenerating ? "#f8fafc" : "#ffffff", color: "#0f172a",
                fontSize: "13px", boxSizing: "border-box", outline: "none",
                transition: "border-color 0.15s ease",
                opacity: isGenerating ? 0.75 : 1
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#E76F51"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
            />
          </div>

          {/* Active Generation Skeleton & Live Progress State */}
          {isGenerating && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", animation: "rly-fade-in 0.25s ease" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: "10px",
                backgroundColor: "#FFF3EE", border: "1px solid #FCD5BA"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    backgroundColor: "#E76F51",
                    boxShadow: "0 0 8px #E76F51",
                    animation: "rly-pulse 1.4s infinite"
                  }} />
                  <span
                    key={generationStep}
                    style={{
                      fontSize: "13px", fontWeight: 700, color: "#D65A3C",
                      animation: "rly-fade-in 0.3s ease"
                    }}
                  >
                    {GENERATION_STEPS[generationStep]}
                  </span>
                </div>
                <span style={{
                  fontSize: "11px", fontWeight: 800,
                  backgroundColor: "#ffffff", color: "#E76F51",
                  padding: "2px 8px", borderRadius: "9999px",
                  border: "1px solid #FCD5BA"
                }}>
                  {activeTone.emoji} {activeTone.label}
                </span>
              </div>

              {/* Shimmer Skeleton Reply Cards */}
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    background: "linear-gradient(90deg, transparent 0%, rgba(231, 111, 81, 0.08) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: `rly-shimmer 1.6s infinite ease-in-out ${idx * 0.2}s`
                  }} />

                  <div style={{
                    height: "13px",
                    width: idx === 0 ? "88%" : idx === 1 ? "94%" : "78%",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "6px"
                  }} />
                  <div style={{
                    height: "13px",
                    width: idx === 0 ? "62%" : idx === 1 ? "72%" : "48%",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "6px"
                  }} />

                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginTop: "6px", paddingTop: "4px"
                  }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ height: "22px", width: "50px", backgroundColor: "#f8fafc", borderRadius: "9999px", border: "1px solid #f1f5f9" }} />
                      <div style={{ height: "22px", width: "80px", backgroundColor: "#f8fafc", borderRadius: "9999px", border: "1px solid #f1f5f9" }} />
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ height: "24px", width: "60px", backgroundColor: "#f8fafc", borderRadius: "9999px", border: "1px solid #f1f5f9" }} />
                      <div style={{ height: "24px", width: "80px", backgroundColor: "#FFF3EE", borderRadius: "9999px", border: "1px solid #FCD5BA" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generated Replies */}
          {replies && !isGenerating && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                  Generated Replies
                </div>
              </div>

              {/* Rich Generation Details Bar */}
              {generationInfo && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    marginBottom: "14px",
                    fontSize: "12px",
                    color: "#475569"
                  }}
                >
                  {/* Left: Key & Provider info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "13px" }}>🔑</span>
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{generationInfo.accountName || "Active Key"}</span>
                      {generationInfo.maskedKey && (
                        <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>({generationInfo.maskedKey})</span>
                      )}
                    </div>

                    <span style={{ color: "#cbd5e1" }}>•</span>

                    <span
                      style={{
                        padding: "1px 7px",
                        borderRadius: "4px",
                        backgroundColor: "#f1f5f9",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "#334155"
                      }}
                    >
                      {generationInfo.providerName || generationInfo.provider}
                    </span>

                    {generationInfo.usedFallback && (
                      <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", backgroundColor: "#fee2e2", color: "#dc2626" }}>
                        Failover Active
                      </span>
                    )}
                  </div>

                  {/* Right: Tokens & Speed */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {generationInfo.tokensUsed !== undefined && (
                      <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 500 }}>
                        ⚡ ~{generationInfo.tokensUsed} tokens
                      </span>
                    )}
                    {generationInfo.latencyMs !== undefined && (
                      <span style={{ fontSize: "11.5px", color: "#64748b", fontWeight: 500 }}>
                        ⏱️ {(generationInfo.latencyMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {replies.map((reply) => {
                  const isAnyPosting = postingId !== null
                  
                  return (
                    <div key={reply.id} style={{
                      padding: "14px 16px", backgroundColor: "#ffffff", borderRadius: "12px",
                      border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "relative"
                    }}>
                      
                      {reply.isRegenerating ? (
                        <div style={{ padding: "16px 0", textAlign: "center", color: "#E76F51", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          <div style={{
                            width: "14px", height: "14px", border: "2px solid #FCD5BA",
                            borderTopColor: "#E76F51", borderRadius: "50%",
                            animation: "replyly-spin 1s linear infinite"
                          }} />
                          Regenerating with new perspective...
                        </div>
                      ) : reply.isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <textarea
                            value={reply.draftText}
                            onChange={(e) => handleDraftChange(reply.id, e.target.value)}
                            style={{
                              width: "100%", height: "76px", padding: "10px 12px", borderRadius: "8px",
                              border: "1.5px solid #E76F51", backgroundColor: "#f8fafc", color: "#0f172a",
                              fontSize: "14px", lineHeight: "1.5", resize: "none", boxSizing: "border-box", outline: "none",
                              fontFamily: "inherit"
                            }}
                          />
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: reply.draftText.length >= (data.platform === "linkedin" ? 3000 : 280) ? "#dc2626" : "#64748b", fontWeight: 600 }}>
                              {reply.draftText.length} / {data.platform === "linkedin" ? 3000 : 280}
                            </span>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => toggleEdit(reply.id, false)}
                                style={{
                                  background: "transparent", border: "none", color: "#64748b",
                                  fontSize: "13px", fontWeight: 700, cursor: "pointer", padding: "6px 12px"
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEdit(reply.id)}
                                style={{
                                  background: "#E76F51", border: "none", color: "#fff", borderRadius: "9999px",
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
                          <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", color: "#0f172a", whiteSpace: "pre-wrap" }}>
                            {reply.text}
                          </p>
                          
                          {reply.error && (
                            <div style={{ color: "#dc2626", fontSize: "12px", fontWeight: 600 }}>{reply.error}</div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => toggleEdit(reply.id, true)}
                                disabled={isAnyPosting}
                                style={{
                                  background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569",
                                  borderRadius: "9999px", padding: "4px 12px", fontSize: "12px", fontWeight: 600,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer", transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => {
                                  if (!isAnyPosting) {
                                    e.currentTarget.style.borderColor = "#E76F51"
                                    e.currentTarget.style.color = "#E76F51"
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isAnyPosting) {
                                    e.currentTarget.style.borderColor = "#e2e8f0"
                                    e.currentTarget.style.color = "#475569"
                                  }
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRegenerate(reply.id)}
                                disabled={isAnyPosting}
                                style={{
                                  background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569",
                                  borderRadius: "9999px", padding: "4px 12px", fontSize: "12px", fontWeight: 600,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer", transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => {
                                  if (!isAnyPosting) {
                                    e.currentTarget.style.borderColor = "#E76F51"
                                    e.currentTarget.style.color = "#E76F51"
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isAnyPosting) {
                                    e.currentTarget.style.borderColor = "#e2e8f0"
                                    e.currentTarget.style.color = "#475569"
                                  }
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
                                  background: copiedId === reply.id ? "#ecfdf5" : "#ffffff",
                                  border: `1px solid ${copiedId === reply.id ? "#10b981" : "#cbd5e1"}`,
                                  color: copiedId === reply.id ? "#059669" : "#334155",
                                  borderRadius: "9999px", padding: "5px 14px", fontSize: "12px", fontWeight: 700,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer", transition: "all 0.15s ease"
                                }}
                              >
                                {copiedId === reply.id ? "✓ Copied" : "Copy"}
                              </button>
                              
                              <button
                                onClick={() => handlePost(reply.id, reply.text)}
                                disabled={isAnyPosting}
                                style={{
                                  background: postingId === reply.id ? "#FFF3EE" : "#E76F51",
                                  border: `1px solid ${postingId === reply.id ? "#E76F51" : "transparent"}`,
                                  color: postingId === reply.id ? "#E76F51" : "#ffffff",
                                  borderRadius: "9999px", padding: "5px 16px", fontSize: "12px", fontWeight: 700,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer", transition: "all 0.15s ease",
                                  boxShadow: postingId === reply.id ? "none" : "0 2px 6px rgba(231, 111, 81, 0.25)"
                                }}
                                onMouseEnter={(e) => {
                                  if (!isAnyPosting && postingId !== reply.id) {
                                    e.currentTarget.style.backgroundColor = "#D65A3C"
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isAnyPosting && postingId !== reply.id) {
                                    e.currentTarget.style.backgroundColor = "#E76F51"
                                  }
                                }}
                              >
                                {postingId === reply.id ? "Opening..." : (data.platform === "linkedin" ? "Insert Comment →" : "Post this →")}
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

          {/* Global Error & Missing Key */}
          {error && (
            <div style={{
              padding: "10px 14px", backgroundColor: "#fef2f2", color: "#b91c1c", 
              borderRadius: "10px", fontSize: "13px", fontWeight: 600, lineHeight: "1.4",
              border: "1px solid #fecaca"
            }}>
              {error}
            </div>
          )}

          {isMissingKey && (
            <div style={{
              padding: "16px", backgroundColor: "#FFF3EE", border: "1px solid #FCD5BA", 
              borderRadius: "12px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start"
            }}>
              <p style={{ margin: 0, fontSize: "13.5px", color: "#9C3218", lineHeight: "1.5", fontWeight: 600 }}>
                Add your Gemini API key in Replyly Settings to start generating replies.
              </p>
              <button
                onClick={openSettings}
                style={{
                  background: "#E76F51", color: "#fff", border: "none", borderRadius: "9999px",
                  padding: "7px 16px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  transition: "background 0.15s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#D65A3C"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#E76F51"}
              >
                Open Settings
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "flex-end", backgroundColor: "#ffffff"
        }}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isMissingKey || postingId !== null}
            style={{
              background: isMissingKey || postingId !== null 
                ? "#cbd5e1" 
                : isGenerating 
                  ? "linear-gradient(135deg, #E76F51 0%, #F4A261 50%, #D65A3C 100%)" 
                  : "#E76F51",
              backgroundSize: isGenerating ? "200% 200%" : "100% 100%",
              animation: isGenerating ? "rly-gradient-flow 2s ease infinite" : "none",
              color: "#ffffff",
              border: "none",
              borderRadius: "9999px",
              padding: isGenerating ? "10px 22px" : "10px 24px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: isGenerating || isMissingKey || postingId !== null ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: isGenerating
                ? "0 0 18px rgba(231, 111, 81, 0.45)"
                : isMissingKey || postingId !== null
                  ? "none"
                  : "0 4px 12px rgba(231, 111, 81, 0.28)",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              if (!isGenerating && !isMissingKey && postingId === null) {
                e.currentTarget.style.backgroundColor = "#D65A3C"
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating && !isMissingKey && postingId === null) {
                e.currentTarget.style.backgroundColor = "#E76F51"
              }
            }}
          >
            {isGenerating ? (
              <>
                {/* Bouncing Animated Dots */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{
                    width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#ffffff",
                    animation: "rly-bounce 1s infinite 0s"
                  }} />
                  <span style={{
                    width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#ffffff",
                    animation: "rly-bounce 1s infinite 0.2s"
                  }} />
                  <span style={{
                    width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#ffffff",
                    animation: "rly-bounce 1s infinite 0.4s"
                  }} />
                </div>
                <span key={generationStep} style={{ animation: "rly-fade-in 0.3s ease" }}>
                  {GENERATION_STEPS[generationStep]}
                </span>
              </>
            ) : replies ? (
              <>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                <span>Generate Again</span>
              </>
            ) : (
              <>
                <span>Generate Reply</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-7.85-1.42 1.42L16.86 11H5v2z"/>
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Tone Selection Sub-Modal */}
        {isToneModalOpen && (
          <div
            style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 100,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px", boxSizing: "border-box", borderRadius: "16px",
              backdropFilter: "blur(4px)"
            }}
            onClick={() => setIsToneModalOpen(false)}
          >
            <div
              style={{
                width: "100%", maxWidth: "480px", backgroundColor: "#ffffff",
                borderRadius: "16px", border: "1px solid #e2e8f0",
                boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.3)",
                display: "flex", flexDirection: "column", overflow: "hidden"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 18px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#ffffff"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>🎭</span>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>Select Tone</h3>
                </div>
                <button
                  onClick={() => setIsToneModalOpen(false)}
                  style={{
                    background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", cursor: "pointer",
                    padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px"
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 105.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"></path>
                  </svg>
                </button>
              </div>

              {/* Grid of Tones */}
              <div className="replyly-scroll" style={{
                padding: "14px 18px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px", maxHeight: "380px", overflowY: "auto", overflowX: "hidden"
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
                        padding: "12px 14px", borderRadius: "10px",
                        border: `1.5px solid ${isSelected ? "#E76F51" : "#e2e8f0"}`,
                        backgroundColor: isSelected ? "#FFF3EE" : "#f8fafc",
                        cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px",
                        transition: "all 0.15s ease", position: "relative"
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#E76F51"
                          e.currentTarget.style.backgroundColor = "#FFF8F5"
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#e2e8f0"
                          e.currentTarget.style.backgroundColor = "#f8fafc"
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "16px" }}>{tone.emoji}</span>
                          <span style={{ fontSize: "13.5px", fontWeight: 700, color: isSelected ? "#E76F51" : "#0f172a" }}>
                            {tone.label}
                          </span>
                        </div>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="#E76F51">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: "11.5px", color: "#64748b", lineHeight: "1.3" }}>
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
