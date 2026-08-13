import React, { useEffect, useState } from "react"
import { AIManager } from "../lib/ai/manager"
import { MissingApiKeyError } from "../lib/ai/types"
import { openReplyComposer } from "../lib/x-dom"

export interface ModalData {
  author: string
  postText: string
  article: HTMLElement
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
  generationInfo: { provider: string, usedFallback: boolean } | null
}

// Module-level cache to persist generated replies for specific posts across modal opens
const postCache = new Map<string, CachedPostData>()

export const ReplyModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<ModalData | null>(null)
  
  const [selectedTone, setSelectedTone] = useState<string>("Smart")
  const [customInstruction, setCustomInstruction] = useState<string>("")
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [replies, setReplies] = useState<ReplyState[] | null>(null)
  const [generationInfo, setGenerationInfo] = useState<{ provider: string, usedFallback: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [postingId, setPostingId] = useState<string | null>(null)
  
  const [isMissingKey, setIsMissingKey] = useState(false)

  const tones = [
    "Smart", "Casual", "Curious", "Funny", 
    "Technical", "Bold", "Supportive", "Contrarian"
  ]

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent<ModalData>
      const newPostData = customEvent.detail
      setData(newPostData)
      setIsOpen(true)
      
      const cached = postCache.get(newPostData.postText)
      if (cached) {
        setReplies(cached.replies)
        setSelectedTone(cached.selectedTone)
        setCustomInstruction(cached.customInstruction)
        setGenerationInfo(cached.generationInfo)
      } else {
        setReplies(null)
        setGenerationInfo(null)
      }
      
      setIsGenerating(false)
      setError(null)
      setCopiedId(null)
      setPostingId(null)
      setIsMissingKey(false)
    }

    document.addEventListener("replyly-open-modal", handleOpenModal)
    return () => document.removeEventListener("replyly-open-modal", handleOpenModal)
  }, [])

  // Auto-save to cache whenever replies, tone, or customInstruction change for the current post
  useEffect(() => {
    if (data?.postText && replies) {
      postCache.set(data.postText, {
        replies,
        selectedTone,
        customInstruction,
        generationInfo
      })
    }
  }, [data?.postText, replies, selectedTone, customInstruction, generationInfo])

  if (!isOpen || !data) return null

  const handleClose = () => setIsOpen(false)

  const handleGenerate = async () => {
    if (!data.postText) return
    
    setIsGenerating(true)
    setError(null)
    setReplies(null)
    setGenerationInfo(null)
    setIsMissingKey(false)

    try {
      const result = await AIManager.generateReplies(data.postText, selectedTone, customInstruction, 3)
      
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
    if (!replies || !data.postText) return

    // Set loading state for this specific reply
    setReplies(prev => prev!.map(r => 
      r.id === id ? { ...r, isRegenerating: true, error: undefined } : r
    ))

    try {
      const regeneratedReplies = await AIManager.generateReplies(data.postText, selectedTone, customInstruction, 1)
      const newText = regeneratedReplies[0]
      
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
          display: "flex", flexDirection: "column", overflow: "hidden"
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
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>
          
          {/* Post Reference */}
          <div>
            <div style={{ fontSize: "14px", color: "#8899a6", marginBottom: "8px" }}>
              Post you're replying to:
            </div>
            <div style={{ 
              fontSize: "15px", lineHeight: "1.5", maxHeight: "100px", overflowY: "auto",
              padding: "12px", backgroundColor: "#192734", borderRadius: "8px", border: "1px solid #38444d"
            }}>
              <strong style={{ color: "#fff", display: "block", marginBottom: "4px" }}>{data.author}</strong>
              <span style={{ color: "#e1e8ed" }}>{data.postText || "No text content found for this post."}</span>
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px", color: "#fff" }}>Select Tone</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {tones.map(tone => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  style={{
                    padding: "6px 4px", borderRadius: "9999px",
                    border: `1px solid ${selectedTone === tone ? "#1d9bf0" : "#38444d"}`,
                    backgroundColor: selectedTone === tone ? "rgba(29, 155, 240, 0.1)" : "transparent",
                    color: selectedTone === tone ? "#1d9bf0" : "#8899a6",
                    cursor: "pointer", fontSize: "13px", fontWeight: selectedTone === tone ? 700 : 500,
                    transition: "all 0.2s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                  }}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instruction */}
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px", color: "#fff" }}>
              Anything specific you want to say? <span style={{ color: "#8899a6", fontWeight: 400 }}>(Optional)</span>
            </div>
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g. Mention MCP security, ask about their stack..."
              style={{
                width: "100%", padding: "12px", borderRadius: "8px",
                border: "1px solid #38444d", backgroundColor: "#192734", color: "#fff",
                fontSize: "14px", boxSizing: "border-box", outline: "none"
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
                      padding: "16px", backgroundColor: "#192734", borderRadius: "12px",
                      border: "1px solid #38444d", position: "relative"
                    }}>
                      
                      {reply.isRegenerating ? (
                        <div style={{ padding: "16px 0", textAlign: "center", color: "#8899a6", fontSize: "14px" }}>
                          Regenerating...
                        </div>
                      ) : reply.isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <textarea
                            value={reply.draftText}
                            onChange={(e) => handleDraftChange(reply.id, e.target.value)}
                            style={{
                              width: "100%", height: "80px", padding: "12px", borderRadius: "8px",
                              border: "1px solid #1d9bf0", backgroundColor: "#15202b", color: "#e1e8ed",
                              fontSize: "15px", lineHeight: "1.5", resize: "none", boxSizing: "border-box", outline: "none",
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.5", color: "#e1e8ed", whiteSpace: "pre-wrap" }}>
                            {reply.text}
                          </p>
                          
                          {reply.error && (
                            <div style={{ color: "#f4212e", fontSize: "13px" }}>{reply.error}</div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => toggleEdit(reply.id, true)}
                                disabled={isAnyPosting}
                                style={{
                                  background: "transparent", border: "1px solid #38444d", color: "#8899a6",
                                  borderRadius: "9999px", padding: "4px 12px", fontSize: "12px", fontWeight: 600,
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
                                  borderRadius: "9999px", padding: "4px 12px", fontSize: "12px", fontWeight: 600,
                                  cursor: isAnyPosting ? "not-allowed" : "pointer"
                                }}
                              >
                                Regenerate
                              </button>
                            </div>
                            
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => handleCopy(reply.id, reply.text)}
                                disabled={isAnyPosting}
                                style={{
                                  background: "transparent",
                                  border: `1px solid ${copiedId === reply.id ? "#00ba7c" : "#38444d"}`,
                                  color: copiedId === reply.id ? "#00ba7c" : "#8899a6",
                                  borderRadius: "9999px", padding: "6px 16px", fontSize: "13px", fontWeight: 600,
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
                                  borderRadius: "9999px", padding: "6px 16px", fontSize: "13px", fontWeight: 700,
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

          {/* Global Error & Missing Key */}
          {error && (
            <div style={{
              padding: "12px 16px", backgroundColor: "#ffe9e9", color: "#f4212e", 
              borderRadius: "8px", fontSize: "14px", fontWeight: 500, lineHeight: "1.4"
            }}>
              {error}
            </div>
          )}

          {isMissingKey && (
            <div style={{
              padding: "16px", backgroundColor: "#192734", border: "1px solid #1d9bf0", 
              borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start"
            }}>
              <p style={{ margin: 0, fontSize: "15px", color: "#e1e8ed", lineHeight: "1.5" }}>
                Add your Gemini API key in Replyly Settings to start generating replies.
              </p>
              <button
                onClick={openSettings}
                style={{
                  background: "#1d9bf0", color: "#fff", border: "none", borderRadius: "9999px",
                  padding: "8px 16px", fontSize: "14px", fontWeight: 700, cursor: "pointer"
                }}
              >
                Open Settings
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: "16px", borderTop: "1px solid #38444d", display: "flex", justifyContent: "flex-end", backgroundColor: "#15202b" }}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isMissingKey || postingId !== null}
            style={{
              backgroundColor: isGenerating || isMissingKey || postingId !== null ? "#192734" : "#1d9bf0",
              color: isGenerating || isMissingKey || postingId !== null ? "#8899a6" : "#fff",
              border: "none", borderRadius: "9999px", padding: "10px 24px", fontSize: "15px", fontWeight: 700,
              cursor: isGenerating || isMissingKey || postingId !== null ? "not-allowed" : "pointer",
              transition: "background-color 0.2s", display: "flex", alignItems: "center", gap: "8px"
            }}
          >
            {isGenerating ? (
              "Thinking..."
            ) : replies ? (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
                </svg>
                Generate Again
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
                </svg>
                Generate Reply
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
