import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryDB } from './helpers/memory-idb.js';

describe('history search against the real manager', () => {
  let manager;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('indexedDB', createMemoryDB({ prompts: [], conversations: [] }));
    vi.stubGlobal('IDBKeyRange', { only: value => ({ value }) });
    manager = await import('../modules/history-manager.js');
    for (const provider of ['ChatGPT', 'claude', 'gemini']) {
      await manager.saveConversation({ title: `${provider} chat`, content: 'Saved text', provider });
    }
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['provider:chatgpt', ['ChatGPT']],
    ['provider:claude provider:gemini', ['claude', 'gemini']],
    ['provider:chat', ['ChatGPT']],
    ['provider:cluade', ['claude']],
  ])('matches %s without discarding results before field matching', async (query, providers) => {
    const results = await manager.searchConversations(query);
    expect(results.map(row => row.provider).sort()).toEqual([...providers].sort());
    expect(results.every(row => !Object.hasOwn(row, '_relevanceScore'))).toBe(true);
  });

  it('combines multiple providers with the remaining filters', async () => {
    const results = await manager.searchConversations('provider:claude provider:gemini -gemini');
    expect(results.map(row => row.provider)).toEqual(['claude']);
  });

  it('returns no rows when the provider does not match', async () => {
    expect(await manager.searchConversations('provider:unrelated')).toEqual([]);
  });

  it('removes cleared notes from the search index', async () => {
    const row = await manager.saveConversation({ content: 'Keep content', notes: 'uniquenote' });
    expect(await manager.searchConversations('uniquenote')).toHaveLength(1);
    await manager.updateConversation(row.id, { notes: '' });
    expect(await manager.searchConversations('uniquenote')).toEqual([]);
    expect(await manager.searchConversations('"keep content"')).toHaveLength(1);
  });

  it('updates the index when tags are cleared', async () => {
    const row = await manager.saveConversation({ content: 'Keep content', tags: ['uniquetag'] });
    await manager.updateConversation(row.id, { tags: [] });
    expect(await manager.searchConversations('uniquetag')).toEqual([]);
  });

  it('continues to support the explicit save overwrite control', async () => {
    const row = await manager.saveConversation({ content: 'Original', notes: 'oldnote' });
    const saved = await manager.saveConversation({ content: 'Replacement', overwriteId: row.id });
    expect(saved.id).toBe(row.id);
    expect((await manager.getAllConversations()).filter(c => c.id === row.id)).toHaveLength(1);
    expect(await manager.searchConversations('oldnote')).toEqual([]);
    expect(await manager.searchConversations('replacement')).toHaveLength(1);
  });
});
