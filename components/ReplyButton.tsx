import React from "react"
import { RlyLogoIcon } from "./Logo"

interface ReplyButtonProps {
  postText: string
  author: string
  article: HTMLElement
  hasMedia: boolean
}

export const ReplyButton: React.FC<ReplyButtonProps> = ({
  postText,
  author,
  article,
  hasMedia
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to the article, which would open the post
    e.preventDefault()
    e.stopPropagation()

    // Dispatch custom event to open the modal
    const event = new CustomEvent("replyly-open-modal", {
      detail: { author, postText, article, hasMedia }
    })
    document.dispatchEvent(event)
  }

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
        color: "rgb(113, 118, 123)",
        transition: "color 0.2s ease",
        height: "34px",
        gap: "4px"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#8b5cf6"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgb(113, 118, 123)"
      }}
      title="Replyly (RLY) - Generate AI Reply"
    >
      <RlyLogoIcon size={18} />
      <span
        style={{
          fontSize: "13px",
          fontWeight: 600,
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        RLY
      </span>
    </div>
  )
}
