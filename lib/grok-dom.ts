export interface MediaInfo {
  hasImages: boolean
  hasVideo: boolean
  hasCards: boolean
  hasMedia: boolean
}

export interface GrokContext {
  analysis: string
  extractedAt: number
}

/**
 * Detects whether a tweet article contains media (images, videos, GIFs, link cards, quotes)
 */
export function detectPostMedia(article: HTMLElement): MediaInfo {
  const hasImages = 
    article.querySelector('[data-testid="tweetPhoto"]') !== null ||
    article.querySelector('img[src*="pbs.twimg.com/media/"]') !== null ||
    article.querySelector('img[src*="pbs.twimg.com/card_img/"]') !== null ||
    article.querySelector('img[src*="pbs.twimg.com/amplify_video_thumb/"]') !== null ||
    article.querySelector('img[src*="pbs.twimg.com/tweet_video_thumb/"]') !== null ||
    article.querySelector('img[src*="pbs.twimg.com/ext_tw_video_thumb/"]') !== null ||
    article.querySelector('div[aria-label*="Image" i]') !== null ||
    article.querySelector('div[aria-label*="Photo" i]') !== null

  const hasVideo = 
    article.querySelector('video') !== null ||
    article.querySelector('[data-testid="videoPlayer"]') !== null ||
    article.querySelector('[data-testid="videoComponent"]') !== null ||
    article.querySelector('[data-testid="playButton"]') !== null ||
    article.querySelector('[aria-label*="video" i]') !== null ||
    article.querySelector('[aria-label*="Play" i]') !== null ||
    article.querySelector('[aria-label*="GIF" i]') !== null ||
    article.querySelector('[data-testid="preview-badge"]') !== null

  const hasCards = 
    article.querySelector('[data-testid="card.wrapper"]') !== null ||
    article.querySelector('[data-testid="card.layoutLarge.detail"]') !== null ||
    article.querySelector('[data-testid="card.layoutSmall.detail"]') !== null ||
    article.querySelector('[data-testid="quoteTweet"]') !== null ||
    article.querySelector('[data-testid="tweet-text-quote"]') !== null ||
    article.querySelector('iframe') !== null

  return {
    hasImages,
    hasVideo,
    hasCards,
    hasMedia: hasImages || hasVideo || hasCards
  }
}

/**
 * Finds the Grok sidebar / drawer container in X's DOM.
 */
export function findGrokSidebarPanel(): HTMLElement | null {
  // Check common X selectors for the Grok drawer/sidebar
  const selectors = [
    '[data-testid="GrokDrawer"]',
    'div[aria-label*="Grok" i]',
    '[data-testid="sidebarColumn"]',
    '[data-testid="grok-sidebar"]',
    'aside[aria-label*="Grok" i]',
    'aside',
    '[role="complementary"]'
  ]

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector)
    for (const el of elements) {
      const htmlEl = el as HTMLElement
      const text = htmlEl.innerText || ''
      // Grok sidebar contains characteristics like "Ask anything", bullet points, source indicators, etc.
      if (
        text.includes('Ask anything') ||
        text.includes('web pages') ||
        text.includes('posts') ||
        htmlEl.querySelector('[data-testid*="grok" i]') !== null
      ) {
        return htmlEl
      }
    }
  }

  // Fallback: look for any container containing bullet points and "Ask anything"
  const sections = document.querySelectorAll('section, [role="region"], div')
  for (const section of sections) {
    const el = section as HTMLElement
    const text = el.innerText || ''
    if (
      text.length > 50 &&
      (text.includes('Ask anything') || text.includes('Fast')) &&
      (text.includes('•') || text.includes('posts')) &&
      !el.closest('article[data-testid="tweet"]')
    ) {
      return el
    }
  }

  return null
}

/**
 * Detects whether Grok is actively thinking, searching, or streaming generation in X's DOM.
 */
export function isGrokThinkingOrStreaming(panel?: HTMLElement | null): boolean {
  const p = panel || findGrokSidebarPanel()
  if (!p) return false

  const rawText = (p.innerText || '').toLowerCase()

  // 1. Text patterns indicating active thinking / searching / generating
  const thinkingKeywords = [
    'thinking',
    'searching',
    'deepsearch',
    'reading post',
    'reading web',
    'reading link',
    'analyzing',
    'generating',
    'looking up'
  ]

  const lines = rawText.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean)
  for (const line of lines) {
    if (
      line === 'thinking' ||
      line.startsWith('thinking...') ||
      line.startsWith('thinking for') ||
      line.startsWith('searching') ||
      line.startsWith('searched ') ||
      line.startsWith('analyzing') ||
      line.startsWith('reading ') ||
      line === 'deepsearch' ||
      line.startsWith('generating')
    ) {
      return true
    }
  }

  // Check if general text has thinking keyword and is short / early
  for (const kw of thinkingKeywords) {
    if (rawText.includes(kw)) {
      // If there's an explicit thinking status element
      const statusElements = p.querySelectorAll('span, div, p')
      for (const el of statusElements) {
        const text = (el as HTMLElement).innerText?.trim().toLowerCase() || ''
        if (
          text === 'thinking' ||
          text === 'thinking...' ||
          text.startsWith('thinking for') ||
          text.startsWith('searching') ||
          text.startsWith('analyzing')
        ) {
          return true
        }
      }
    }
  }

  // 2. Stop / Cancel buttons indicate active generation in progress
  const stopButton = p.querySelector(
    'button[aria-label*="Stop" i], button[aria-label*="Cancel" i], [data-testid*="stop" i], button[data-testid*="cancel" i]'
  )
  if (stopButton) return true

  // 3. Progress bars, active loaders, or animated spinners in the Grok panel
  const spinners = p.querySelectorAll(
    '[role="progressbar"], [aria-busy="true"], svg[class*="spin"], [data-testid*="loading"], [data-testid*="spinner"]'
  )
  if (spinners.length > 0) return true

  return false
}

/**
 * Extracts the clean analysis text from the Grok sidebar.
 * Strips out header ads, quoted tweet preview, bottom counters, and prompt inputs.
 */
export function scrapeGrokContext(options?: { postText?: string; author?: string }): string | null {
  const panel = findGrokSidebarPanel()
  if (!panel) return null

  const rawText = panel.innerText || ''
  if (!rawText || rawText.trim().length === 0) return null

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  // Filter out irrelevant UI lines
  const cleanedLines: string[] = []
  let isInsideTweetPreview = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    // Skip top header promo lines
    if (
      line.includes('Get rid of ads') ||
      line.includes('boost your replies') ||
      line.includes('unlock 20+ features')
    ) {
      continue
    }

    // Skip input bar and bottom action controls
    if (
      line === 'Ask anything' ||
      line === 'Fast' ||
      line.match(/^\d+\s+posts?$/i) ||
      line.match(/^\d+\s+web\s+pages?$/i) ||
      line.match(/^\d+\s+sources?$/i) ||
      line.startsWith('↳') ||
      (line.includes('Analyze ') && line.endsWith('...'))
    ) {
      continue
    }

    // Skip standalone thinking / searching status lines so they don't pollute the context
    if (
      lower === 'thinking' ||
      lower.startsWith('thinking...') ||
      lower.startsWith('thinking for') ||
      lower.startsWith('searching') ||
      lower.startsWith('searched ') ||
      lower === 'deepsearch' ||
      lower.startsWith('reading ') ||
      lower.startsWith('analyzing ')
    ) {
      continue
    }

    // Skip user handle / time indicators from the quoted preview (e.g. "@pubity · 9h")
    if (line.match(/^@\w+\s*·\s*\d+[smhdwy]/i)) {
      isInsideTweetPreview = true
      continue
    }

    // If we're tracking inside tweet preview and hit a bullet point, we've reached the analysis!
    if (line.startsWith('•') || line.startsWith('-')) {
      isInsideTweetPreview = false
    }

    // If still inside tweet preview and it matches the post text snippet, skip it
    if (isInsideTweetPreview) {
      if (options?.postText && options.postText.includes(line)) {
        continue
      }
      // If it looks like a short header line before the bullets, skip
      if (!line.startsWith('•') && i < 10) {
        continue
      }
    }

    // Keep bullet points and meaningful sentences
    if (
      line.startsWith('•') ||
      line.startsWith('-') ||
      (line.length > 20 && !line.includes('http'))
    ) {
      cleanedLines.push(line)
    }
  }

  if (cleanedLines.length === 0) {
    // Fallback: collect all lines with bullet points
    const bulletLines = lines.filter(l => l.startsWith('•') || l.startsWith('-'))
    if (bulletLines.length > 0) {
      return bulletLines.join('\n\n')
    }
    return null
  }

  const analysis = cleanedLines.join('\n\n').trim()
  return analysis.length >= 20 ? analysis : null
}

/**
 * Finds and clicks the Grok/AI Reply button on a specific tweet article.
 */
export async function triggerGrokAnalysis(article: HTMLElement): Promise<void> {
  // Strategy 1: Look for "AI Reply" or Grok button in the post's action bar
  const actionBar = article.querySelector('div[role="group"]')
  
  if (actionBar) {
    // Check all clickable items in the action bar
    const clickables = actionBar.querySelectorAll('button, [role="button"], a, div')
    
    for (const el of clickables) {
      // Don't click Replyly's own button!
      if (el.closest('.replyly-button-container')) continue

      const text = (el as HTMLElement).innerText?.toLowerCase() || ''
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase()
      const testId = (el.getAttribute('data-testid') || '').toLowerCase()

      if (
        text.includes('ai reply') ||
        text.includes('grok') ||
        text.includes('analyze') ||
        ariaLabel.includes('grok') ||
        ariaLabel.includes('ai reply') ||
        ariaLabel.includes('analyze') ||
        testId.includes('grok')
      ) {
        ;(el as HTMLElement).click()
        return
      }
    }

    // Look for SVG icons resembling Grok/Sparkle (last button before or after bookmark/share)
    const buttons = Array.from(actionBar.querySelectorAll('button, [role="button"]'))
      .filter(b => !b.closest('.replyly-button-container'))

    for (const btn of buttons) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase()
      if (label.includes('ai') || label.includes('grok') || label.includes('sparkle')) {
        ;(btn as HTMLElement).click()
        return
      }
    }
  }

  // Strategy 2: Look for any AI/Grok trigger anywhere inside the article
  const articleButtons = article.querySelectorAll('button, [role="button"]')
  for (const btn of articleButtons) {
    if (btn.closest('.replyly-button-container')) continue
    const text = (btn as HTMLElement).innerText?.toLowerCase() || ''
    const label = (btn.getAttribute('aria-label') || '').toLowerCase()
    if (
      (text.includes('ai reply') || text.includes('grok')) ||
      (label.includes('grok') || label.includes('ai reply'))
    ) {
      ;(btn as HTMLElement).click()
      return
    }
  }

  // Strategy 3: Check tweet's "more options" (three dots / caret) menu
  const moreButton = article.querySelector('[data-testid="caret"]') as HTMLElement | null
  if (moreButton) {
    moreButton.click()

    // Wait for dropdown menu to appear
    await new Promise<void>((resolve) => {
      const checkMenu = setInterval(() => {
        const menuItems = document.querySelectorAll('[role="menuitem"]')
        if (menuItems.length > 0) {
          clearInterval(checkMenu)
          resolve()
        }
      }, 50)
      setTimeout(() => { clearInterval(checkMenu); resolve() }, 2000)
    })

    // Look for "Analyze" or "Ask Grok"
    const menuItems = document.querySelectorAll('[role="menuitem"]')
    for (const item of menuItems) {
      const itemText = (item as HTMLElement).innerText?.toLowerCase() || ''
      if (
        itemText.includes('grok') ||
        itemText.includes('analyze') ||
        itemText.includes('ask grok') ||
        itemText.includes('ai')
      ) {
        ;(item as HTMLElement).click()
        return
      }
    }

    // Close menu if not found
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  }

  throw new Error('Could not find Grok trigger button on this post. Please ensure Grok is available on your X account.')
}

/**
 * Waits for real-time Grok analysis to stream and stabilize for the target tweet.
 * Dispatches onProgress updates as text streams in real-time.
 * Automatically keeps waiting while Grok is thinking (3-6+ seconds) until full output completes.
 */
export async function waitForGrokRealtimeAnalysis(
  article: HTMLElement,
  options?: {
    postText?: string
    author?: string
    timeoutMs?: number
    onProgress?: (liveText: string) => void
  }
): Promise<string> {
  const timeoutMs = options?.timeoutMs || 30000
  const startTime = Date.now()

  // 1. Trigger Grok analysis on the target tweet
  await triggerGrokAnalysis(article)

  // 2. Poll and observe for new streaming content in real-time
  return new Promise<string>((resolve, reject) => {
    let lastContent = ''
    let stableCount = 0

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > timeoutMs) {
        clearInterval(interval)
        // If we got some content, resolve with it rather than failing completely
        if (lastContent && lastContent.length >= 20) {
          resolve(lastContent)
        } else {
          reject(new Error('Grok analysis timed out. Please try again.'))
        }
        return
      }

      const panel = findGrokSidebarPanel()
      const isThinking = isGrokThinkingOrStreaming(panel)
      const currentContent = scrapeGrokContext(options)

      if (currentContent) {
        // Notify progress callback for real-time live preview
        if (options?.onProgress && currentContent !== lastContent) {
          options.onProgress(currentContent)
        }

        // If content has grown or changed, update lastContent and reset stable counter
        if (currentContent !== lastContent) {
          lastContent = currentContent
          stableCount = 0
        } else {
          // If Grok is still thinking / searching / streaming, do NOT treat as stable yet
          if (isThinking) {
            stableCount = 0
          } else if (currentContent.length >= 25) {
            // Grok is not thinking and text hasn't changed
            stableCount++
            // Require 12 consecutive checks (~2.4s) of stability while NOT in thinking mode
            if (stableCount >= 12) {
              clearInterval(interval)
              resolve(currentContent)
              return
            }
          }
        }
      } else {
        // No content extracted yet (e.g. Grok is still thinking)
        stableCount = 0
      }
    }, 200)
  })
}

/**
 * Attempts to close the Grok sidebar panel after extraction.
 */
export function closeGrokSidebar(): void {
  const panel = findGrokSidebarPanel()
  if (!panel) return

  const closeButtons = panel.querySelectorAll<HTMLElement>(
    'button[aria-label*="Close" i], button[aria-label*="dismiss" i], button[aria-label*="back" i], [data-testid="app-bar-close"]'
  )

  for (const btn of closeButtons) {
    btn.click()
    return
  }

  // Fallback: look for close X SVGs
  const allButtons = panel.querySelectorAll('button')
  for (const btn of allButtons) {
    const svg = btn.querySelector('svg')
    if (svg) {
      const paths = svg.querySelectorAll('path')
      for (const path of paths) {
        const d = path.getAttribute('d') || ''
        if (d.includes('M18.3') || d.includes('M6.7') || d.includes('close') || d.includes('10.59')) {
          btn.click()
          return
        }
      }
    }
  }
}

/**
 * Main orchestration function called by ReplyModal to get fresh real-time Grok context.
 */
export async function getGrokContext(
  article: HTMLElement,
  options?: {
    postText?: string
    author?: string
    onProgress?: (liveText: string) => void
  }
): Promise<GrokContext> {
  const analysis = await waitForGrokRealtimeAnalysis(article, {
    postText: options?.postText,
    author: options?.author,
    onProgress: options?.onProgress
  })

  if (!analysis || analysis.trim().length === 0) {
    throw new Error('Could not extract real-time Grok analysis. Please try again.')
  }

  return {
    analysis,
    extractedAt: Date.now()
  }
}
