// Microsoft Copilot Conversation History Extractor
// Extracts current conversation from copilot.microsoft.com and bing.com/chat DOM and saves to extension
//
// IMPORTANT: Requires conversation-extractor-utils.js to be loaded first

(function() {
  'use strict';

  // Import shared utilities from global namespace
  const {
    extractMarkdownFromElement,
    formatMessagesAsText,
    generateConversationId,
    checkForDuplicate,
    showDuplicateWarning,
    showNotification,
    setupKeyboardShortcut
  } = window.ConversationExtractorUtils;

  // ==========================================
  // DOM Selector Constants (with fallbacks)
  // ==========================================

  // Share button selectors - used for button placement and language detection
  const SHARE_BUTTON_SELECTORS = [
    'button[title="Share"]',
    'button[title^="Share conversation"]',
    'button[aria-label="Share"]',
    'button[aria-label^="Share conversation"]',
    'button[data-testid="share-button"]'
  ];

  // For language detection fallback
  const SHARE_BUTTON_SELECTOR = 'button[title="Share"]';

  // Message container selectors - ordered by specificity
  const MESSAGE_CONTAINER_SELECTORS = [
    '[data-content="ai-message"]',
    '[data-content="user-message"]',
    '[data-message-id]',
    '.response-message-group',
    '.user-message',
    '[data-testid*="message"]',
    '[data-testid*="turn"]',
    '[role="article"]'
  ];

  // User message selectors for role detection
  const USER_MESSAGE_INDICATORS = [
    '[data-content="user-message"]',
    '.user-message',
    '[data-testid*="user"]',
    '[data-author="user"]',
    '[data-message-role="user"]',
    '[data-sender="user"]'
  ];

  // Assistant message selectors for role detection
  const ASSISTANT_MESSAGE_INDICATORS = [
    '[data-content="ai-message"]',
    '.response-message-group',
    '[data-testid*="assistant"]',
    '[data-testid*="bot"]',
    '[data-author="assistant"]',
    '[data-author="bot"]',
    '[data-message-role="assistant"]',
    '[data-sender="assistant"]'
  ];

  // Content element selectors within a message container
  const CONTENT_ELEMENT_SELECTORS = [
    '[class*="markdown"]',
    '[class*="message-content"]',
    '[data-content]',
    '.prose',
    '[class*="rendered"]',
    'p',
    'div[class*="text"]'
  ];

  // Title selectors
  const TITLE_SELECTORS = [
    'p.truncate[title]',
    'h1',
    '[data-testid="conversation-title"]',
    '.conversation-title',
    'header h1',
    '[role="heading"]',
    'nav [aria-current="page"]',
    'nav .active'
  ];

  // Conversation list selectors (for detecting conversation navigation)
  const CONVERSATION_LIST_SELECTORS = [
    '.conversation-list',
    'nav[aria-label="Chat history"]',
    'nav[aria-label*="conversation"]',
    '[data-testid="conversation-list"]'
  ];

  let saveButton = null;
  let currentObserver = null;

  // ==========================================
  // Initialization
  // ==========================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Check for Copilot conversation pages: /chats/* or /pages/*
    const isCopilotConversation =
      (window.location.href.includes('copilot.microsoft.com/chats/') ||
       window.location.href.includes('copilot.microsoft.com/pages/') ||
       (window.location.hostname.includes('bing.com') && window.location.pathname.startsWith('/chat')));

    if (!isCopilotConversation) {
      return;
    }

    // Wait for Copilot to fully render, then try inserting button
    waitForDOMReady(() => {
      insertSaveButton();
      observeForShareButton();
    });
  }

  // Wait for critical DOM elements to appear before proceeding
  function waitForDOMReady(callback) {
    let attempts = 0;
    const maxAttempts = 20;
    const interval = 500;

    function check() {
      attempts++;
      // Check if share button or message containers exist
      const hasShareButton = !!findShareButton();
      const hasMessages = detectConversation();

      if (hasShareButton || hasMessages || attempts >= maxAttempts) {
        callback();
        return;
      }
      setTimeout(check, interval);
    }

    // Initial delay for SPA rendering
    setTimeout(check, 1000);
  }

  // ==========================================
  // Share Button Detection
  // ==========================================

  function findShareButton() {
    // Try each selector
    for (const selector of SHARE_BUTTON_SELECTORS) {
      const btn = document.querySelector(selector);
      if (btn) return btn;
    }

    // Try partial match for /chats/ (title starts with "Share conversation")
    const allButtons = Array.from(document.querySelectorAll('button[title]'));
    const shareBtn = allButtons.find(btn => btn.title.startsWith('Share conversation'));
    if (shareBtn) return shareBtn;

    // Fallback: look for button with Share text and the specific SVG icon
    const svgShareBtn = allButtons.find(btn =>
      btn.textContent.includes('Share') &&
      btn.querySelector('svg')
    );

    return svgShareBtn || null;
  }

  // ==========================================
  // Save Button Creation & Insertion
  // ==========================================

  function createSaveButton(shareButton) {
    const { text, tooltip } = window.LanguageDetector.getSaveButtonText(SHARE_BUTTON_SELECTOR);

    const button = document.createElement('button');
    button.id = 'insidebar-save-conversation';
    button.setAttribute('type', 'button');
    button.setAttribute('data-spatial-navigation-autofocus', 'false');

    const isChatsPage = window.location.href.includes('/chats/');

    if (isChatsPage && shareButton) {
      button.className = 'relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-black/30 dark:active:bg-black/20 text-sm justify-start min-h-9 min-w-9 px-2.5 py-1 gap-x-1.5 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900';
      button.setAttribute('aria-label', text);
      button.title = `${text} conversation`;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="me-1 size-4">
          <path d="M13.75,3.00011 C13.3358,3.00011 13.0001,3.33596 13,3.75011 C13,4.16432 13.3358,4.50011 13.75,4.50011 L17.25,4.50011 C18.49259,4.50011 19.49992,5.50753 19.5,6.75011 L19.5,17.2501 L19.48828,17.4806 C19.37286,18.6149 18.41483,19.50011 17.25,19.50011 L6.75,19.50011 C5.5074,19.50011 4.5,18.4927 4.5,17.2501 L4.5,15.2501 C4.4999,14.836 4.1642,14.50011 3.75,14.50011 C3.3358,14.50011 3,14.836 3,15.2501 L3,17.2501 C3,19.3212 4.6789,21.00011 6.75,21.00011 L17.25,21.00011 C19.25622,21.00011 20.89449,19.4247 20.99512,17.4435 L21,17.2501 L21,6.75011 C21,4.6791 19.32102,3.00011 17.25,3.00011 L13.75,3.00011 Z M16.7820044,9.9365879 C16.9043344,10.2026879 16.8602444,10.5159879 16.6697044,10.7383879 L10.6697044,17.7383879 C10.5322444,17.8986879 10.3329144,17.9938879 10.1218544,18.0000879 C9.91087436,18.0060879 9.70686436,17.9224879 9.56032436,17.7705879 L2.81037436,10.7705879 C2.60167436,10.5540879 2.54247436,10.2338879 2.65997436,9.9570879 C2.77757436,9.6802879 3.04947436,9.5000879 3.35037436,9.5000879 L6.32597436,9.5000879 C6.26237436,8.4857879 6.05317436,7.5295879 5.55737436,6.5605879 C4.97597436,5.4241879 3.97587436,4.2165079 2.25467436,2.8711779 L1.90017436,2.5996979 C1.64217436,2.4059679 1.53637436,2.0689179 1.63847436,1.7627879 C1.74057436,1.4565479 2.02757436,1.2500879 2.35037436,1.2500879 C5.20767436,1.2500879 7.93947436,1.9366779 9.97829436,3.4180579 C11.8715944,4.7938879 13.1249344,6.8288879 13.3220444,9.5000879 L16.1003644,9.5000879 L16.2087644,9.5078879 C16.4575144,9.5441879 16.6749444,9.7037879 16.7820044,9.9365879 Z M12.64609,10.788175 C12.23188,10.788175 11.89609,10.452375 11.89609,10.038175 C11.89609,7.481475 10.82612,5.643175 9.14316,4.420015 C7.935,3.542045 6.386,2.966115 4.65,2.703215 C5.6974,3.703515 6.4351,4.680155 6.9391,5.665175 C7.6979,7.148275 7.8961,8.589175 7.8961,10.038175 C7.8961,10.237075 7.817,10.427775 7.6764,10.568475 C7.5357,10.709075 7.345,10.788175 7.1461,10.788175 L5.1617,10.788175 L10.11387,15.922975 L14.51621,10.788175 L12.64609,10.788175 Z"></path>
        </svg>${text}
      `;
    } else {
      button.className = 'relative flex items-center text-foreground-800 fill-foreground-800 active:text-foreground-600 active:fill-foreground-600 dark:active:text-foreground-650 dark:active:fill-foreground-650 bg-transparent safe-hover:bg-black/5 active:bg-black/3 dark:safe-hover:bg-white/8 dark:active:bg-white/5 text-sm justify-center min-h-9 min-w-9 py-1 gap-x-1.5 rounded-xl after:rounded-xl after:absolute after:inset-0 after:pointer-events-none after:border after:border-transparent after:contrast-more:border-2 outline-2 outline-offset-1 focus-visible:z-[1] focus-visible:outline focus-visible:outline-stroke-900 shrink-0 px-1';
      button.setAttribute('aria-label', text);
      button.title = text;
      button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="size-5">
          <path d="M13.75,3.00011 C13.3358,3.00011 13.0001,3.33596 13,3.75011 C13,4.16432 13.3358,4.50011 13.75,4.50011 L17.25,4.50011 C18.49259,4.50011 19.49992,5.50753 19.5,6.75011 L19.5,17.2501 L19.48828,17.4806 C19.37286,18.6149 18.41483,19.50011 17.25,19.50011 L6.75,19.50011 C5.5074,19.50011 4.5,18.4927 4.5,17.2501 L4.5,15.2501 C4.4999,14.836 4.1642,14.50011 3.75,14.50011 C3.3358,14.50011 3,14.836 3,15.2501 L3,17.2501 C3,19.3212 4.6789,21.00011 6.75,21.00011 L17.25,21.00011 C19.25622,21.00011 20.89449,19.4247 20.99512,17.4435 L21,17.2501 L21,6.75011 C21,4.6791 19.32102,3.00011 17.25,3.00011 L13.75,3.00011 Z M16.7820044,9.9365879 C16.9043344,10.2026879 16.8602444,10.5159879 16.6697044,10.7383879 L10.6697044,17.7383879 C10.5322444,17.8986879 10.3329144,17.9938879 10.1218544,18.0000879 C9.91087436,18.0060879 9.70686436,17.9224879 9.56032436,17.7705879 L2.81037436,10.7705879 C2.60167436,10.5540879 2.54247436,10.2338879 2.65997436,9.9570879 C2.77757436,9.6802879 3.04947436,9.5000879 3.35037436,9.5000879 L6.32597436,9.5000879 C6.26237436,8.4857879 6.05317436,7.5295879 5.55737436,6.5605879 C4.97597436,5.4241879 3.97587436,4.2165079 2.25467436,2.8711779 L1.90017436,2.5996979 C1.64217436,2.4059679 1.53637436,2.0689179 1.63847436,1.7627879 C1.74057436,1.4565479 2.02757436,1.2500879 2.35037436,1.2500879 C5.20767436,1.2500879 7.93947436,1.9366779 9.97829436,3.4180579 C11.8715944,4.7938879 13.1249344,6.8288879 13.3220444,9.5000879 L16.1003644,9.5000879 L16.2087644,9.5078879 C16.4575144,9.5441879 16.6749444,9.7037879 16.7820044,9.9365879 Z M12.64609,10.788175 C12.23188,10.788175 11.89609,10.452375 11.89609,10.038175 C11.89609,7.481475 10.82612,5.643175 9.14316,4.420015 C7.935,3.542045 6.386,2.966115 4.65,2.703215 C5.6974,3.703515 6.4351,4.680155 6.9391,5.665175 C7.6979,7.148275 7.8961,8.589175 7.8961,10.038175 C7.8961,10.237075 7.817,10.427775 7.6764,10.568475 C7.5357,10.709075 7.345,10.788175 7.1461,10.788175 L5.1617,10.788175 L10.11387,15.922975 L14.51621,10.788175 L12.64609,10.788175 Z"></path>
        </svg>
        <span class="mx-1.5 hidden sm:inline">${text}</span>
      `;
    }

    button.addEventListener('click', handleSaveClick);
    return button;
  }

  function insertSaveButton() {
    if (document.getElementById('insidebar-save-conversation')) {
      return;
    }

    const shareButton = findShareButton();
    if (!shareButton) {
      return;
    }

    const hasConversation = detectConversation();
    if (!hasConversation) {
      return;
    }

    saveButton = createSaveButton(shareButton);
    if (shareButton.parentElement) {
      shareButton.parentElement.insertBefore(saveButton, shareButton.nextSibling);
    }
  }

  // ==========================================
  // Conversation Detection
  // ==========================================

  function detectConversation() {
    // For /pages/, check if there's content in the page editor
    if (window.location.href.includes('/pages/')) {
      const hasPageContent = document.querySelector('[contenteditable="true"]') ||
                            document.querySelector('[role="textbox"]') ||
                            document.querySelector('textarea');
      return !!hasPageContent;
    }

    // For /chats/, look for messages
    const messages = getMessages();
    return messages && messages.length > 0;
  }

  // ==========================================
  // DOM Observer
  // ==========================================

  function observeForShareButton() {
    // Disconnect any existing observer before creating a new one
    if (currentObserver) {
      currentObserver.disconnect();
      currentObserver = null;
    }

    let debounceTimer = null;

    const handleMutations = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        insertSaveButton();

        const existingButton = document.getElementById('insidebar-save-conversation');
        if (existingButton && !detectConversation()) {
          existingButton.remove();
          saveButton = null;
        }
      }, 250);
    };

    currentObserver = new MutationObserver(handleMutations);

    currentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ==========================================
  // Title Extraction
  // ==========================================

  function getConversationTitle() {
    for (const selector of TITLE_SELECTORS) {
      try {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const title = element.textContent.trim();
          // Skip generic titles
          if (title !== 'Copilot' && title !== 'Microsoft Copilot' && title.length > 1) {
            return title;
          }
        }
      } catch (error) {
        // Skip invalid selectors gracefully
      }
    }

    // For title attribute on truncated elements
    const truncatedTitle = document.querySelector('p.truncate[title]');
    if (truncatedTitle) {
      const titleAttr = truncatedTitle.getAttribute('title');
      if (titleAttr && titleAttr.trim()) {
        return titleAttr.trim();
      }
    }

    // Fallback: Use first user message
    const messages = getMessages();
    if (messages && messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content;
        return content.substring(0, 50) + (content.length > 50 ? '...' : '');
      }
    }

    return 'Untitled Conversation';
  }

  // ==========================================
  // Message Extraction
  // ==========================================

  function getMessages() {
    const messages = [];

    // Strategy 1: Use data-content attributes (most reliable for Copilot)
    const userMessages = document.querySelectorAll('[data-content="user-message"]');
    const aiMessages = document.querySelectorAll('[data-content="ai-message"]');

    if (userMessages.length > 0 || aiMessages.length > 0) {
      return extractMessagesFromDataContent(userMessages, aiMessages);
    }

    // Strategy 2: Use data-message-id containers
    let messageContainers = document.querySelectorAll('[data-message-id]');

    // Strategy 3: Response message groups
    if (!messageContainers || messageContainers.length === 0) {
      messageContainers = document.querySelectorAll('.response-message-group, .user-message');
    }

    // Strategy 4: Generic message patterns
    if (!messageContainers || messageContainers.length === 0) {
      messageContainers = document.querySelectorAll('[data-testid*="message"], [data-testid*="turn"]');
    }

    // Strategy 5: Role-based containers
    if (!messageContainers || messageContainers.length === 0) {
      const conversationContainer = document.querySelector('main') || document.body;
      messageContainers = conversationContainer.querySelectorAll('[role="article"], [role="region"] > div');
    }

    // Strategy 6: Broad class-based matching
    if (!messageContainers || messageContainers.length === 0) {
      messageContainers = document.querySelectorAll('[class*="message"]');
    }

    if (!messageContainers || messageContainers.length === 0) {
      return messages;
    }

    messageContainers.forEach(container => {
      try {
        const message = extractMessageFromContainer(container);
        if (message) {
          messages.push(message);
        }
      } catch (error) {
        // Skip problematic containers
      }
    });

    return messages;
  }

  // Extract messages using data-content attribute approach
  function extractMessagesFromDataContent(userNodes, aiNodes) {
    const allNodes = [];

    userNodes.forEach(node => {
      allNodes.push({ node, role: 'user' });
    });

    aiNodes.forEach(node => {
      allNodes.push({ node, role: 'assistant' });
    });

    // Sort by DOM position
    allNodes.sort((a, b) => {
      const position = a.node.compareDocumentPosition(b.node);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    const messages = [];
    for (const { node, role } of allNodes) {
      const content = extractContentWithFormatting(node);
      if (content && content.trim()) {
        messages.push({
          role,
          content: content.trim()
        });
      }
    }

    return messages;
  }

  function extractMessageFromContainer(container) {
    let role = 'unknown';

    // Try data attributes for role detection
    const roleAttr = container.getAttribute('data-message-role') ||
                    container.getAttribute('data-author') ||
                    container.getAttribute('data-sender') ||
                    container.getAttribute('data-content') ||
                    container.getAttribute('role');

    if (roleAttr) {
      const roleLower = roleAttr.toLowerCase();
      if (roleLower.includes('user') || roleLower.includes('human')) {
        role = 'user';
      } else if (roleLower.includes('assistant') || roleLower.includes('bot') ||
                 roleLower.includes('copilot') || roleLower.includes('ai')) {
        role = 'assistant';
      }
    }

    // Check if container matches known user/assistant selectors
    if (role === 'unknown') {
      for (const selector of USER_MESSAGE_INDICATORS) {
        try {
          if (container.matches(selector) || container.querySelector(selector)) {
            role = 'user';
            break;
          }
        } catch (e) { /* skip */ }
      }
    }

    if (role === 'unknown') {
      for (const selector of ASSISTANT_MESSAGE_INDICATORS) {
        try {
          if (container.matches(selector) || container.querySelector(selector)) {
            role = 'assistant';
            break;
          }
        } catch (e) { /* skip */ }
      }
    }

    // Fallback: class-based detection
    if (role === 'unknown') {
      const classes = (container.className || '').toLowerCase();
      if (classes.includes('user')) {
        role = 'user';
      } else if (classes.includes('assistant') || classes.includes('bot') ||
                 classes.includes('copilot') || classes.includes('response')) {
        role = 'assistant';
      }
    }

    // Find the content element within the container
    let contentElement = null;
    for (const selector of CONTENT_ELEMENT_SELECTORS) {
      try {
        contentElement = container.querySelector(selector);
        if (contentElement) break;
      } catch (e) { /* skip */ }
    }

    if (!contentElement) {
      contentElement = container;
    }

    const content = extractContentWithFormatting(contentElement);

    if (!content || !content.trim()) return null;

    return {
      role: role !== 'unknown' ? role : 'assistant',
      content: content.trim()
    };
  }

  function extractContentWithFormatting(element) {
    if (!element) return '';
    const clone = element.cloneNode(true);
    return extractMarkdownFromElement(clone);
  }

  // ==========================================
  // Conversation Extraction
  // ==========================================

  function extractConversation() {
    try {
      const title = getConversationTitle();

      // For /pages/, extract the page content instead of messages
      if (window.location.href.includes('/pages/')) {
        const pageContent = extractPageContent();
        if (!pageContent || !pageContent.trim()) {
          throw new Error('No content found on page');
        }

        return {
          title,
          content: pageContent,
          messages: [{
            role: 'assistant',
            content: pageContent
          }],
          timestamp: Date.now(),
          url: window.location.href,
          provider: 'Microsoft Copilot'
        };
      }

      // For /chats/, extract messages
      const messages = getMessages();
      if (!messages || messages.length === 0) {
        throw new Error('No messages found in conversation');
      }

      const content = formatMessagesAsText(messages);

      return {
        title,
        content,
        messages,
        timestamp: Date.now(),
        url: window.location.href,
        provider: 'Microsoft Copilot'
      };
    } catch (error) {
      console.error('[Copilot Extractor] Error extracting conversation:', error);
      throw error;
    }
  }

  function extractPageContent() {
    const contentArea = document.querySelector('[contenteditable="true"]') ||
                       document.querySelector('[role="textbox"]') ||
                       document.querySelector('main');

    if (!contentArea) {
      return '';
    }

    const clone = contentArea.cloneNode(true);
    return extractMarkdownFromElement(clone);
  }

  // ==========================================
  // Save Handler
  // ==========================================

  async function handleSaveClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!saveButton) return;

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      showNotification('Extension API not available. Try reloading the page.', 'error');
      return;
    }

    saveButton.disabled = true;
    const originalHTML = saveButton.innerHTML;
    saveButton.innerHTML = '<div class="flex items-center gap-2"><span>Saving...</span></div>';

    try {
      const conversation = extractConversation();

      const conversationId = generateConversationId(conversation.url, conversation.title);
      conversation.conversationId = conversationId;

      const duplicateCheck = await checkForDuplicate(conversationId);

      if (duplicateCheck.isDuplicate) {
        const existingContent = (duplicateCheck.existingConversation.content || '').trim();
        const newContent = (conversation.content || '').trim();

        if (existingContent === newContent) {
          saveButton.disabled = false;
          saveButton.innerHTML = originalHTML;
          return;
        }

        conversation.overwriteId = duplicateCheck.existingConversation.id;
        conversation.timestamp = duplicateCheck.existingConversation.timestamp;
      }

      chrome.runtime.sendMessage({
        action: 'saveConversationFromPage',
        payload: conversation
      }, (response) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message;
          if (errorMsg.includes('Extension context invalidated')) {
            showNotification('Extension was reloaded. Please reload this page and try saving again.', 'error');
          } else {
            showNotification('Failed to save: ' + errorMsg, 'error');
          }
          saveButton.disabled = false;
          saveButton.innerHTML = originalHTML;
          return;
        }

        if (response && response.success) {
          // Success notification shown in sidebar
        } else {
          const errorMsg = response?.error || 'Unknown error';
          showNotification('Failed to save: ' + errorMsg, 'error');
        }

        saveButton.disabled = false;
        saveButton.innerHTML = originalHTML;
      });
    } catch (error) {
      console.error('[Copilot Extractor] Error during extraction:', error);
      showNotification('Failed to extract conversation: ' + error.message, 'error');

      saveButton.disabled = false;
      saveButton.innerHTML = originalHTML;
    }
  }

  // Setup keyboard shortcut (Ctrl+Shift+S or Cmd+Shift+S)
  setupKeyboardShortcut(handleSaveClick, detectConversation);

})();
