// Asynchronous request/cursor fixture for manager behavior, not transaction durability.
export function createMemoryDB(stores) {
  const request = (result) => {
    const req = { result: structuredClone(result) };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  };
  const openCursor = (rows) => {
    const req = {};
    let offset = 0;
    const next = () => queueMicrotask(() => {
      req.result = offset < rows.length
        ? { value: structuredClone(rows[offset++]), continue: next }
        : null;
      req.onsuccess?.({ target: req });
    });
    next();
    return req;
  };
  const store = (rows) => ({
    getAll: () => request(rows),
    get: (id) => request(rows.find(row => row.id === id)),
    add: (row) => {
      const id = Math.max(0, ...rows.map(row => row.id || 0)) + 1;
      rows.push({ ...structuredClone(row), id });
      return request(id);
    },
    put: (row) => {
      const index = rows.findIndex(existing => existing.id === row.id);
      if (index < 0) rows.push(structuredClone(row));
      else rows[index] = structuredClone(row);
      return request(row.id);
    },
    openCursor: () => openCursor(rows),
    index: (key) => ({
      openCursor: (range) => openCursor(rows.filter(row => row[key] === range.value)),
    }),
  });
  const db = { transaction: () => ({ objectStore: (name) => store(stores[name]) }) };
  return { open: () => {
    const req = { result: db };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  } };
}
