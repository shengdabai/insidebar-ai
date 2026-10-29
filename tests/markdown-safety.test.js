import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../modules/html-utils.js';

const parse = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content;
};

describe('saved conversation markdown safety', () => {
  it('keeps headings, tables, code, task lists and ordinary links', () => {
    const doc = parse(sanitizeHtml('<h2>Title</h2><table><tbody><tr><td>Cell</td></tr></tbody></table>' +
      '<pre><code class="language-js">const x = 1;</code></pre>' +
      '<ul><li><input type="checkbox" checked disabled>Done</li></ul>' +
      '<a href="https://example.invalid/docs">Docs</a>'));
    expect(doc.querySelector('h2').textContent).toBe('Title');
    expect(doc.querySelector('td').textContent).toBe('Cell');
    expect(doc.querySelector('code').className).toBe('language-js');
    expect(doc.querySelector('input').disabled).toBe(true);
    expect(doc.querySelector('input').checked).toBe(true);
    expect(doc.querySelector('a').getAttribute('href')).toBe('https://example.invalid/docs');
  });

  it.each(['left', 'center', 'right'])('preserves %s alignment on table cells', (align) => {
    const doc = parse(sanitizeHtml(`<table><thead><tr><th align="${align}">Heading</th></tr></thead>` +
      `<tbody><tr><td align="${align}">Cell</td></tr></tbody></table>`));
    expect(doc.querySelector('th').getAttribute('align')).toBe(align);
    expect(doc.querySelector('td').getAttribute('align')).toBe(align);
  });

  it.each(['justify', 'char', '', 'left right', 'left; color:red', 'left\nright'])(
    'removes unsupported table cell alignment %j', (align) => {
      const doc = parse(sanitizeHtml(`<table><thead><tr><th align="${align}">Heading</th></tr></thead>` +
        `<tbody><tr><td align="${align}">Cell</td></tr></tbody></table>`));
      expect(doc.querySelector('th').hasAttribute('align')).toBe(false);
      expect(doc.querySelector('td').hasAttribute('align')).toBe(false);
    }
  );

  it('removes alignment from elements other than table cells', () => {
    const doc = parse(sanitizeHtml('<div align="left"><p align="center">Text</p></div>' +
      '<table align="right"><tbody align="left"><tr align="center"><td>Cell</td></tr></tbody></table>'));
    expect(doc.querySelector('[align]')).toBeNull();
  });

  it.each(['javascript:alert(1)', 'java\nscript:alert(1)', 'java\tscript:alert(1)',
    'data:text/html,unsafe', 'vbscript:unsafe', 'file:///tmp/test'])('removes unsafe URL %j', (url) => {
    const doc = parse(sanitizeHtml(`<a href="${url}">Link</a>`));
    expect(doc.querySelector('a').hasAttribute('href')).toBe(false);
  });

  it('removes embedded pages, refresh redirects, scripts and style resources', () => {
    const doc = parse(sanitizeHtml('<p>Keep</p><iframe srcdoc="unsafe"></iframe>' +
      '<object data="data:text/html,unsafe"></object><embed src="data:text/html,unsafe">' +
      '<meta http-equiv="refresh" content="0;url=data:text/html,unsafe">' +
      '<style>body { display: none }</style><script>unsafe()</script>'));
    expect(doc.querySelector('iframe, object, embed, meta, style, script')).toBeNull();
    expect(doc.textContent).toBe('Keep');
  });

  it('removes forms and active foreign markup', () => {
    const doc = parse(sanitizeHtml('<form><input name="private"><button>Send</button></form>' +
      '<svg><a href="javascript:unsafe">SVG</a></svg><math><mtext>Math</mtext></math>'));
    expect(doc.querySelector('form, button, input, svg, math')).toBeNull();
  });

  it('strips event handlers, style and DOM identifiers', () => {
    const doc = parse(sanitizeHtml('<p id="provider-tabs" name="target" style="display:none" onclick="unsafe()">Text</p>'));
    expect(doc.querySelector('p').attributes.length).toBe(0);
  });

  it('disables Markdown checkboxes regardless of imported attributes', () => {
    const doc = parse(sanitizeHtml('<input type="checkbox" checked name="private" onclick="unsafe()"><input type="text">'));
    expect(doc.querySelectorAll('input')).toHaveLength(1);
    expect(doc.querySelector('input').disabled).toBe(true);
    expect(doc.querySelector('input').hasAttribute('name')).toBe(false);
  });

  it('isolates external links and preserves anchor links', () => {
    const doc = parse(sanitizeHtml('<a href="https://example.invalid" target="custom" ping="/track">Web</a>' +
      '<a href="#section">Anchor</a>'));
    const [web, anchor] = doc.querySelectorAll('a');
    expect(web.getAttribute('target')).toBe('_blank');
    expect(web.getAttribute('rel')).toBe('noopener noreferrer');
    expect(web.hasAttribute('ping')).toBe(false);
    expect(anchor.getAttribute('href')).toBe('#section');
  });
});
