export interface LinkedInMediaInfo {
  hasImages: boolean
  hasVideo: boolean
  hasCards: boolean
  hasMedia: boolean
  mediaType?: "video" | "image" | "document" | "media"
  mediaDescription?: string
}

export interface LinkedInPostData {
  author: string
  text: string
  hasMedia: boolean
  mediaType?: "video" | "image" | "document" | "media"
  mediaDescription?: string
  postId: string | null
}

/**
 * Detects whether a LinkedIn post contains media (images, videos, articles, carousels/documents)
 */
export function detectLinkedInPostMedia(container: HTMLElement): LinkedInMediaInfo {
  const hasVideo =
    container.querySelector('video') !== null ||
    container.querySelector('.feed-shared-linkedin-video') !== null ||
    container.querySelector('.update-components-video') !== null ||
    container.querySelector('.feed-shared-external-video__wrapper') !== null ||
    container.querySelector('.video-js') !== null ||
    container.querySelector('[class*="video-player"]') !== null ||
    container.querySelector('[class*="linkedin-video"]') !== null

  const hasImages =
    container.querySelector('.feed-shared-image') !== null ||
    container.querySelector('img.feed-shared-image__image') !== null ||
    container.querySelector('img[src*="media.licdn.com"]:not([class*="avatar"]):not(.update-components-actor__avatar-image)') !== null ||
    container.querySelector('.update-components-image') !== null ||
    container.querySelector('.feed-shared-image__container') !== null

  const hasCards =
    container.querySelector('.feed-shared-article') !== null ||
    container.querySelector('.feed-shared-document') !== null ||
    container.querySelector('.feed-shared-mini-update-v2') !== null ||
    container.querySelector('.feed-shared-celebration') !== null ||
    container.querySelector('.update-components-article') !== null

  const hasMedia = hasVideo || hasImages || hasCards
  let mediaType: "video" | "image" | "document" | "media" | undefined
  let mediaDescription = ""

  if (hasVideo) {
    mediaType = "video"
    mediaDescription = "video"
  } else if (hasImages) {
    mediaType = "image"
    mediaDescription = "image"
  } else if (hasCards) {
    mediaType = "document"
    mediaDescription = "document"
  }

  return {
    hasImages,
    hasVideo,
    hasCards,
    hasMedia,
    mediaType,
    mediaDescription
  }
}

/**
 * Checks if a string contains video player accessibility controls text
 */
function isMediaOrControlsText(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return (
    lower.includes('remaining time') ||
    lower.includes('playback rate') ||
    lower.includes('subtitles settings') ||
    lower.includes('picture-in-picture') ||
    lower.includes('seek to live') ||
    lower.includes('stream type live') ||
    lower.includes('skip backward') ||
    lower.includes('skip forward') ||
    lower.includes('unmute') ||
    lower.includes('vjs-') ||
    lower.includes('watch again') ||
    lower.includes('audio track') ||
    lower.includes('fullscreen') ||
    lower.includes('replay') && lower.includes('skip')
  )
}

/**
 * Extracts author, post text, media status, and post ID from a LinkedIn post element
 */
export function extractLinkedInPostData(rawContainer: HTMLElement): LinkedInPostData {
  // If the provided element is a child sub-block (like social actions or action bar), ascend to the real post card
  const container =
    rawContainer.classList.contains('feed-shared-social-actions') ||
    rawContainer.classList.contains('feed-shared-social-action-bar') ||
    rawContainer.classList.contains('social-actions-bar') ||
    (!rawContainer.querySelector('.update-components-actor, .feed-shared-actor, [class*="actor__name"]') &&
      !rawContainer.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-inline-show-more-text'))
      ? (rawContainer.closest<HTMLElement>(
          'div[data-view-name="feed-full-update"], div.feed-shared-update-v2, div.occludable-update, article'
        ) || rawContainer)
      : rawContainer

  // 1. Author extraction
  let author = ''

  const authorSelectors = [
    '.update-components-actor__title span[aria-hidden="true"]',
    '.update-components-actor__name span[aria-hidden="true"]',
    '.feed-shared-actor__title span[aria-hidden="true"]',
    '.feed-shared-actor__name span[aria-hidden="true"]',
    '.update-components-actor__title',
    '.update-components-actor__name',
    '.feed-shared-actor__title',
    '.feed-shared-actor__name',
    '[class*="actor__name"]',
    '[class*="actor__title"]'
  ]

  for (const selector of authorSelectors) {
    const el = container.querySelector<HTMLElement>(selector)
    if (el) {
      const raw = (el.innerText || '').split(/\n|•/)[0].trim()
      if (raw && !raw.toLowerCase().includes('view profile') && raw.length >= 2 && raw.length <= 60) {
        author = raw
        break
      }
    }
  }

  // Fallback A: Iterate through ALL profile links in the post
  if (!author || author.toLowerCase() === 'linkedin member') {
    const profileLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]'))
    for (const link of profileLinks) {
      // Check aria-label (e.g. "View profile for Bernard K. Mtonga")
      const aria = (link.getAttribute('aria-label') || '').trim()
      const cleanedAria = aria.replace(/^view profile for\s*/i, '').split(/\n|•/)[0].trim()
      if (cleanedAria && cleanedAria.length >= 2 && cleanedAria.length <= 60) {
        author = cleanedAria
        break
      }

      // Check text inside the link (e.g. "Bernard K. Mtonga\nFull Stack Developer...")
      const linkText = (link.innerText || '').split(/\n|•/)[0].trim()
      if (linkText && linkText.length >= 2 && linkText.length <= 60 && !linkText.toLowerCase().includes('view profile')) {
        author = linkText
        break
      }

      // Check child avatar image inside link
      const childImg = link.querySelector('img[alt]') as HTMLImageElement | null
      if (childImg && childImg.alt) {
        const altText = childImg.alt.replace(/^photo of\s*/i, '').replace(/^view\s*/i, '').split(/\n|•/)[0].trim()
        if (altText && altText.length >= 2 && altText.length <= 60) {
          author = altText
          break
        }
      }
    }
  }

  // Fallback B: Any avatar image in the post
  if (!author || author.toLowerCase() === 'linkedin member') {
    const avatarImg = container.querySelector<HTMLImageElement>(
      '.update-components-actor img[alt], .feed-shared-actor img[alt], img.ivm-view-attr__img--centered[alt], img[class*="avatar"][alt]'
    )
    if (avatarImg && avatarImg.alt) {
      const alt = avatarImg.alt.replace(/^photo of\s*/i, '').replace(/^view profile for\s*/i, '').split(/\n|•/)[0].trim()
      if (alt && alt.length >= 2 && alt.length <= 60 && !alt.toLowerCase().includes('reaction')) {
        author = alt
      }
    }
  }

  if (!author) {
    author = 'LinkedIn Member'
  }

  // 2. Text extraction (Strictly excluding video player elements and video controls)
  let text = ''

  const textSelectors = [
    '.feed-shared-update-v2__description-wrapper',
    '.feed-shared-update-v2__description',
    '.update-components-text',
    '.feed-shared-inline-show-more-text',
    '[data-view-name="feed-full-update"] .update-components-text',
    'div[data-ad-preview="message"]',
    '.feed-shared-text',
    '.feed-shared-text-view',
    '[class*="update-v2__commentary"]',
    '[class*="update-components-commentary"]'
  ]

  for (const sel of textSelectors) {
    const textEl = container.querySelector<HTMLElement>(sel)
    if (textEl) {
      // Must NOT be inside a video player or video controls
      if (
        textEl.closest(
          '.feed-shared-linkedin-video, .update-components-video, [class*="video"], [class*="vjs-"], .vjs-control-bar, video'
        )
      ) {
        continue
      }

      // Clone element so we can remove "...more" buttons and any nested controls cleanly
      const clone = textEl.cloneNode(true) as HTMLElement
      const buttons = clone.querySelectorAll('button, .feed-shared-inline-show-more-text__see-more-less-toggle')
      buttons.forEach((btn) => btn.remove())

      const mediaControls = clone.querySelectorAll('.vjs-control-bar, [class*="vjs-"], [class*="video"], video')
      mediaControls.forEach((m) => m.remove())

      const ltrSpan = clone.querySelector('span[dir="ltr"]') as HTMLElement | null
      const candidate = (ltrSpan ? ltrSpan.innerText : clone.innerText).trim()

      if (candidate.length > 0 && !isMediaOrControlsText(candidate)) {
        text = candidate
        break
      }
    }
  }

  // Fallback: search for any break-words container that isn't actor, video, or social bar
  if (!text) {
    const candidates = container.querySelectorAll<HTMLElement>('.break-words')
    for (const el of Array.from(candidates)) {
      if (
        !el.closest(
          '.update-components-actor, .feed-shared-actor, [class*="actor"], .feed-shared-linkedin-video, .update-components-video, [class*="video"], [class*="vjs-"], video, .feed-shared-social-actions, .feed-shared-social-action-bar, .feed-shared-control-menu, .feed-shared-social-counts'
        )
      ) {
        const clone = el.cloneNode(true) as HTMLElement
        const buttons = clone.querySelectorAll('button')
        buttons.forEach((btn) => btn.remove())

        const candidateText = clone.innerText.trim()
        if (candidateText.length > 0 && !isMediaOrControlsText(candidateText)) {
          text = candidateText
          break
        }
      }
    }
  }

  // Clean up trailing "...more" or "see more" button text
  text = text.replace(/\s*(\.\.\.\s*more|see\s*more)\s*$/i, '').trim()

  // 3. Post ID / URN extraction
  const postId = getLinkedInPostId(container)

  // 4. Media detection
  const mediaInfo = detectLinkedInPostMedia(container)

  return {
    author,
    text,
    hasMedia: mediaInfo.hasMedia,
    mediaType: mediaInfo.mediaType,
    mediaDescription: mediaInfo.mediaDescription,
    postId
  }
}

/**
 * Extracts LinkedIn post ID / URN for cache identification
 */
export function getLinkedInPostId(container: HTMLElement): string | null {
  const urnAttr = container.getAttribute('data-urn') || container.getAttribute('data-id')
  if (urnAttr) {
    return urnAttr
  }

  const closestWithUrn = container.closest('[data-urn]')
  if (closestWithUrn) {
    const urn = closestWithUrn.getAttribute('data-urn')
    if (urn) return urn
  }

  const permalink = container.querySelector('a[href*="/feed/update/urn:li:activity:"]') as HTMLAnchorElement | null
  if (permalink) {
    const href = permalink.getAttribute('href') || permalink.href || ''
    const match = href.match(/urn:li:activity:(\d+)/)
    if (match && match[1]) {
      return `urn:li:activity:${match[1]}`
    }
  }

  return null
}

/**
 * Opens LinkedIn's native comment composer for a post and inserts text into Quill editor
 */
export async function openLinkedInCommentComposer(postElement: HTMLElement, text: string): Promise<void> {
  // 1. Check if comment editor is already open in this post
  let editor = findLinkedInComposer(postElement)

  // 2. If not open, click the native comment button
  if (!editor) {
    const commentButton = postElement.querySelector(
      'button.comment-button, button[aria-label*="Comment" i], button.artdeco-button[aria-label*="Comment" i], button.artdeco-button--tertiary[aria-label*="Comment" i]'
    ) as HTMLElement | null

    if (!commentButton) {
      throw new Error("Could not find the native Comment button for this LinkedIn post.")
    }

    commentButton.click()

    // 3. Wait for the composer to render and become interactive
    editor = await waitForLinkedInComposer(postElement)
  }

  if (!editor) {
    throw new Error("The LinkedIn comment composer did not open in time.")
  }

  // 4. Focus the rich text editor
  editor.focus()

  // Wait briefly for Quill / React hooks to process focus
  await new Promise((resolve) => setTimeout(resolve, 80))

  // 5. Insert text using execCommand
  const success = document.execCommand('insertText', false, text)

  // 6. If execCommand was not accepted or didn't populate, use Quill fallback
  if (!success || !editor.innerText.trim()) {
    let p = editor.querySelector('p')
    if (!p) {
      p = document.createElement('p')
      editor.appendChild(p)
    }
    p.textContent = text

    // Dispatch synthetic events to trigger LinkedIn's internal state & enable "Post" button
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      })
    )
    editor.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      })
    )
    editor.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // Scroll editor into view smoothly
  editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

/**
 * Finds the comment editor element within or immediately adjacent to a post
 */
function findLinkedInComposer(postElement: HTMLElement): HTMLElement | null {
  return (
    (postElement.querySelector(
      '.ql-editor[contenteditable="true"], div[role="textbox"][contenteditable="true"], .comments-comment-box__editor [contenteditable="true"], [data-placeholder*="comment" i][contenteditable="true"]'
    ) as HTMLElement | null) ||
    // Sometimes LinkedIn places the comments box right after the feed item container
    (postElement.parentElement?.querySelector(
      '.comments-comment-box .ql-editor[contenteditable="true"]'
    ) as HTMLElement | null)
  )
}

/**
 * Polls for the comment editor to appear after clicking Comment button
 */
function waitForLinkedInComposer(postElement: HTMLElement): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const existing = findLinkedInComposer(postElement)
    if (existing) {
      return resolve(existing)
    }

    let attempts = 0
    const maxAttempts = 35 // 3.5 seconds total

    const interval = setInterval(() => {
      attempts++
      const editor = findLinkedInComposer(postElement)

      if (editor) {
        clearInterval(interval)
        resolve(editor)
      } else if (attempts >= maxAttempts) {
        clearInterval(interval)
        resolve(null)
      }
    }, 100)
  })
}
