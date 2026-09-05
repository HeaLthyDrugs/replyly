export interface LinkedInMediaInfo {
  hasImages: boolean
  hasVideo: boolean
  hasCards: boolean
  hasMedia: boolean
}

export interface LinkedInPostData {
  author: string
  text: string
  hasMedia: boolean
  postId: string | null
}

/**
 * Detects whether a LinkedIn post contains media (images, videos, articles, carousels/documents)
 */
export function detectLinkedInPostMedia(container: HTMLElement): LinkedInMediaInfo {
  const hasImages =
    container.querySelector('.feed-shared-image') !== null ||
    container.querySelector('img.feed-shared-image__image') !== null ||
    container.querySelector('img[src*="media.licdn.com"]') !== null ||
    container.querySelector('.update-components-image') !== null ||
    container.querySelector('.feed-shared-image__container') !== null

  const hasVideo =
    container.querySelector('video') !== null ||
    container.querySelector('.feed-shared-linkedin-video') !== null ||
    container.querySelector('.update-components-video') !== null ||
    container.querySelector('.feed-shared-external-video__wrapper') !== null

  const hasCards =
    container.querySelector('.feed-shared-article') !== null ||
    container.querySelector('.feed-shared-document') !== null ||
    container.querySelector('.feed-shared-mini-update-v2') !== null ||
    container.querySelector('.feed-shared-celebration') !== null ||
    container.querySelector('.update-components-article') !== null

  return {
    hasImages,
    hasVideo,
    hasCards,
    hasMedia: hasImages || hasVideo || hasCards
  }
}

/**
 * Extracts author, post text, media status, and post ID from a LinkedIn post element
 */
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

  const authorEl =
    container.querySelector('.update-components-actor__title span[aria-hidden="true"]') ||
    container.querySelector('.update-components-actor__name span[aria-hidden="true"]') ||
    container.querySelector('.feed-shared-actor__title span[aria-hidden="true"]') ||
    container.querySelector('.feed-shared-actor__name span[aria-hidden="true"]') ||
    container.querySelector('.update-components-actor__title') ||
    container.querySelector('.update-components-actor__name') ||
    container.querySelector('.feed-shared-actor__title') ||
    container.querySelector('.feed-shared-actor__name')

  if (authorEl) {
    const raw = (authorEl as HTMLElement).innerText || ''
    // Split on newline or bullet (which separates name from connection degree, e.g. "Nikhil Maurya • 2nd")
    author = raw.split(/\n|•/)[0].trim()
  }

  // Fallback A: Avatar image alt attribute (almost always contains the author's exact name)
  if (!author || author.toLowerCase() === 'linkedin member') {
    const avatarImg = container.querySelector<HTMLImageElement>(
      'img.update-components-actor__avatar-image, img.feed-shared-actor__avatar-image, .update-components-actor img[alt], .feed-shared-actor img[alt]'
    )
    if (avatarImg && avatarImg.alt) {
      author = avatarImg.alt.replace(/^photo of\s*/i, '').trim()
    }
  }

  // Fallback B: Actor profile link aria-label or text
  if (!author || author.toLowerCase() === 'linkedin member') {
    const profileLink = container.querySelector<HTMLAnchorElement>(
      '.update-components-actor a[href*="/in/"], .feed-shared-actor a[href*="/in/"], a[href*="/in/"]'
    )
    if (profileLink) {
      const aria = (profileLink.getAttribute('aria-label') || '').trim()
      const cleaned = aria.replace(/^view profile for\s*/i, '').trim()
      if (cleaned) {
        author = cleaned
      } else {
        author = profileLink.innerText.split(/\n|•/)[0].trim()
      }
    }
  }

  if (!author) {
    author = 'LinkedIn Member'
  }

  // 2. Text extraction
  let text = ''

  const textEl =
    container.querySelector('.feed-shared-update-v2__description-wrapper') ||
    container.querySelector('.feed-shared-update-v2__description') ||
    container.querySelector('.update-components-text') ||
    container.querySelector('.feed-shared-inline-show-more-text') ||
    container.querySelector('div[data-ad-preview="message"]') ||
    container.querySelector('.feed-shared-text') ||
    container.querySelector('.feed-shared-text-view')

  if (textEl) {
    // Check if there is an inner span dir="ltr" which holds the post text without the "...more" button
    const ltrSpan = textEl.querySelector('span[dir="ltr"]') as HTMLElement | null
    if (ltrSpan) {
      text = ltrSpan.innerText.trim()
    } else {
      text = (textEl as HTMLElement).innerText.trim()
    }
  }

  // Fallback: search for any break-words container that isn't the actor or action bar
  if (!text) {
    const candidates = container.querySelectorAll<HTMLElement>('.break-words, span[dir="ltr"], div[dir="ltr"]')
    for (const el of Array.from(candidates)) {
      if (
        !el.closest(
          '.update-components-actor, .feed-shared-actor, .feed-shared-social-actions, .feed-shared-social-action-bar, .feed-shared-control-menu, .feed-shared-social-counts'
        )
      ) {
        const candidateText = el.innerText.trim()
        if (candidateText.length > text.length) {
          text = candidateText
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
