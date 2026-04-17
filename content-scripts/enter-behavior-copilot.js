// Microsoft Copilot Enter/Shift+Enter behavior swap
// Supports customizable key combinations via settings
//
// IMPORTANT: Copilot's native behavior is OPPOSITE of ChatGPT/Claude:
// - Enter (no shift) = Send message
// - Shift+Enter = Newline
// So we must ALWAYS preventDefault and handle both actions ourselves

// Helper: Create a synthetic Enter KeyboardEvent with specified modifiers
function createEnterEvent(modifiers = {}) {
  return new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
    shiftKey: modifiers.shift || false,
    ctrlKey: modifiers.ctrl || false,
    metaKey: modifiers.meta || false,
    altKey: modifiers.alt || false
  });
}

// Helper: Find Copilot's Send button with multiple fallback selectors
function findSendButton() {
  // Primary: data-testid selectors
  const sendSelectors = [
    'button[data-testid="submit-button"]',
    'button[data-testid="send-button"]',
    'button[aria-label="Submit"]',
    'button[aria-label="Submit message"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button[title="Submit"]',
    'button[title*="Send"]'
  ];

  for (const selector of sendSelectors) {
    const btn = document.querySelector(selector);
    if (btn) return btn;
  }

  // Last resort: search all buttons for submit/send patterns
  return Array.from(document.querySelectorAll('button')).find(btn => {
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    const title = (btn.getAttribute('title') || '').toLowerCase();
    const testId = (btn.getAttribute('data-testid') || '').toLowerCase();
    return ariaLabel.includes('submit') || ariaLabel.includes('send') ||
           title.includes('submit') || title.includes('send') ||
           testId.includes('submit') || testId.includes('send');
  });
}

// Helper: Check if an element is a Copilot input area
function isCopilotInputElement(element) {
  if (!element || !element.offsetParent) return false;

  // Check for textarea inputs
  if (element.tagName === "TEXTAREA") {
    // Known Copilot textarea identifiers
    if (element.id === "userInput") return true;
    if (element.getAttribute('data-testid') === 'composer-input') return true;
    if (element.getAttribute('data-testid') === 'chat-input') return true;
    if (element.id === 'searchbox') return true;
    if (element.classList.contains('text-input')) return true;

    // Generic: any visible textarea with a placeholder mentioning message/ask/copilot
    const placeholder = (element.placeholder || '').toLowerCase();
    if (placeholder.includes('message') || placeholder.includes('ask') ||
        placeholder.includes('copilot') || placeholder.includes('question') ||
        placeholder.includes('edit')) {
      return true;
    }

    // Any textarea within a known Copilot form container
    const parent = element.closest('form, [role="search"], [data-testid*="composer"], [data-testid*="chat"]');
    if (parent) return true;
  }

  // Check for contenteditable inputs (some Copilot versions)
  if (element.contentEditable === "true" || element.getAttribute('contenteditable') === 'true') {
    const role = element.getAttribute('role');
    if (role === 'textbox') return true;
  }

  return false;
}

function handleEnterSwap(event) {
  // Only handle trusted Enter key events
  // Skip if IME composition is in progress (e.g., Chinese/Japanese input method)
  if (!event.isTrusted || event.code !== "Enter" || event.isComposing) {
    return;
  }

  if (!enterKeyConfig || !enterKeyConfig.enabled) {
    return;
  }

  // Get the currently focused element
  const activeElement = document.activeElement;

  if (!isCopilotInputElement(activeElement)) {
    return;
  }

  const isTextarea = activeElement.tagName === "TEXTAREA";
  const isContentEditable = activeElement.contentEditable === "true";

  // Check if this matches newline action
  if (matchesModifiers(event, enterKeyConfig.newlineModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (isTextarea) {
      // Insert a newline character at cursor position via textarea manipulation
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const value = activeElement.value;

      // Use native setter to bypass React's control
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      );
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(activeElement, value.substring(0, start) + '\n' + value.substring(end));
      } else {
        activeElement.value = value.substring(0, start) + '\n' + value.substring(end);
      }

      activeElement.selectionStart = activeElement.selectionEnd = start + 1;

      // Trigger input event so Copilot knows the content changed
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (isContentEditable) {
      // For contenteditable: insert a line break node
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement('br');
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }
  // Check if this matches send action
  else if (matchesModifiers(event, enterKeyConfig.sendModifiers)) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Find and click the Send button
    const sendButton = findSendButton();

    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    } else {
      // Fallback: dispatch a plain Enter event (Copilot native send)
      const newEvent = createEnterEvent({});
      activeElement.dispatchEvent(newEvent);
    }
  }
  else {
    // Block any other Enter combinations to avoid conflicts
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

// Apply the setting on initial load
applyEnterSwapSetting();
