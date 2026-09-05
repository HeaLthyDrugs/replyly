import React from "react"
import { createRoot } from "react-dom/client"
import type { PlasmoCSConfig } from "plasmo"
import { ReplyButton } from "../components/ReplyButton"
import { ReplyModal } from "../components/ReplyModal"
import { extractLinkedInPostData } from "../lib/linkedin-dom"

export const config: PlasmoCSConfig = {
  matches: [
    "https://linkedin.com/*",
    "https://www.linkedin.com/*",
    "https://*.linkedin.com/*"
  ]
}

// Global state
let isExtensionEnabled = true
let globalObserver: MutationObserver | null = null
let pollInterval: NodeJS.Timeout | null = null

/**
 * Finds the direct child of an ancestor element that contains a given descendant
 */
function getDirectChild(ancestor: HTMLElement, descendant: HTMLElement): HTMLElement | null {
  let curr: HTMLElement | null = descendant
  while (curr && curr.parentElement !== ancestor) {
    curr = curr.parentElement
  }
  return curr
}

/**
 * Resolves an action bar or wrapper down to the exact inner button bar
 */
function resolveDirectActionBar(barOrWrapper: HTMLElement): HTMLElement {
  const innerBar = barOrWrapper.querySelector<HTMLElement>(
    '.feed-shared-social-action-bar, .social-actions-bar, [class*="social-action-bar"], [class*="social-actions-bar"], .feed-shared-social-actions__action-bar'
  )
  if (innerBar) {
    return innerBar
  }
  return barOrWrapper
}

/**
 * Finds the exact action bar housing the action buttons from a button
 */
function findExactActionBar(btn: HTMLElement): HTMLElement | null {
  // 1. Direct class match on ancestors
  const directBar = btn.closest<HTMLElement>(
    '.feed-shared-social-action-bar, .social-actions-bar, [class*="social-action-bar"], [class*="social-actions-bar"], .feed-shared-social-actions__action-bar'
  )
  if (directBar) return directBar

  // 2. Ascend to find the immediate parent container housing the social buttons (Like, Comment, Repost, Send)
  let curr = btn.parentElement
  while (curr && curr !== document.body && curr.tagName !== 'MAIN' && curr.tagName !== 'ARTICLE') {
    const buttons = curr.querySelectorAll('button')
    if (buttons.length >= 2 && buttons.length <= 8) {
      return curr
    }
    curr = curr.parentElement
  }

  return btn.parentElement
}

/**
 * Verifies if an element is a real post card container
 */
function isPostCard(el: HTMLElement): boolean {
  // Reject social actions wrappers and action bars immediately
  if (
    el.classList.contains('feed-shared-social-actions') ||
    el.classList.contains('feed-shared-social-action-bar') ||
    el.classList.contains('social-actions-bar') ||
    el.classList.contains('replyly-button-container')
  ) {
    return false
  }

  // A genuine post card has an actor/author header or description text
  const hasActor =
    el.querySelector(
      '.update-components-actor, .feed-shared-actor, [class*="actor__name"], [class*="actor__title"], a[href*="/in/"]'
    ) !== null

  const hasDescription =
    el.querySelector(
      '.feed-shared-update-v2__description, .update-components-text, .feed-shared-inline-show-more-text, [class*="update-v2__description"]'
    ) !== null

  return hasActor || hasDescription
}

/**
 * Finds the true post card container element corresponding to an action bar
 */
function findPostContainer(actionBar: HTMLElement): HTMLElement {
  // 1. Direct match on standard LinkedIn post card containers (skipping inner data-id/data-urn wrappers)
  const directPost = actionBar.closest<HTMLElement>(
    'div[data-view-name="feed-full-update"], div.feed-shared-update-v2, div.occludable-update, article.feed-shared-update-v2, article'
  )
  if (directPost && isPostCard(directPost)) {
    return directPost
  }

  // 2. Ascend to find the closest ancestor that contains post content (author/actor or description)
  let curr = actionBar.parentElement
  while (curr && curr !== document.body && curr.tagName !== 'MAIN') {
    if (isPostCard(curr)) {
      return curr
    }
    curr = curr.parentElement
  }

  // 3. Fallback to directPost if found
  if (directPost) return directPost

  // 4. Last-resort fallback: ascend until a large container is found that isn't social actions
  let fallback = actionBar.parentElement
  while (fallback && fallback !== document.body && fallback.tagName !== 'MAIN') {
    if (fallback.offsetHeight > 180 && !fallback.classList.contains('feed-shared-social-actions')) {
      return fallback
    }
    fallback = fallback.parentElement
  }

  return actionBar.parentElement || actionBar
}

/**
 * Injects the Replyly RLY button into a LinkedIn action bar,
 * positioned exactly in the center between the Comment and Repost buttons.
 */
function injectReplyButton(rawBar: HTMLElement, postElement: HTMLElement): void {
  const actionBar = resolveDirectActionBar(rawBar)

  // Guard against duplicate injections on this bar or post
  if (actionBar.querySelector('.replyly-button-container')) {
    return
  }
  if (postElement.querySelector('.replyly-button-container')) {
    return
  }

  // Create container matching LinkedIn's native action button wrappers
  const buttonContainer = document.createElement("span")
  buttonContainer.className = "feed-shared-social-action-bar__action-button replyly-button-container replyly-linkedin"
  buttonContainer.style.display = isExtensionEnabled ? "inline-flex" : "none"
  buttonContainer.style.alignItems = "center"
  buttonContainer.style.justifyContent = "center"
  buttonContainer.style.flex = "1 1 0%"
  buttonContainer.style.minWidth = "0"
  buttonContainer.style.boxSizing = "border-box"
  buttonContainer.style.position = "relative"
  buttonContainer.style.visibility = "visible"
  buttonContainer.style.opacity = "1"

  // Step 1: Locate the native Comment button
  const commentBtn =
    actionBar.querySelector<HTMLElement>(
      'button[aria-label*="Comment" i], button.comment-button, button[data-control-name*="comment" i]'
    ) ||
    Array.from(actionBar.querySelectorAll<HTMLElement>('button')).find((btn) => {
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase()
      const text = (btn.innerText || '').toLowerCase()
      return aria.includes('comment') || text.includes('comment')
    })

  let targetSlot: HTMLElement | null = null

  if (commentBtn) {
    // Traverse upward to find the direct child of actionBar containing the Comment button
    targetSlot = getDirectChild(actionBar, commentBtn)
  }

  // Step 2: Fallback to index 1 (the 2nd button in [Like, Comment, Repost, Send])
  if (!targetSlot) {
    const directChildren = Array.from(actionBar.children).filter(
      (child) => !child.classList.contains('replyly-button-container')
    ) as HTMLElement[]

    // In LinkedIn's standard 4-button action bar:
    // child[0] = Like, child[1] = Comment, child[2] = Repost, child[3] = Send
    if (directChildren.length >= 2) {
      targetSlot = directChildren[1] // The Comment slot is at index 1
    } else if (directChildren.length === 1) {
      targetSlot = directChildren[0]
    }
  }

  // Step 3: Insert after the Comment slot (putting RLY dead center: Like | Comment | [RLY] | Repost | Send)
  if (targetSlot) {
    targetSlot.insertAdjacentElement('afterend', buttonContainer)
  } else {
    actionBar.appendChild(buttonContainer)
  }

  // Extract post details and mount the React ReplyButton
  const postData = extractLinkedInPostData(postElement)
  const root = createRoot(buttonContainer)
  root.render(
    <ReplyButton
      platform="linkedin"
      postText={postData.text}
      author={postData.author}
      article={postElement}
      hasMedia={postData.hasMedia}
      mediaType={postData.mediaType}
    />
  )

  console.log('[Replyly] Injected RLY button into LinkedIn post action bar (center position):', {
    author: postData.author,
    actionBar
  })
}

/**
 * Robust multi-strategy detection to find all posts and inject the Replyly button
 */
function detectPosts(): void {
  // Strategy 1: Find all action bars by known classes
  const actionBars = document.querySelectorAll<HTMLElement>(
    '.feed-shared-social-action-bar, .social-actions-bar, [class*="social-action-bar"], [class*="social-actions-bar"], .feed-shared-social-actions__action-bar'
  )

  actionBars.forEach((bar) => {
    if (bar.querySelector('.replyly-button-container')) return
    const post = findPostContainer(bar)
    injectReplyButton(bar, post)
  })

  // Strategy 2: Query common post containers and locate their action bar
  const postContainers = document.querySelectorAll<HTMLElement>(
    'div[data-view-name="feed-full-update"], div.feed-shared-update-v2, div.occludable-update, div[data-urn*="urn:li:activity:"], div[data-id*="urn:li:activity:"], article'
  )

  postContainers.forEach((post) => {
    if (post.querySelector('.replyly-button-container')) return
    const bar = post.querySelector<HTMLElement>(
      '.feed-shared-social-action-bar, .social-actions-bar, [class*="social-action-bar"], [class*="social-actions-bar"], .feed-shared-social-actions__action-bar'
    )
    if (bar && !bar.querySelector('.replyly-button-container')) {
      injectReplyButton(bar, post)
    }
  })

  // Strategy 3: Anchor on all "Comment" buttons across the entire page
  const commentButtons = document.querySelectorAll<HTMLElement>(
    'button[aria-label*="Comment" i], button.comment-button, button[data-control-name*="comment" i]'
  )

  commentButtons.forEach((btn) => {
    const bar = findExactActionBar(btn)
    if (!bar || bar.querySelector('.replyly-button-container')) return
    const post = findPostContainer(bar)
    injectReplyButton(bar, post)
  })

  // Strategy 4: Fallback for any button whose text contains "comment"
  const allButtons = document.querySelectorAll<HTMLElement>('button')
  allButtons.forEach((btn) => {
    const text = (btn.innerText || '').trim().toLowerCase()
    if (text === 'comment' || text.startsWith('comment\n') || text.includes('comment')) {
      const bar = findExactActionBar(btn)
      if (!bar || bar.querySelector('.replyly-button-container')) return
      const post = findPostContainer(bar)
      injectReplyButton(bar, post)
    }
  })
}

/**
 * Initializes the observer and polling to watch for DOM updates
 */
function startDetection(): void {
  if (globalObserver) return // Already running

  console.log('[Replyly] LinkedIn post detection started on', window.location.href)

  // Inject global ReplyModal root if it doesn't exist
  if (!document.getElementById("replyly-modal-root")) {
    const modalRootContainer = document.createElement("div")
    modalRootContainer.id = "replyly-modal-root"
    document.body.appendChild(modalRootContainer)
    const modalRoot = createRoot(modalRootContainer)
    modalRoot.render(<ReplyModal />)
  }

  // Initial detection attempts to handle immediate and dynamic feed hydration
  detectPosts()
  setTimeout(detectPosts, 150)
  setTimeout(detectPosts, 400)
  setTimeout(detectPosts, 1000)
  setTimeout(detectPosts, 2500)

  // Use MutationObserver for dynamic infinite scroll
  let debounceTimeout: NodeJS.Timeout | null = null
  globalObserver = new MutationObserver(() => {
    if (!isExtensionEnabled) return

    if (debounceTimeout) clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      detectPosts()
    }, 100)
  })

  globalObserver.observe(document.body, {
    childList: true,
    subtree: true
  })

  // Periodic poll to catch virtualized items during fast scrolling
  if (!pollInterval) {
    pollInterval = setInterval(() => {
      if (isExtensionEnabled) {
        detectPosts()
      }
    }, 1500)
  }

  // Scroll listener to catch newly scrolled into view posts
  window.addEventListener("scroll", detectPosts, { passive: true })
}

function stopDetection(): void {
  console.log('[Replyly] LinkedIn post detection paused')
  if (globalObserver) {
    globalObserver.disconnect()
    globalObserver = null
  }
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  window.removeEventListener("scroll", detectPosts)
}

function toggleUI(enabled: boolean): void {
  const buttons = document.querySelectorAll<HTMLElement>('.replyly-button-container')
  buttons.forEach((el) => {
    el.style.display = enabled ? 'inline-flex' : 'none'
  })
}

// Setup initial state and storage listeners
function initialize(): void {
  // Start detection immediately so there is zero delay waiting on storage
  isExtensionEnabled = true
  startDetection()

  // Read stored preference and adjust if user previously disabled it
  chrome.storage.local.get(["isExtensionEnabled"], (result) => {
    if (result.isExtensionEnabled !== undefined) {
      isExtensionEnabled = result.isExtensionEnabled
      toggleUI(isExtensionEnabled)
      if (!isExtensionEnabled) {
        stopDetection()
      }
    }
  })

  // Listen for changes from the popup toggle
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.isExtensionEnabled) {
      isExtensionEnabled = changes.isExtensionEnabled.newValue
      toggleUI(isExtensionEnabled)

      if (isExtensionEnabled) {
        startDetection()
      } else {
        stopDetection()
      }
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}
