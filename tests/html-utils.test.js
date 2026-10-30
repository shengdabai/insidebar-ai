// Tests for HTML utility functions - Critical for XSS protection
import { describe, it, expect } from 'vitest';
import { escapeHtml, html, unsafeHtml, renderList, renderExternalLink } from '../modules/html-utils.js';

describe('history external links', () => {
  it.each(['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,unsafe', '', null])(
    'renders %j as inert text', (url) => {
      const doc = new DOMParser().parseFromString(renderExternalLink(url, 'Date'), 'text/html');
      expect(doc.querySelector('a')).toBeNull();
      expect(doc.body.textContent).toBe('Date');
    }
  );

  it('escapes link text and attributes while preserving an ordinary URL', () => {
    const doc = new DOMParser().parseFromString(renderExternalLink('https://example.invalid/chat',
      '<unsafe>', 'date', '" onclick="unsafe()'), 'text/html');
    const link = doc.querySelector('a');
    expect(link.getAttribute('href')).toBe('https://example.invalid/chat');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).toBe('<unsafe>');
    expect(link.hasAttribute('onclick')).toBe(false);
  });
});

describe('html-utils module', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape both quote types for quoted attribute values', () => {
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('should handle null and undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should convert non-strings to strings', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(true)).toBe('true');
    });

    it('should escape HTML tags and ampersands', () => {
      expect(escapeHtml('<div class="test" data-value=\'123\'>A & B</div>')).toBe(
        '&lt;div class=&quot;test&quot; data-value=&#39;123&#39;&gt;A &amp; B&lt;/div&gt;'
      );
    });
  });

  describe('html tagged template', () => {
    it('should escape interpolated values by default', () => {
      const userInput = '<script>alert("xss")</script>';
      const result = html`<div>${userInput}</div>`;
      expect(result).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
    });

    it('should handle multiple interpolations', () => {
      const name = '<script>evil</script>';
      const message = 'Hello & goodbye';
      const result = html`<div>${name}: ${message}</div>`;
      expect(result).toBe(
        '<div>&lt;script&gt;evil&lt;/script&gt;: Hello &amp; goodbye</div>'
      );
    });

    it('should handle null and undefined values', () => {
      const result = html`<div>${null} ${undefined}</div>`;
      expect(result).toBe('<div> </div>');
    });

    it('should not escape safe HTML marked with unsafeHtml', () => {
      const safeContent = unsafeHtml('<strong>Bold</strong>');
      const result = html`<div>${safeContent}</div>`;
      expect(result).toBe('<div><strong>Bold</strong></div>');
    });

    it('should escape regular values but not safe HTML', () => {
      const unsafe = '<script>bad</script>';
      const safe = unsafeHtml('<em>emphasized</em>');
      const result = html`<div>${unsafe} ${safe}</div>`;
      expect(result).toBe(
        '<div>&lt;script&gt;bad&lt;/script&gt; <em>emphasized</em></div>'
      );
    });
  });

  describe('unsafeHtml', () => {
    it('should mark HTML as safe', () => {
      const safe = unsafeHtml('<strong>test</strong>');
      expect(safe).toHaveProperty('__isSafeHtml', true);
      expect(safe).toHaveProperty('html', '<strong>test</strong>');
    });

    it('should not escape dangerous content when used', () => {
      const dangerous = '<script>alert(1)</script>';
      const marked = unsafeHtml(dangerous);
      const result = html`${marked}`;
      expect(result).toBe(dangerous);
    });
  });

  describe('renderList', () => {
    it('should render array with template function', () => {
      const items = ['apple', 'banana', 'cherry'];
      const result = renderList(items, item => html`<li>${item}</li>`);
      expect(result).toBe('<li>apple</li><li>banana</li><li>cherry</li>');
    });

    it('should escape values in template function', () => {
      const items = ['<script>bad</script>', 'safe'];
      const result = renderList(items, item => html`<li>${item}</li>`);
      expect(result).toBe(
        '<li>&lt;script&gt;bad&lt;/script&gt;</li><li>safe</li>'
      );
    });

    it('should use custom separator', () => {
      const items = ['a', 'b', 'c'];
      const result = renderList(items, item => html`<span>${item}</span>`, ', ');
      expect(result).toBe('<span>a</span>, <span>b</span>, <span>c</span>');
    });

    it('should return empty string for non-array', () => {
      expect(renderList(null, item => item)).toBe('');
      expect(renderList(undefined, item => item)).toBe('');
      expect(renderList('not an array', item => item)).toBe('');
    });

    it('should handle empty array', () => {
      expect(renderList([], item => html`<li>${item}</li>`)).toBe('');
    });
  });

  describe('XSS attack prevention', () => {
    it.each(['"', "'"])('should prevent attribute injection with %s delimiters', (quote) => {
      const malicious = `${quote} onload=${quote}alert(1)${quote}`;
      const container = document.createElement('div');
      container.innerHTML = `<div title=${quote}${escapeHtml(malicious)}${quote}></div>`;
      const item = container.firstElementChild;
      expect(item.getAttribute('title')).toBe(malicious);
      expect(item.hasAttribute('onload')).toBe(false);
      expect(item.attributes).toHaveLength(1);
    });

    it('should preserve category values without creating extra attributes', () => {
      const category = 'Notes " data-selected="true';
      const container = document.createElement('div');
      container.innerHTML = html`<div class="category-popup-item" data-value="${category}">${category}</div>`;
      const item = container.firstElementChild;
      expect(item.getAttribute('data-value')).toBe(category);
      expect(item.textContent).toBe(category);
      expect(item.hasAttribute('data-selected')).toBe(false);
    });

    it('should preserve search history values containing quotes and entity text', () => {
      const query = '"exact phrase" &quot; -excluded';
      const container = document.createElement('datalist');
      container.innerHTML = `<option value="${escapeHtml(query)}">`;
      expect(container.children).toHaveLength(1);
      expect(container.firstElementChild.value).toBe(query);
      expect(container.firstElementChild.attributes).toHaveLength(1);
    });

    it('should escape event handler tags in content', () => {
      const malicious = '<div onclick="alert(1)">Click me</div>';
      const result = html`${malicious}`;
      // The < and > are escaped, making the onclick harmless text
      expect(result).toContain('&lt;div onclick='); // onclick is now just text
      expect(result).toContain('&lt;/div&gt;');
    });

    it('should NOT prevent javascript: URLs (limitation - dont interpolate URLs)', () => {
      // IMPORTANT: This documents a LIMITATION!
      // The function doesn't filter dangerous URLs
      const malicious = 'javascript:alert(1)';
      const result = html`<a href="${malicious}">Link</a>`;
      expect(result).toBe('<a href="javascript:alert(1)">Link</a>');
      // Note: The function escapes content but doesn't filter URLs
      // URL filtering should happen at a different layer
    });

    it('should escape tags in data: URLs but not prevent the URL', () => {
      // The function escapes < and > within the URL string, but doesn't block data: URLs
      const malicious = 'data:text/html,<script>alert(1)</script>';
      const result = html`<iframe src="${malicious}"></iframe>`;
      expect(result).toBe(
        '<iframe src="data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>'
      );
      // Note: Tags are escaped but the data: URL itself is allowed
    });

    it('should handle nested XSS attempts', () => {
      const nested = '<<script>alert(1)</script>';
      const result = html`<div>${nested}</div>`;
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;&lt;script&gt;');
    });
  });

  describe('Real-world usage patterns', () => {
    it('should safely render user-generated content', () => {
      const userComment = '<script>steal(document.cookie)</script>Nice post!';
      const username = 'Admin<script>alert(1)</script>';
      const result = html`
        <div class="comment">
          <strong>${username}</strong>: ${userComment}
        </div>
      `;
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should safely render search results with special chars', () => {
      const searchTerm = 'Tom & Jerry <3';
      const result = html`<div>Results for: "${searchTerm}"</div>`;
      expect(result).toBe(
        '<div>Results for: "Tom &amp; Jerry &lt;3"</div>'
      );
    });

    it('should handle markdown-like content', () => {
      const markdown = '**bold** <em>italic</em>';
      const result = html`<p>${markdown}</p>`;
      expect(result).toBe('<p>**bold** &lt;em&gt;italic&lt;/em&gt;</p>');
    });
  });
});
