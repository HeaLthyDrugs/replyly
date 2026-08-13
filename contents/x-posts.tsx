import React from "react"
import { createRoot } from "react-dom/client"
import type { PlasmoCSConfig } from "plasmo"
import { ReplyButton } from "../components/ReplyButton"

export const config: PlasmoCSConfig = {
  matches: ["https://x.com/*", "https://twitter.com/*"]
}

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
    // Styling to match the native action items (which are usually flex items)
    buttonContainer.style.display = "flex"
    buttonContainer.style.alignItems = "center"
    
    // Insert at the end of the action bar, or near the reply button
    actionBar.appendChild(buttonContainer)

    // Render the React component into our container
    const root = createRoot(buttonContainer)
    root.render(<ReplyButton postText={text} author={author} />)
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
function initPostDetection(): void {
  console.log('[Replyly] Post detection initialized with UI injection')
  
  // Run once initially for posts already in the DOM
  detectPosts()

  // Use MutationObserver to detect dynamically loaded posts when scrolling
  // or when navigating between pages in the SPA
  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    let hasNewNodes = false
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true
        break
      }
    }
    
    // If nodes were added, run detection again
    if (hasNewNodes) {
      detectPosts()
    }
  })

  // Observe the entire document body for any child element additions
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// Start detection when the script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPostDetection)
} else {
  initPostDetection()
}
