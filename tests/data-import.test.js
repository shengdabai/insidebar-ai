import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryDB } from './helpers/memory-idb.js';

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
    vi.stubGlobal('indexedDB', createMemoryDB({ prompts, conversations }));
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

  it.each(['skip', 'overwrite'])('ignores imported overwriteId under %s strategy', async (strategy) => {
    const existing = await historyManager.saveConversation({ title: 'Private', content: 'Keep original' });
    const result = await historyManager.importConversations({ conversations: [
      { title: 'Imported', content: 'Untrusted file', overwriteId: existing.id, id: existing.id },
    ] }, strategy);
    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] });
    expect(conversations).toHaveLength(2);
    expect(await historyManager.getConversation(existing.id)).toEqual(existing);
    expect(conversations[1]).not.toHaveProperty('overwriteId');
  });

  // Issue #16: 'overwrite' must replace the matching local record, not append.
  describe('skip vs overwrite on a matching record', () => {
    const file = { prompts: [
      { id: 99, title: '  MY PLAN  ', content: 'From file', tags: ['imported'] },
      { title: 'Fresh', content: 'Brand new' },
    ] };

    beforeEach(async () => {
      await manager.savePrompt({ title: 'My Plan', content: 'Existing', tags: ['local'] });
      await manager.savePrompt({ title: 'Untouched', content: 'Not in the file' });
    });

    it('skip keeps the local prompt and adds only unmatched rows', async () => {
      const result = await manager.importPrompts(file, 'skip');
      expect(result).toEqual({ imported: 1, skipped: 1, errors: [] });
      expect(prompts.map(p => [p.id, p.title, p.content])).toEqual([
        [1, 'My Plan', 'Existing'],
        [2, 'Untouched', 'Not in the file'],
        [3, 'Fresh', 'Brand new'],
      ]);
    });

    it('overwrite replaces the local prompt in place and adds only unmatched rows', async () => {
      const result = await manager.importPrompts(file, 'overwrite');
      expect(result).toEqual({ imported: 2, skipped: 0, errors: [] });
      expect(prompts.map(p => [p.id, p.title, p.content])).toEqual([
        [1, 'MY PLAN', 'From file'],
        [2, 'Untouched', 'Not in the file'],
        [3, 'Fresh', 'Brand new'],
      ]);
      expect(prompts[0].tags).toEqual(['imported']);
      expect(prompts.some(p => p.id === 99)).toBe(false);
    });

    it('overwrite lets the last duplicate in one file win without appending', async () => {
      const result = await manager.importPrompts({ prompts: [
        { title: 'Fresh', content: 'First' },
        { title: ' fresh ', content: 'Second' },
      ] }, 'overwrite');
      expect(result).toEqual({ imported: 2, skipped: 0, errors: [] });
      expect(prompts.filter(p => p.title.toLowerCase().trim() === 'fresh')).toHaveLength(1);
      expect(prompts[2].content).toBe('Second');
    });

    it('overwrite rejects an invalid row without touching the local prompt', async () => {
      const result = await manager.importPrompts({ prompts: [{ title: 'My Plan', content: '' }] }, 'overwrite');
      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(prompts[0].content).toBe('Existing');
    });

    it.each([
      ['skip', { imported: 1, skipped: 1, errors: [] }, 'Original'],
      ['overwrite', { imported: 2, skipped: 0, errors: [] }, 'Updated'],
    ])('conversations under %s', async (strategy, expected, content) => {
      const local = await historyManager.saveConversation({ title: 'Chat', content: 'Original', timestamp: 1700000000000 });
      await historyManager.saveConversation({ title: 'Other', content: 'Not in the file', timestamp: 1700000000000 });
      const result = await historyManager.importConversations({ conversations: [
        { id: 99, title: 'Chat', content: 'Updated', timestamp: local.timestamp + 1000 },
        { title: 'New chat', content: 'Brand new', timestamp: 1700000500000 },
      ] }, strategy);
      expect(result).toEqual(expected);
      expect(conversations.map(c => [c.id, c.title, c.content])).toEqual([
        [1, 'Chat', content],
        [2, 'Other', 'Not in the file'],
        [3, 'New chat', 'Brand new'],
      ]);
      if (strategy === 'overwrite') expect(conversations[0].searchText).toContain('updated');
    });
  });

  it('deduplicates a maximum-length default-library title with surrounding whitespace', async () => {
    const title = 'A'.repeat(200);
    await manager.savePrompt({ title, content: 'Existing' });
    const result = await manager.importDefaultLibrary({ prompts: [
      { title: `  ${title}  `, content: 'Duplicate' },
    ] });
    expect(result).toEqual({ imported: 0, skipped: 1, errors: [] });
    expect(prompts).toHaveLength(1);
  });

  it('uses the saved fallback title when deduplicating the default library', async () => {
    const result = await manager.importDefaultLibrary({ prompts: [
      { content: 'First' }, { title: 'Untitled Prompt', content: 'Second' },
    ] });
    expect(result).toEqual({ imported: 1, skipped: 1, errors: [] });
    expect(prompts[0].content).toBe('First');
  });
});
