// Simple backend admin session helper
export interface BackendAuthUser { email: string }

export async function backendLogin(base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api', email?: string, password?: string): Promise<BackendAuthUser | null> {
  const body = { email: email || (import.meta.env.VITE_BACKEND_ADMIN_EMAIL || 'admin@example.com'), password: password || (import.meta.env.VITE_BACKEND_ADMIN_PASSWORD || 'admin123') };
  try {
    const res = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
    if (!res.ok) return null;
    const data = await res.json();
    return { email: data.email };
  } catch { return null; }
}

export async function backendMe(base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'): Promise<BackendAuthUser | null> {
  try {
    const res = await fetch(`${base}/me`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch { return null; }
}
