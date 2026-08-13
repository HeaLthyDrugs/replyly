import React from "react"

interface ReplyButtonProps {
  postText: string
  author: string
}

export const ReplyButton: React.FC<ReplyButtonProps> = ({
  postText,
  author
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling up to the article, which would open the post
    e.preventDefault()
    e.stopPropagation()

    console.log("[Replyly] AI Reply Button Clicked!")
    console.log(`Context - Author: ${author}`)
    console.log(`Context - Text: ${postText}`)
    console.log("-------------------")
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
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "rgb(29, 155, 240)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "rgb(113, 118, 123)"
      }}
      title="Generate AI Reply"
    >
      {/* Simple Sparkle/Wand icon to represent AI */}
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="currentColor"
        style={{ marginRight: "4px" }}
      >
        <path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"></path>
      </svg>
      <span style={{ fontSize: "13px", fontWeight: 400, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>AI Reply</span>
    </div>
  )
}
