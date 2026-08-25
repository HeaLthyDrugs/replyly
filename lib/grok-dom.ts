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
 * Finds the Grok sidebar / drawer / dialog container in X's DOM.
 */
export function findGrokSidebarPanel(): HTMLElement | null {
  // 1. Explicit Grok drawer / dialog containers
  const explicitSelectors = [
    '[data-testid="GrokDrawer"]',
    '[data-testid="GrokDrawerBody"]',
    '[data-testid="GrokDrawerHeader"]',
    '[data-testid="grok-drawer"]',
    '[data-testid="grok-sidebar"]',
    'div[aria-label*="Grok" i]',
    'section[aria-label*="Grok" i]',
    'aside[aria-label*="Grok" i]',
    '[role="dialog"][aria-label*="Grok" i]',
    '[role="region"][aria-label*="Grok" i]'
  ]

  for (const selector of explicitSelectors) {
    const el = document.querySelector<HTMLElement>(selector)
    if (el && !el.closest('article[data-testid="tweet"]')) {
      return el
    }
  }

  // 2. Any container containing Grok testid or aria-label
  const grokContainers = document.querySelectorAll<HTMLElement>(
    '[data-testid="sheetDialog"], [role="dialog"], [role="complementary"], [role="region"]'
  )

  for (const el of grokContainers) {
    if (
      el.querySelector('[data-testid*="grok" i]') !== null ||
      el.querySelector('[aria-label*="grok" i]') !== null ||
      el.querySelector('textarea[placeholder*="Grok" i], [contenteditable][aria-label*="Grok" i]') !== null ||
      el.querySelector('button[aria-label*="Stop" i], button[aria-label*="Ask Grok" i]') !== null
    ) {
      if (!el.closest('article[data-testid="tweet"]')) {
        return el
      }
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
 * Extracts the clean analysis text from the Grok sidebar for the target post.
 * Strips out header ads, quoted tweet preview, bottom counters, and prompt inputs.
 */
export function scrapeGrokContext(options?: { postText?: string; author?: string; article?: HTMLElement }): string | null {
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
      line.includes('unlock 20+ features') ||
      line.includes('Subscribe to Premium') ||
      line.includes('Upgrade to')
    ) {
      continue
    }

    // Skip input bar and bottom action controls
    if (
      line === 'Ask anything' ||
      line === 'Ask Grok' ||
      line === 'Ask a follow up' ||
      line === 'Fast' ||
      line === 'Auto' ||
      line === 'DeepSearch' ||
      line.match(/^\d+\s+posts?$/i) ||
      line.match(/^\d+\s+web\s+pages?$/i) ||
      line.match(/^\d+\s+sources?$/i) ||
      line.startsWith('↳') ||
      (line.includes('Analyze ') && line.endsWith('...')) ||
      (line.includes('Explain ') && line.endsWith('...'))
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
      lower.startsWith('analyzing ') ||
      lower.startsWith('looking up')
    ) {
      continue
    }

    // Skip user handle / time indicators from the quoted preview (e.g. "@pubity · 9h")
    if (line.match(/^@\w+\s*·\s*\d+[smhdwy]/i)) {
      isInsideTweetPreview = true
      continue
    }

    // If we're tracking inside tweet preview and hit a bullet point or numbered list, we've reached the analysis!
    if (line.startsWith('•') || line.startsWith('-') || line.match(/^\d+\.\s/)) {
      isInsideTweetPreview = false
    }

    // If still inside tweet preview and it matches the post text snippet, skip it
    if (isInsideTweetPreview) {
      if (options?.postText && options.postText.includes(line)) {
        continue
      }
      if (!line.startsWith('•') && !line.startsWith('-') && i < 8) {
        continue
      }
    }

    // Keep bullet points, numbered items, and meaningful sentences
    if (
      line.startsWith('•') ||
      line.startsWith('-') ||
      line.match(/^\d+\.\s/) ||
      (line.length > 20 && !line.includes('http://') && !line.includes('https://'))
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
    // Fallback 2: if there are substantive lines > 25 chars
    const substantiveLines = lines.filter(l => 
      l.length > 25 && 
      !l.includes('Get rid of ads') && 
      !l.includes('Ask anything') &&
      !l.startsWith('@')
    )
    if (substantiveLines.length > 0) {
      return substantiveLines.join('\n\n')
    }
    return null
  }

  const analysis = cleanedLines.join('\n\n').trim()
  return analysis.length >= 15 ? analysis : null
}

/**
 * Dispatches a realistic mouse & pointer event sequence without bubbling to the parent tweet article.
 * This prevents Twitter/X from intercepting the event and navigating to the tweet detail page.
 */
export function simulateRealisticClick(element: HTMLElement): void {
  if (!element) return
  try {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  } catch {}

  // Stop propagation on parent tree to ensure tweet detail navigation is not triggered
  const stopBubble = (e: Event) => {
    e.stopPropagation()
  }
  element.addEventListener('click', stopBubble, { capture: true, once: true })
  element.addEventListener('mousedown', stopBubble, { capture: true, once: true })
  element.addEventListener('pointerdown', stopBubble, { capture: true, once: true })

  const opts: MouseEventInit = { bubbles: false, cancelable: true, composed: true, view: window }

  try { element.dispatchEvent(new PointerEvent('pointerdown', { ...opts, button: 0, buttons: 1 })) } catch {}
  try { element.dispatchEvent(new MouseEvent('mousedown', { ...opts, button: 0, buttons: 1 })) } catch {}

  if (typeof element.focus === 'function') {
    try { element.focus() } catch {}
  }

  try { element.dispatchEvent(new PointerEvent('pointerup', { ...opts, button: 0, buttons: 0 })) } catch {}
  try { element.dispatchEvent(new MouseEvent('mouseup', { ...opts, button: 0, buttons: 0 })) } catch {}
  try { element.dispatchEvent(new MouseEvent('click', { ...opts, button: 0, buttons: 0 })) } catch {}

  if (typeof (element as any).click === 'function') {
    try { (element as any).click() } catch {}
  }
}

/**
 * Submits a prompt directly into X's Grok drawer input if direct post trigger was unavailable.
 */
export async function sendPromptToGrokDrawer(panel: HTMLElement, prompt: string): Promise<boolean> {
  const inputEl = panel.querySelector<HTMLElement>(
    'textarea, [contenteditable="true"], [data-testid="grok-input"], [role="textbox"]'
  )
  if (!inputEl) return false

  simulateRealisticClick(inputEl)
  await new Promise(r => setTimeout(r, 100))

  if (inputEl.tagName === 'TEXTAREA') {
    const textarea = inputEl as HTMLTextAreaElement
    textarea.value = prompt
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))
  } else {
    inputEl.innerText = prompt
    inputEl.dispatchEvent(new Event('input', { bubbles: true }))
  }

  await new Promise(r => setTimeout(r, 150))

  // Find and click Send button or press Enter
  const sendBtn = panel.querySelector<HTMLElement>(
    'button[aria-label*="Send" i], button[data-testid*="send" i], button[data-testid*="submit" i]'
  )
  if (sendBtn) {
    simulateRealisticClick(sendBtn)
    return true
  }

  inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }))
  return true
}

/**
 * Finds the live, connected article in the DOM even if the original reference
 * was detached due to feed virtualization, window resize, or screen recording reflows.
 */
export function findLiveArticle(
  article: HTMLElement,
  options?: { postText?: string; author?: string }
): HTMLElement {
  if (article && article.isConnected) {
    return article
  }

  // 1. Try finding by tweet status URL / ID
  const statusLink = article?.querySelector?.('a[href*="/status/"]') as HTMLAnchorElement | null
  const href = statusLink?.getAttribute('href') || statusLink?.href || ''
  const statusMatch = href.match(/\/status\/(\d+)/)
  if (statusMatch && statusMatch[1]) {
    const statusId = statusMatch[1]
    const liveLink = document.querySelector(`article a[href*="/status/${statusId}"]`)
    if (liveLink) {
      const liveArticle = liveLink.closest('article')
      if (liveArticle) return liveArticle as HTMLElement
    }
  }

  // 2. Search all articles currently in the DOM
  const allArticles = Array.from(document.querySelectorAll<HTMLElement>('article[data-testid="tweet"], article'))
  
  if (options?.author) {
    const authorHandle = options.author.match(/@([a-zA-Z0-9_]+)/)?.[1]?.toLowerCase()
    for (const art of allArticles) {
      const text = art.innerText || ''
      if (authorHandle && text.toLowerCase().includes(`@${authorHandle}`)) {
        if (!options.postText || text.includes(options.postText.slice(0, 30))) {
          return art
        }
      }
    }
  }

  if (options?.postText && options.postText.length >= 10) {
    const snippet = options.postText.slice(0, 30)
    for (const art of allArticles) {
      if ((art.innerText || '').includes(snippet)) {
        return art
      }
    }
  }

  return article || (document.querySelector('article[data-testid="tweet"]') as HTMLElement)
}

/**
 * Checks if an element in the tweet action bar is a known standard Twitter button (Reply, Retweet, Like, Analytics, Bookmark, Share, Replyly)
 */
function isStandardTwitterActionButton(el: HTMLElement): boolean {
  if (el.closest('.replyly-button-container')) return true

  const testId = (el.getAttribute('data-testid') || '').toLowerCase()
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase()
  const href = (el.getAttribute('href') || '').toLowerCase()

  const standardTestIds = ['reply', 'retweet', 'unretweet', 'like', 'unlike', 'bookmark', 'removebookmark', 'analytics', 'share', 'view-count']
  for (const id of standardTestIds) {
    if (testId.includes(id)) return true
  }

  const standardLabels = ['reply', 'repost', 'retweet', 'like', 'liked', 'bookmark', 'share', 'view post analytics', 'analytics', 'views']
  for (const label of standardLabels) {
    if (ariaLabel.includes(label)) return true
  }

  if (href.includes('/analytics') || href.includes('/quotes') || href.includes('/retweets')) {
    return true
  }

  return false
}

/**
 * Finds and clicks the Grok/AI Reply button on a specific tweet article.
 * Uses strict button targets and non-bubbling events to avoid triggering tweet navigation.
 */
export async function triggerGrokAnalysis(
  article: HTMLElement,
  options?: { postText?: string; author?: string }
): Promise<void> {
  const liveArticle = findLiveArticle(article, options)
  let grokTriggered = false

  // Strategy 1: Look strictly for real BUTTON elements in the post's action bar
  const actionBar = liveArticle?.querySelector?.('div[role="group"]')
  
  if (actionBar) {
    const buttons = Array.from(actionBar.querySelectorAll<HTMLElement>('button, [role="button"]'))
      .filter(el => !el.closest('.replyly-button-container') && el.tagName !== 'A')

    // 1a: Match by explicit Grok attributes on buttons
    for (const btn of buttons) {
      const text = btn.innerText?.toLowerCase() || ''
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase()
      const testId = (btn.getAttribute('data-testid') || '').toLowerCase()
      const title = (btn.getAttribute('title') || '').toLowerCase()

      if (
        text.includes('ai reply') ||
        text.includes('grok') ||
        text.includes('analyze') ||
        ariaLabel.includes('grok') ||
        ariaLabel.includes('ai reply') ||
        ariaLabel.includes('analyze') ||
        ariaLabel.includes('explain') ||
        ariaLabel.includes('ask grok') ||
        testId.includes('grok') ||
        title.includes('grok')
      ) {
        simulateRealisticClick(btn)
        grokTriggered = true
        break
      }
    }

    // 1b: Match by SVG icon inside button
    if (!grokTriggered) {
      for (const btn of buttons) {
        const svgs = btn.querySelectorAll('svg')
        if (svgs.length > 0 && !isStandardTwitterActionButton(btn)) {
          simulateRealisticClick(btn)
          grokTriggered = true
          break
        }
      }
    }
  }

  // Strategy 2: Look for button elements anywhere inside the live article
  if (!grokTriggered && liveArticle) {
    const articleButtons = Array.from(liveArticle.querySelectorAll<HTMLElement>('button, [role="button"]'))
      .filter(btn => !btn.closest('.replyly-button-container') && btn.tagName !== 'A')

    for (const btn of articleButtons) {
      const text = btn.innerText?.toLowerCase() || ''
      const label = (btn.getAttribute('aria-label') || '').toLowerCase()
      const testId = (btn.getAttribute('data-testid') || '').toLowerCase()
      if (
        text.includes('ai reply') ||
        text.includes('grok') ||
        label.includes('grok') ||
        label.includes('ai reply') ||
        label.includes('explain') ||
        testId.includes('grok')
      ) {
        simulateRealisticClick(btn)
        grokTriggered = true
        break
      }
    }
  }

  // Strategy 3: Check tweet's 3-dots caret menu
  if (!grokTriggered && liveArticle) {
    const moreButton = liveArticle.querySelector('[data-testid="caret"]') as HTMLElement | null
    if (moreButton) {
      simulateRealisticClick(moreButton)

      // Wait for dropdown menu to appear in DOM
      const foundMenuItem = await new Promise<HTMLElement | null>((resolve) => {
        let attempts = 0
        const checkMenu = setInterval(() => {
          attempts++
          const menuItems = Array.from(
            document.querySelectorAll<HTMLElement>(
              '[role="menuitem"], [data-testid="Dropdown"] [role="menuitem"], [data-testid="sheetDialog"] [role="menuitem"]'
            )
          )
          for (const item of menuItems) {
            const itemText = item.innerText?.toLowerCase() || ''
            const itemLabel = (item.getAttribute('aria-label') || '').toLowerCase()
            const testId = (item.getAttribute('data-testid') || '').toLowerCase()
            if (
              itemText.includes('grok') ||
              itemText.includes('analyze') ||
              itemText.includes('ask grok') ||
              itemText.includes('explain') ||
              itemText.includes('ai') ||
              itemLabel.includes('grok') ||
              testId.includes('grok')
            ) {
              clearInterval(checkMenu)
              resolve(item)
              return
            }
          }
          if (attempts >= 20) { // 1000ms max
            clearInterval(checkMenu)
            resolve(null)
          }
        }, 50)
      })

      if (foundMenuItem) {
        simulateRealisticClick(foundMenuItem)
        grokTriggered = true
      } else {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      }
    }
  }

  // Strategy 4: Fallback to opening Grok drawer and sending post prompt directly
  if (!grokTriggered) {
    let panel = findGrokSidebarPanel()
    if (!panel) {
      const globalGrokBtn = document.querySelector<HTMLElement>(
        '[data-testid="GrokDrawerHeader"], [data-testid="AppTabBar_Grok_Link"], [aria-label*="Grok" i]'
      )
      if (globalGrokBtn) {
        simulateRealisticClick(globalGrokBtn)
        await new Promise(r => setTimeout(r, 400))
        panel = findGrokSidebarPanel()
      }
    }

    if (panel) {
      const query = `Provide key context, facts, and summary for this post by ${options?.author || 'author'}: ${options?.postText || ''}`
      const sent = await sendPromptToGrokDrawer(panel, query.trim())
      if (sent) {
        grokTriggered = true
      }
    }
  }
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
): Promise<string | null> {
  const timeoutMs = options?.timeoutMs || 4000 // Fast 4s window before AI fallback
  const startTime = Date.now()

  const liveArticle = findLiveArticle(article, options)
  const fullOptions = {
    ...options,
    article: liveArticle
  }

  // 1. Capture initial panel text (if any panel was already open)
  const initialPanel = findGrokSidebarPanel()
  const initialRawText = initialPanel ? (initialPanel.innerText || '') : ''

  // 2. Trigger Grok analysis on the target tweet
  try {
    await triggerGrokAnalysis(liveArticle, options)
  } catch {}

  // 3. Poll and observe for new streaming content in real-time
  return new Promise<string | null>((resolve) => {
    let lastContent = ''
    let stableCount = 0
    let hasStartedNewGeneration = initialRawText.length === 0

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > timeoutMs) {
        clearInterval(interval)
        if (lastContent && lastContent.length >= 15) {
          resolve(lastContent)
        } else {
          resolve(null) // Return null so ReplyModal triggers AI generation fallback instantly
        }
        return
      }

      const panel = findGrokSidebarPanel()
      if (!panel) return

      const currentRawText = panel.innerText || ''
      const isThinking = isGrokThinkingOrStreaming(panel)

      // If panel was already open with old text, wait for it to clear, start thinking, or change
      if (!hasStartedNewGeneration) {
        if (isThinking || currentRawText !== initialRawText) {
          hasStartedNewGeneration = true
        } else {
          return
        }
      }

      const currentContent = scrapeGrokContext(fullOptions)

      if (currentContent) {
        // Stream live text to ReplyModal UI in real-time
        if (options?.onProgress && currentContent !== lastContent) {
          options.onProgress(currentContent)
        }

        if (currentContent !== lastContent) {
          lastContent = currentContent
          stableCount = 0
        } else {
          if (isThinking) {
            stableCount = 0
          } else if (currentContent.length >= 15) {
            stableCount++
            // After 4 consecutive checks (~0.8s) of stable text when NOT in thinking mode, complete!
            if (stableCount >= 4) {
              clearInterval(interval)
              resolve(currentContent)
              return
            }
          }
        }
      } else {
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
    simulateRealisticClick(btn)
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
          simulateRealisticClick(btn)
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
  const liveArticle = findLiveArticle(article, options)
  const analysis = await waitForGrokRealtimeAnalysis(liveArticle, {
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
