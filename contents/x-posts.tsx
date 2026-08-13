import React from "react"
import { createRoot } from "react-dom/client"
import type { PlasmoCSConfig } from "plasmo"
import { ReplyButton } from "../components/ReplyButton"
import { ReplyModal } from "../components/ReplyModal"

export const config: PlasmoCSConfig = {
  matches: ["https://x.com/*", "https://twitter.com/*"]
}

// Global state
let isExtensionEnabled = true
let globalObserver: MutationObserver | null = null

// WeakSet to keep track of posts we have already processed to avoid duplicates
const processedPosts = new WeakSet<HTMLElement>()

/**
 * Extracts visible text content and author from an X post (article element)
 */
function processPost(article: HTMLElement): void {
  // Skip if we've already processed this post
  if (processedPosts.has(article)) {
    return
  }
  
  // Mark as processed immediately
  processedPosts.add(article)

  // Try to find author and text using X's typical data-testids
  const authorElement = article.querySelector('[data-testid="User-Name"]') as HTMLElement | null
  const textElement = article.querySelector('[data-testid="tweetText"]') as HTMLElement | null

  const author = authorElement ? authorElement.innerText.replace(/\n/g, ' ').trim() : 'Unknown Author'
  const text = textElement ? textElement.innerText.trim() : ''

  // Look for the action bar to inject our button
  const actionBar = article.querySelector('div[role="group"]')
  
  if (actionBar) {
    // Create a container for our React component
    const buttonContainer = document.createElement("div")
    buttonContainer.className = "replyly-button-container" // For easily targeting them to hide/show
    
    // Styling to match the native action items (which are usually flex items)
    buttonContainer.style.display = isExtensionEnabled ? "flex" : "none"
    buttonContainer.style.alignItems = "center"
    
    // Insert at the end of the action bar, or near the reply button
    actionBar.appendChild(buttonContainer)

    // Render the React component into our container
    const root = createRoot(buttonContainer)
    root.render(<ReplyButton postText={text} author={author} article={article} />)
  }
}

/**
 * Finds all post articles currently in the DOM and processes them
 */
function detectPosts(): void {
  // X posts are typically wrapped in article elements with data-testid="tweet"
  const posts = document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]')
  
  posts.forEach((post) => {
    processPost(post)
  })
}

/**
 * Initializes the observer to watch for DOM changes and detect new posts
 */
function startDetection(): void {
  if (globalObserver) return // Already running

  console.log('[Replyly] Post detection started')
  
  // Inject the global ReplyModal root if it doesn't exist
  if (!document.getElementById("replyly-modal-root")) {
    const modalRootContainer = document.createElement("div")
    modalRootContainer.id = "replyly-modal-root"
    document.body.appendChild(modalRootContainer)
    const modalRoot = createRoot(modalRootContainer)
    modalRoot.render(<ReplyModal />)
  }

  // Run once initially for posts already in the DOM
  detectPosts()

  // Use MutationObserver to detect dynamically loaded posts when scrolling
  globalObserver = new MutationObserver((mutations: MutationRecord[]) => {
    if (!isExtensionEnabled) return

    let hasNewNodes = false
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true
        break
      }
    }
    
    if (hasNewNodes) {
      detectPosts()
    }
  })

  // Observe the entire document body for any child element additions
  globalObserver.observe(document.body, {
    childList: true,
    subtree: true
  })
}

function stopDetection(): void {
  console.log('[Replyly] Post detection paused')
  if (globalObserver) {
    globalObserver.disconnect()
    globalObserver = null
  }
}

function toggleUI(enabled: boolean): void {
  const buttons = document.querySelectorAll('.replyly-button-container')
  buttons.forEach((el) => {
    (el as HTMLElement).style.display = enabled ? 'flex' : 'none'
  })
}

// Setup initial state and listeners
function initialize(): void {
  // Read initial state
  chrome.storage.local.get(["isExtensionEnabled"], (result) => {
    isExtensionEnabled = result.isExtensionEnabled ?? true
    if (isExtensionEnabled) {
      startDetection()
    }
  })

  // Listen for changes from the popup
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

// Start when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}
