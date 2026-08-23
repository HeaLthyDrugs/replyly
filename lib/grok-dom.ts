import { TONE_DEFINITIONS } from "./ai/prompts"

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
 * Extracts the clean analysis bullet points from the Grok sidebar.
 */
export function scrapeGrokContext(options?: { postText?: string; author?: string }): string | null {
  const panel = findGrokSidebarPanel()
  if (!panel) return null

  const rawText = panel.innerText || ''
  if (!rawText || rawText.trim().length === 0) return null

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const bulletLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip promo lines
    if (
      line.includes('Get rid of ads') ||
      line.includes('boost your replies') ||
      line.includes('unlock 20+ features')
    ) {
      continue
    }

    // Skip prompt instructions or UI labels
    if (
      line === 'Ask anything' ||
      line === 'Fast' ||
      line.match(/^\d+\s+posts?$/i) ||
      line.match(/^\d+\s+web\s+pages?$/i) ||
      line.startsWith('↳') ||
      line.includes('Write exactly') ||
      line.includes('STRICT RULES') ||
      line.includes('Thinking about your request')
    ) {
      continue
    }

    // Capture lines starting with bullet points
    if (line.startsWith('•') || line.startsWith('-')) {
      bulletLines.push(line)
    }
  }

  if (bulletLines.length > 0) {
    return bulletLines.join('\n\n').trim()
  }

  return null
}

/**
 * Finds and clicks the Grok/AI Reply button on a specific tweet article.
 */
export async function triggerGrokAnalysis(article: HTMLElement): Promise<void> {
  const actionBar = article.querySelector('div[role="group"]')
  
  if (actionBar) {
    const clickables = actionBar.querySelectorAll('button, [role="button"], a, div')
    
    for (const el of clickables) {
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

  const moreButton = article.querySelector('[data-testid="caret"]') as HTMLElement | null
  if (moreButton) {
    moreButton.click()

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

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  }

  throw new Error('Could not find Grok trigger button on this post. Please ensure Grok is available on your X account.')
}

/**
 * Finds the input field in the Grok sidebar panel.
 */
export function findGrokInputField(): HTMLElement | null {
  const panel = findGrokSidebarPanel() || document.body

  const inputs = panel.querySelectorAll<HTMLElement>(
    'textarea, div[contenteditable="true"], [role="textbox"], input[type="text"], [data-testid="grok-input"], [placeholder*="Ask" i]'
  )

  for (const input of inputs) {
    if (input.offsetParent !== null || window.getComputedStyle(input).display !== 'none') {
      return input
    }
  }

  return null
}

/**
 * Inserts text into Grok's input box and automatically submits it.
 */
export async function sendPromptToGrok(promptText: string): Promise<void> {
  const input = findGrokInputField()
  if (!input) {
    throw new Error("Could not find Grok's input box. Please make sure the Grok sidebar is open.")
  }

  input.focus()

  // 1. Set text value using React prototype setter + synthetic input events
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set

    if (setter) {
      setter.call(input, promptText)
    } else {
      input.value = promptText
    }

    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // 2. Also execute rich text insert for Draft.js / Lexical / contenteditable
  try {
    document.execCommand('selectAll', false)
    document.execCommand('insertText', false, promptText)
  } catch (e) {
    // Ignore if not supported
  }

  await new Promise(r => setTimeout(r, 200))

  // 3. Find and click the Submit / Send arrow button (↑)
  const panel = findGrokSidebarPanel() || document.body
  let submitted = false

  // Look for the submit button near the input
  const inputWrapper = input.closest('div[role="region"], form, div:has(button)') || input.parentElement?.parentElement || panel
  const allButtons = Array.from(inputWrapper.querySelectorAll('button, [role="button"]')) as HTMLElement[]

  for (const btn of allButtons) {
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase()
    const testId = (btn.getAttribute('data-testid') || '').toLowerCase()
    const svg = btn.querySelector('svg')
    
    // Check aria-labels or testids
    if (
      ariaLabel.includes('send') ||
      ariaLabel.includes('submit') ||
      ariaLabel.includes('grok') ||
      ariaLabel.includes('ask') ||
      testId.includes('send') ||
      testId.includes('submit') ||
      testId.includes('grok')
    ) {
      btn.click()
      submitted = true
      break
    }

    // Check SVG arrow up path
    if (svg) {
      btn.click()
      submitted = true
      break
    }
  }

  // 4. Always dispatch Enter keydown as well to guarantee submission
  input.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  }))

  input.dispatchEvent(new KeyboardEvent('keypress', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  }))

  input.dispatchEvent(new KeyboardEvent('keyup', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  }))
}

/**
 * Parses strictly numbered replies (1. ..., 2. ..., 3. ...) generated by Grok.
 */
export function parseGrokReplies(rawText: string, expectedCount: number = 3): string[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const replies: string[] = []

  for (const line of lines) {
    // Match "1. ...", "2. ...", "3. ...", "1) ...", "2) ...", "3) ..."
    const match = line.match(/^(\d+)[\.\)]\s*(.+)$/)
    if (match && match[2]) {
      let text = match[2].trim()

      // Strip quotes
      if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”'))) {
        text = text.slice(1, -1).trim()
      }

      // Filter out prompt template placeholders or rules
      if (
        text.length > 8 &&
        !text.startsWith('<') &&
        !text.endsWith('>') &&
        !text.toLowerCase().includes('write exactly') &&
        !text.toLowerCase().includes('strict rules') &&
        !text.toLowerCase().includes('here are') &&
        !text.toLowerCase().includes('reply options') &&
        !text.toLowerCase().includes('thinking about')
      ) {
        replies.push(text)
      }
    }
  }

  return replies.slice(0, expectedCount)
}

/**
 * Generates complete replies using X's built-in Grok AI without any API keys.
 */
export async function generateRepliesWithGrok(
  article: HTMLElement,
  tone: string,
  customInstruction: string = "",
  numReplies: number = 3,
  onProgress?: (liveReplies: string[]) => void
): Promise<string[]> {
  // Step 1: Ensure Grok sidebar is open on the target tweet
  const panel = findGrokSidebarPanel()
  if (!panel) {
    await triggerGrokAnalysis(article)
    await new Promise(r => setTimeout(r, 800))
  }

  // Wait for Grok input field to be ready
  let input = findGrokInputField()
  if (!input) {
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 400))
      input = findGrokInputField()
      if (input) break
    }
  }

  if (!input) {
    throw new Error("Grok sidebar opened, but the input area was not ready. Please try again.")
  }

  // Step 2: Build the structured prompt for Grok
  const toneDesc = TONE_DEFINITIONS[tone] || TONE_DEFINITIONS["Smart"] || ""
  const instructionPart = customInstruction.trim() ? `User Instruction: ${customInstruction.trim()}\n` : ""

  const prompt = `Write exactly ${numReplies} short, distinct, natural replies to this post for X.
Tone: ${tone} (${toneDesc})
${instructionPart}
STRICT RULES:
- 1-2 sentences per reply (10-35 words per reply, maximum 280 characters).
- Sound like a real person on X.
- Never use generic openings like "Great post!", "Love this!", "Interesting perspective!".
- Format your response strictly as a numbered list:
1. <first reply>
2. <second reply>
3. <third reply>`

  // Step 3: Send prompt into Grok
  await sendPromptToGrok(prompt)

  // Step 4: Wait for Grok's generated replies in real-time
  return new Promise<string[]>((resolve, reject) => {
    const startTime = Date.now()
    const timeoutMs = 25000
    let lastParsedReplies: string[] = []
    let stableCount = 0

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > timeoutMs) {
        clearInterval(interval)
        if (lastParsedReplies.length > 0) {
          resolve(lastParsedReplies)
        } else {
          reject(new Error("Grok reply generation timed out. Please try again."))
        }
        return
      }

      const activePanel = findGrokSidebarPanel()
      if (activePanel) {
        const fullText = activePanel.innerText || ''
        const parsed = parseGrokReplies(fullText, numReplies)

        if (parsed.length > 0) {
          if (onProgress && JSON.stringify(parsed) !== JSON.stringify(lastParsedReplies)) {
            onProgress(parsed)
          }

          if (parsed.length === numReplies && JSON.stringify(parsed) === JSON.stringify(lastParsedReplies)) {
            stableCount++
            if (stableCount >= 3) { // Stable for ~750ms
              clearInterval(interval)
              resolve(parsed)
              return
            }
          } else {
            lastParsedReplies = parsed
            stableCount = 0
          }
        }
      }
    }, 250)
  })
}

/**
 * Regenerates a single alternative reply using Grok in real-time.
 */
export async function regenerateSingleReplyWithGrok(
  article: HTMLElement,
  tone: string,
  customInstruction: string = ""
): Promise<string> {
  const replies = await generateRepliesWithGrok(article, tone, customInstruction, 1)
  if (replies.length > 0) {
    return replies[0]
  }
  throw new Error("Could not regenerate reply with Grok.")
}

/**
 * Waits for real-time Grok analysis to stream and stabilize for the target tweet.
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

  await triggerGrokAnalysis(article)

  return new Promise<string>((resolve, reject) => {
    let lastContent = ''
    let stableCount = 0

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed > timeoutMs) {
        clearInterval(interval)
        if (lastContent && lastContent.length >= 20) {
          resolve(lastContent)
        } else {
          reject(new Error('Grok analysis timed out. Please try again.'))
        }
        return
      }

      const currentContent = scrapeGrokContext(options)

      if (currentContent) {
        if (options?.onProgress && currentContent !== lastContent) {
          options.onProgress(currentContent)
        }

        if (currentContent === lastContent && currentContent.length > 20) {
          stableCount++
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
