import React from "react"

interface LogoProps {
  size?: number
  showText?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Replyly / RLY Brand Diamond Icon
 */
export const ReplylyIcon: React.FC<{ size?: number; style?: React.CSSProperties }> = ({
  size = 20,
  style
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <defs>
        <linearGradient id="replyly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4A261" />
          <stop offset="100%" stopColor="#D65A3C" />
        </linearGradient>
      </defs>
      <g transform="translate(50, 50) rotate(45)">
        <rect
          x="-32"
          y="-32"
          width="64"
          height="64"
          rx="18"
          fill="url(#replyly-grad)"
        />
      </g>
    </svg>
  )
}

/**
 * Replyly / RLY Icon with "Rly" centered text
 */
export const RlyLogoIcon: React.FC<{ size?: number; style?: React.CSSProperties }> = ({
  size = 24,
  style
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
    >
      <defs>
        <linearGradient id="rly-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4A261" />
          <stop offset="100%" stopColor="#D65A3C" />
        </linearGradient>
      </defs>
      <g transform="translate(50, 50)">
        <rect
          x="-33"
          y="-33"
          width="66"
          height="66"
          rx="18"
          transform="rotate(45)"
          fill="url(#rly-icon-grad)"
        />
        <text
          x="0"
          y="7"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontSize="24"
          fontWeight="900"
          letterSpacing="-0.5px"
        >
          Rly
        </text>
      </g>
    </svg>
  )
}
