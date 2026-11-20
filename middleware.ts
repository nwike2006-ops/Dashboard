export const config = { matcher: '/:path*' };

const COOKIE_NAME = 'budget_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days — the actual ask here:
// stop re-prompting so often. HTTP Basic Auth (the old approach) leaves that
// entirely up to the browser's own credential cache, which on mobile gets
// cleared far more aggressively than 180 days. A cookie we set ourselves,
// with an explicit long expiry, is the only way to actually control that —
// same password, same protection, just remembered far longer per device.

async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loginPage(error?: string): string {
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Budget</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
    min-height: 100vh; margin: 0; background: #f4f4ef; }
  form { background: #fff; padding: 32px 28px; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 320px; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  input { font-size: 16px; padding: 12px; border-radius: 10px; border: 1px solid #ccc; }
  button { font-size: 16px; padding: 12px; border-radius: 10px; border: none; background: #6b7a4a; color: #fff;
    cursor: pointer; }
  .error { color: #a33; font-size: 13px; margin: -6px 0 0; }
</style></head>
<body>
  <form method="POST" action="/__login">
    <h1>Budget</h1>
    ${error ? `<p class="error">${error}</p>` : ''}
    <input type="password" name="password" placeholder="Password" autofocus required />
    <button type="submit">Enter</button>
  </form>
</body></html>`;
}

// Blocks the entire site behind a password before any code, data, or the
// Supabase anon key ever reaches the browser — this app has no per-user
// login (see supabase/schema.sql), so the deployed URL + this password are
// the only things gating access to real financial data. Session is a
// long-lived cookie (see COOKIE_MAX_AGE) rather than the browser's native
// Basic Auth prompt, so it doesn't keep re-asking on mobile.
export default async function middleware(request: Request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return; // not configured — fail open rather than lock the owner out

  const expectedCookieValue = await hashPassword(password);
  const cookies = request.headers.get('cookie') || '';
  const hasValidCookie = cookies
    .split(';')
    .map((c) => c.trim())
    .includes(`${COOKIE_NAME}=${expectedCookieValue}`);
  if (hasValidCookie) return;

  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/__login') {
    const form = await request.formData();
    const supplied = form.get('password');
    if (supplied === password) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/',
          'Set-Cookie': `${COOKIE_NAME}=${expectedCookieValue}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return new Response(loginPage('Wrong password'), { status: 401, headers: { 'Content-Type': 'text/html' } });
  }

  return new Response(loginPage(), { status: 401, headers: { 'Content-Type': 'text/html' } });
}
