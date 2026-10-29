import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Exercise the real import/save/search code against a small asynchronous store.
// This does not model IndexedDB transactions or migrations.
describe('data imports', () => {
  let prompts;
  let conversations;
  let manager;
  let historyManager;

  beforeEach(async () => {
    vi.resetModules();
    prompts = [];
    conversations = [];
    const request = (result) => {
      const req = { result };
      queueMicrotask(() => req.onsuccess?.({ target: req }));
      return req;
    };
    const store = (rows) => ({
      getAll: () => request(structuredClone(rows)),
      add: (row) => {
        const id = rows.length + 1;
        rows.push({ ...structuredClone(row), id });
        return request(id);
      },
    });
    const db = { transaction: () => ({ objectStore: (name) => store(name === 'prompts' ? prompts : conversations) }) };
    vi.stubGlobal('indexedDB', { open: () => request(db) });
    manager = await import('../modules/prompt-manager.js');
    historyManager = await import('../modules/history-manager.js');
  });

  afterEach(() => vi.unstubAllGlobals());

  it('imports a new title even when it matches other titles, content or tags', async () => {
    prompts.push({ title: 'Weekly Plan', content: 'Plan', tags: ['Plan'] });
    const result = await manager.importPrompts({ prompts: [{ title: 'Plan', content: 'New content' }] });
    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] });
    expect(prompts.map(p => p.title)).toEqual(['Weekly Plan', 'Plan']);
  });

  it('skips exact titles regardless of surrounding whitespace and case', async () => {
    prompts.push({ title: 'My Plan', content: 'Existing', tags: [] });
    const result = await manager.importPrompts({ prompts: [{ title: '  MY PLAN  ', content: 'New' }] });
    expect(result).toEqual({ imported: 0, skipped: 1, errors: [] });
    expect(prompts).toHaveLength(1);
  });

  it('deduplicates titles within the same batch', async () => {
    const result = await manager.importPrompts({ prompts: [
      { title: 'Plan', content: 'First' },
      { title: ' plan ', content: 'Second' },
    ] });
    expect(result).toEqual({ imported: 1, skipped: 1, errors: [] });
    expect(prompts[0].content).toBe('First');
  });

  it('uses the saved default title for prompts without a title', async () => {
    const result = await manager.importPrompts({ prompts: [{ content: 'Untitled content' }] });
    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] });
    expect(prompts[0].title).toBe('Untitled Prompt');
  });

  it.each(['importPrompts', 'importDefaultLibrary'])('%s records invalid rows and continues the batch', async (method) => {
    const result = await manager[method]({ prompts: [
      null,
      { title: 'Valid', content: '' },
      { title: 'Valid', content: 'Keep this' },
    ] });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(2);
    expect(prompts.map(p => p.title)).toEqual(['Valid']);
  });

  it('rejects unknown strategies instead of silently dropping every row', async () => {
    await expect(manager.importPrompts({ prompts: [{ title: 'Plan', content: 'New' }] }, 'typo'))
      .rejects.toThrow('Invalid import strategy');
    expect(prompts).toHaveLength(0);
  });

  it('records malformed conversation rows and continues importing valid rows', async () => {
    const result = await historyManager.importConversations({ conversations: [
      null,
      { title: 'Invalid', content: '' },
      { title: 'Valid', content: 'Saved conversation', provider: 'chatgpt' },
    ] });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(2);
    expect(conversations.map(c => c.title)).toEqual(['Valid']);
  });

  it('keeps the existing conversation duplicate rule', async () => {
    const conversation = { title: 'Chat', content: 'Original', timestamp: 1700000000000 };
    conversations.push(conversation);
    const result = await historyManager.importConversations({ conversations: [
      { ...conversation, content: 'Duplicate', timestamp: conversation.timestamp + 1000 },
    ] });
    expect(result).toEqual({ imported: 0, skipped: 1, errors: [] });
    expect(conversations[0].content).toBe('Original');
  });

  it('rejects unknown conversation import strategies', async () => {
    await expect(historyManager.importConversations({ conversations: [{ title: 'Chat', content: 'New' }] }, 'typo'))
      .rejects.toThrow('Invalid import strategy');
    expect(conversations).toHaveLength(0);
  });
});
