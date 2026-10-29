/**
 * HTML utility functions for safe template rendering
 */
import { sanitizeUrl } from './url-validator.js';

// Shared by history list and detail view. Imported URLs must be HTTP(S).
export function renderExternalLink(url, label, className = '', title = '') {
  const href = sanitizeUrl(url);
  return href
    ? html`<a href="${href}" target="_blank" rel="noopener noreferrer" class="${className}" title="${title}">${label}</a>`
    : html`<span class="${className}">${label}</span>`;
}

/**
 * Escapes HTML text and quoted attribute values to prevent markup injection.
 * URL protocols and unquoted attributes require separate validation.
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML-safe text
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Tagged template literal for safe HTML rendering with automatic escaping
 * Values are automatically escaped unless explicitly marked as safe
 *
 * @example
 * const name = '<script>alert("xss")</script>';
 * const safeHtml = html`<div>Hello ${name}</div>`;
 * // Result: <div>Hello &lt;script&gt;alert("xss")&lt;/script&gt;</div>
 *
 * @param {TemplateStringsArray} strings - Template string parts
 * @param {...any} values - Values to interpolate
 * @returns {string} - Safe HTML string
 */
export function html(strings, ...values) {
  return strings.reduce((result, string, i) => {
    const value = values[i];

    if (value === undefined || value === null) {
      return result + string;
    }

    // If value is marked as safe (SafeHtml), use it directly
    if (value && value.__isSafeHtml) {
      return result + string + value.html;
    }

    // Otherwise, escape the value
    const escaped = escapeHtml(String(value));
    return result + string + escaped;
  }, '');
}

/**
 * Marks a string as safe HTML (won't be escaped)
 * USE WITH EXTREME CAUTION - only for trusted, already-sanitized HTML
 *
 * @param {string} htmlString - Pre-sanitized HTML string
 * @returns {{__isSafeHtml: boolean, html: string}} - Safe HTML object
 */
export function unsafeHtml(htmlString) {
  return {
    __isSafeHtml: true,
    html: htmlString,
  };
}

/**
 * Renders an array using a template function, escaping each item
 * @param {Array} items - Array of items to render
 * @param {Function} templateFn - Template function for each item
 * @param {string} separator - Separator between items (default: '')
 * @returns {string} - Rendered HTML
 */
export function renderList(items, templateFn, separator = '') {
  if (!Array.isArray(items)) {
    return '';
  }

  return items.map(templateFn).join(separator);
}

// Render saved Markdown as inert document content, with a small attribute allowlist.
export function sanitizeHtml(html) {
  const temp = document.createElement('template');
  temp.innerHTML = html;
  const allowedTags = new Set([
    'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
    'ul', 'ol', 'li', 'pre', 'code', 'strong', 'em', 'b', 'i', 's', 'del',
    'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'div', 'span', 'details', 'summary', 'sup', 'sub', 'kbd', 'input',
  ]);
  temp.content.querySelectorAll(
    'script, style, iframe, object, embed, form, meta, link, base, svg, math, template'
  ).forEach(el => el.remove());

  temp.content.querySelectorAll('*').forEach(el => {
    const tag = el.localName;
    if (!allowedTags.has(tag) || (tag === 'input' && el.getAttribute('type') !== 'checkbox')) {
      el.replaceWith(...el.childNodes);
      return;
    }

    const attributes = Object.fromEntries(Array.from(el.attributes, attr => [attr.name, attr.value]));
    Array.from(el.attributes).forEach(attr => el.removeAttribute(attr.name));
    if (attributes.title) el.setAttribute('title', attributes.title);
    if ((tag === 'th' || tag === 'td') && ['left', 'center', 'right'].includes(attributes.align)) {
      el.setAttribute('align', attributes.align);
    }

    if (tag === 'a' || tag === 'img') {
      const attr = tag === 'a' ? 'href' : 'src';
      const value = attributes[attr]?.trim();
      if (tag === 'a' && value?.startsWith('#')) {
        el.setAttribute(attr, value);
      } else if (value) {
        try {
          const url = new URL(value);
          const protocols = tag === 'a' ? ['http:', 'https:', 'mailto:'] : ['http:', 'https:'];
          if (protocols.includes(url.protocol)) el.setAttribute(attr, url.href);
        } catch (_) { /* Invalid URLs remain inert. */ }
      }
      if (tag === 'a') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      } else {
        el.setAttribute('alt', attributes.alt || '');
        el.setAttribute('referrerpolicy', 'no-referrer');
      }
    }
    if (tag === 'code' && /^language-[\w-]+$/.test(attributes.class || '')) {
      el.setAttribute('class', attributes.class);
    }
    if (tag === 'input') {
      el.setAttribute('type', 'checkbox');
      el.setAttribute('disabled', '');
      if (Object.hasOwn(attributes, 'checked')) el.setAttribute('checked', '');
    }
    if (tag === 'ol' && /^-?\d+$/.test(attributes.start || '')) el.setAttribute('start', attributes.start);
  });
  return temp.innerHTML;
}
