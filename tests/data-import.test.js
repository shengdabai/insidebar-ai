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
