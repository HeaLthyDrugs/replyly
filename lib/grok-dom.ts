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
    article.querySelector('img[src*="pbs.twimg.com/media/"]') !== null

  const hasVideo = 
    article.querySelector('video') !== null ||
    article.querySelector('[data-testid="videoPlayer"]') !== null ||
    article.querySelector('[data-testid="videoComponent"]') !== null ||
    article.querySelector('[data-testid="playButton"]') !== null

  const hasCards = 
    article.querySelector('[data-testid="card.wrapper"]') !== null ||
    article.querySelector('[data-testid="card.layoutLarge.detail"]') !== null ||
    article.querySelector('[data-testid="quoteTweet"]') !== null

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
      line.startsWith('↳') ||
      line.includes('Analyze ') && line.endsWith('...')
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
  const timeoutMs = options?.timeoutMs || 15000
  const startTime = Date.now()

  // 1. Capture current sidebar text before triggering (to detect changes)
  const initialText = scrapeGrokContext(options) || ''

  // 2. Trigger Grok analysis on the target tweet
  await triggerGrokAnalysis(article)

  // 3. Poll and observe for new streaming content in real-time
  return new Promise<string>((resolve, reject) => {
    let lastContent = ''
    let stableCount = 0
    let hasChangedFromInitial = false

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

      const currentContent = scrapeGrokContext(options)

      if (currentContent) {
        // Notify progress callback for real-time live preview
        if (options?.onProgress && currentContent !== lastContent) {
          options.onProgress(currentContent)
        }

        // Check if content has changed from the initial state
        if (currentContent !== initialText) {
          hasChangedFromInitial = true
        }

        // Check if the streaming content has stabilized
        if (currentContent === lastContent && currentContent.length > 30) {
          stableCount++
          // If text hasn't changed for 3 consecutive checks (approx 750ms) and has changed from initial
          if (stableCount >= 3) {
            clearInterval(interval)
            resolve(currentContent)
            return
          }
        } else {
          lastContent = currentContent
          stableCount = 0
        }
      }
    }, 250)
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
