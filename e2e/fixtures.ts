import base, { expect, APIRequestContext } from '@playwright/test';

type SeedProductPayload = {
  name: string;
  price: number;
  category?: string;
  description?: string;
  inStock?: boolean;
  unit?: string;
};

export const test = base.extend<{
  seedProduct: (p: SeedProductPayload) => Promise<{ ok: boolean; id?: string; status?: number; body?: unknown; error?: string }>;
}>({
  // provide a server-side seeding helper that uses Playwright's request fixture
  seedProduct: async ({ request }, setup) => {
    await setup(async (payload: SeedProductPayload) => {
      try {
        // request will use baseURL from playwright config
        const res = await (request as APIRequestContext).post('/admin/test/products', { data: payload });
        if (res.ok()) {
          let body: unknown = {};
          try { body = await res.json(); } catch (e) { body = await res.text(); }
          let maybeId: string | undefined;
          if (body && typeof body === 'object') {
            const b = body as Record<string, unknown>;
            if ('id' in b && typeof b.id === 'string') maybeId = b.id as string;
            else if ('_id' in b && typeof b._id === 'string') maybeId = b._id as string;
          }
          return { ok: true, id: maybeId, body };
        }
        const text = await res.text();
        return { ok: false, status: res.status(), body: text, error: `HTTP ${res.status()}` };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    });
  }
});

export { expect };
