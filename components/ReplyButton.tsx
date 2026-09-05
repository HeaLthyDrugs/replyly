import React from "react"
import { detectPostMedia } from "../lib/grok-dom"
import { detectLinkedInPostMedia, extractLinkedInPostData } from "../lib/linkedin-dom"
import { RlyLogoIcon, RlySvgIcon } from "./Logo"

interface ReplyButtonProps {
  postText: string
  author: string
  article: HTMLElement
  hasMedia: boolean
  mediaType?: "video" | "image" | "document" | "media"
  platform?: "x" | "linkedin"
}

export const ReplyButton: React.FC<ReplyButtonProps> = ({
  postText,
  author,
  article,
  hasMedia,
  mediaType,
  platform = "x"
}) => {
  const isLinkedIn = platform === "linkedin"

  const handleClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to the article/feed update
    e.preventDefault()
    e.stopPropagation()

    // Dynamically re-evaluate media, text, and author at click time
    let currentText = postText
    let currentAuthor = author
    let mediaPresent = hasMedia
    let currentMediaType = mediaType

    if (isLinkedIn) {
      // Find the true post card from article if article was a sub-element
      const postCard =
        article.classList.contains("feed-shared-social-actions") ||
        article.classList.contains("feed-shared-social-action-bar") ||
        !article.querySelector('.update-components-actor, .feed-shared-actor, [class*="actor__name"]')
          ? (article.closest<HTMLElement>(
              'div[data-view-name="feed-full-update"], div.feed-shared-update-v2, div.occludable-update, article'
            ) || article)
          : article

      const extracted = extractLinkedInPostData(postCard)
      currentText = extracted.text || postText
      if (extracted.author && extracted.author !== "LinkedIn Member") {
        currentAuthor = extracted.author
      }
      mediaPresent = extracted.hasMedia || hasMedia
      currentMediaType = extracted.mediaType || mediaType
    } else {
      const textElement = article.querySelector('[data-testid="tweetText"]') as HTMLElement | null
      currentText = textElement ? textElement.innerText.trim() : postText
      const currentMediaInfo = detectPostMedia(article)
      mediaPresent = currentMediaInfo.hasMedia || hasMedia
    }

    // Dispatch custom event to open the modal
    const event = new CustomEvent("replyly-open-modal", {
      detail: {
        author: currentAuthor,
        postText: currentText,
        article,
        hasMedia: mediaPresent,
        mediaType: currentMediaType,
        platform
      }
    })
    document.dispatchEvent(event)
  }

  if (isLinkedIn) {
    const defaultColor = "rgba(0, 0, 0, 0.6)"

    return (
      <button
        type="button"
        role="button"
        tabIndex={0}
        onClick={handleClick}
        className="artdeco-button artdeco-button--muted artdeco-button--4 artdeco-button--tertiary feed-shared-social-action-bar__action-btn replyly-rly-btn"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: "4px",
          border: "none",
          background: "transparent",
          color: defaultColor,
          transition: "all 0.15s ease",
          minHeight: "44px",
          width: "100%",
          boxSizing: "border-box",
          gap: "2px",
          userSelect: "none"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#E76F51"
          e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.08)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = defaultColor
          e.currentTarget.style.backgroundColor = "transparent"
        }}
        title="Replyly (RLY) - Generate AI Comment"
        aria-label="Replyly (RLY) - Generate AI Comment"
      >
        <span
          className="artdeco-button__text"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            width: "100%"
          }}
        >
          <RlySvgIcon size={20} />
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              lineHeight: "1.2",
              fontFamily:
                "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          >
            RLY
          </span>
        </span>
      </button>
    )
  }

  // Default X (Twitter) layout
  const defaultColor = "rgb(113, 118, 123)"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: "0 8px",
        borderRadius: "9999px",
        color: defaultColor,
        transition: "all 0.2s ease",
        height: "34px",
        gap: "4px"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#E76F51"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = defaultColor
      }}
      title="Replyly (RLY) - Generate AI Reply"
    >
      <RlyLogoIcon size={18} />
      <span
        style={{
          fontSize: "13px",
          fontWeight: 600,
          lineHeight: "1.2",
          fontFamily:
            "-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        RLY
      </span>
    </div>
  )
}
