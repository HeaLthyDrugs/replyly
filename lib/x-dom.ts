export async function openReplyComposer(article: HTMLElement, text: string): Promise<void> {
  // 1. Find the native Reply button within the article
  // Typically, X's reply button has data-testid="reply"
  const replyButton = article.querySelector('[data-testid="reply"]') as HTMLElement
  
  if (!replyButton) {
    throw new Error("Could not find the native Reply button for this post. It may be unavailable.")
  }

  // 2. Click the native reply button
  replyButton.click()

  // 3. Wait for the composer to appear
  const textbox = await waitForComposer()
  
  if (!textbox) {
    throw new Error("The reply composer did not open in time.")
  }

  // 4. Insert the text
  // Focus the textbox first
  textbox.focus()
  
  // Wait a tiny bit for React/Lexical to handle the focus state
  await new Promise(resolve => setTimeout(resolve, 50))

  // Use execCommand to insert text. This is the most reliable way to interact
  // with rich text editors (like Draft.js/Lexical) from a content script
  // because it correctly triggers their internal state updates.
  const success = document.execCommand('insertText', false, text)
  
  if (!success) {
    // Fallback: try pasting via ClipboardEvent if execCommand is blocked
    const dataTransfer = new DataTransfer()
    dataTransfer.setData('text/plain', text)
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    })
    textbox.dispatchEvent(pasteEvent)
  }
}

function waitForComposer(): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    // Check if it's already open (unlikely immediately after click, but possible)
    const getTarget = () => document.querySelector('[data-testid="tweetTextarea_0"]') as HTMLElement
    
    const existing = getTarget()
    if (existing) {
      return resolve(existing)
    }

    let attempts = 0
    const maxAttempts = 30 // 3 seconds total

    const interval = setInterval(() => {
      attempts++
      const textbox = getTarget()
      
      if (textbox) {
        clearInterval(interval)
        resolve(textbox)
      } else if (attempts >= maxAttempts) {
        clearInterval(interval)
        resolve(null)
      }
    }, 100)
  })
}
