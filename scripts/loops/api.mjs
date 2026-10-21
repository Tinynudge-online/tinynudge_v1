// Minimal client for the Loops content/workflow API (https://app.loops.so/openapi.json).
// The `loops` npm SDK doesn't cover these endpoints yet, so we call them directly.
// Content endpoints are rate-limited to 60 requests/minute, so requests are spaced out.

const API_ROOT = 'https://app.loops.so/api/v1';
const MIN_INTERVAL_MS = 1100;

let lastRequestAt = 0;

export class LoopsApiError extends Error {
  constructor(method, path, status, body) {
    super(`${method} ${path} → ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

function apiKey() {
  const key = process.env.LOOPS_API_KEY?.trim().replace(/^"|"$/g, '');
  if (!key) throw new Error('LOOPS_API_KEY is not set. Run with: node --env-file=.env.local ...');
  return key;
}

export async function loopsRequest(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastRequestAt = Date.now();

    const res = await fetch(`${API_ROOT}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    if (res.status === 429 && attempt < 4) {
      const retryAfter = Number(res.headers.get('retry-after')) || 10;
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }

    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    if (!res.ok) throw new LoopsApiError(method, path, res.status, json);
    return json;
  }
}

export async function listAll(path) {
  const items = [];
  let cursor = null;
  do {
    const sep = path.includes('?') ? '&' : '?';
    const page = await loopsRequest('GET', `${path}${sep}perPage=50${cursor ? `&cursor=${cursor}` : ''}`);
    items.push(...(page.data ?? []));
    cursor = page.pagination?.nextCursor ?? null;
  } while (cursor);
  return items;
}

export const loops = {
  testKey: () => loopsRequest('GET', '/api-key'),
  customProperties: () => loopsRequest('GET', '/contacts/properties?list=custom'),
  createProperty: (name, type) => loopsRequest('POST', '/contacts/properties', { name, type }),

  getEventPattern: name => loopsRequest('GET', `/event-patterns/by-name/${encodeURIComponent(name)}`)
    .catch(err => { if (err.status === 404) return null; throw err; }),
  sendEvent: body => loopsRequest('POST', '/events/send', body),

  listWorkflows: () => listAll('/workflows'),
  getWorkflow: id => loopsRequest('GET', `/workflows/${id}`),
  createWorkflow: (name, description) => loopsRequest('POST', '/workflows', { name, description }),
  updateWorkflow: (id, body) => loopsRequest('POST', `/workflows/${id}`, body),
  deleteWorkflow: (id, body) => loopsRequest('DELETE', `/workflows/${id}`, body),
  getNode: (wfId, nodeId) => loopsRequest('GET', `/workflows/${wfId}/nodes/${nodeId}`),
  createNode: (wfId, body) => loopsRequest('POST', `/workflows/${wfId}/nodes`, body),
  updateNode: (wfId, nodeId, body) => loopsRequest('POST', `/workflows/${wfId}/nodes/${nodeId}`, body),
  deleteNode: (wfId, nodeId, body) => loopsRequest('DELETE', `/workflows/${wfId}/nodes/${nodeId}`, body),

  getEmail: id => loopsRequest('GET', `/email-messages/${id}`),
  updateEmail: (id, body) => loopsRequest('POST', `/email-messages/${id}`, body),
  guardian: id => loopsRequest('GET', `/email-messages/${id}/guardian`),

  listTransactional: () => listAll('/transactional-emails'),
  createTransactional: name => loopsRequest('POST', '/transactional-emails', { name }),
  ensureTransactionalDraft: id => loopsRequest('POST', `/transactional-emails/${id}/draft`),
  publishTransactional: id => loopsRequest('POST', `/transactional-emails/${id}/publish`),
};
