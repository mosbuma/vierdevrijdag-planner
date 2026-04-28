/**
 * NextAuth cookies: `secure: true` and `__Secure-` / `__Host-` names only work over **HTTPS**.
 * If NODE_ENV=production but you open the app via **http://** (LAN IP, Synology port), browsers
 * reject those cookies — login succeeds in the API but the session never sticks (or CSRF fails).
 *
 * We key off **NEXTAUTH_URL** (and optional **AUTH_COOKIE_SECURE** override), not NODE_ENV.
 */
function authUseSecureCookies(): boolean {
  const raw = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  const url = process.env.NEXTAUTH_URL?.trim() ?? "";
  if (url.startsWith("https://")) return true;
  if (url.startsWith("http://")) return false;
  return false;
}

export const AUTH_COOKIE_SECURE = authUseSecureCookies();

export const SESSION_COOKIE_NAME = AUTH_COOKIE_SECURE
  ? "__Secure-vierdevrijdag.session-token"
  : "vierdevrijdag.session-token";

export const CALLBACK_URL_COOKIE_NAME = AUTH_COOKIE_SECURE
  ? "__Secure-vierdevrijdag.callback-url"
  : "vierdevrijdag.callback-url";

export const CSRF_TOKEN_COOKIE_NAME = AUTH_COOKIE_SECURE
  ? "__Host-vierdevrijdag.csrf-token"
  : "vierdevrijdag.csrf-token";
