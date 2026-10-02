import dns from 'dns/promises';

/**
 * DNS_TIMEOUT_MS: Maximum time (ms) we wait for a DNS MX resolution
 * before we treat the result as inconclusive and allow the request through.
 * Keeps sign-up latency predictable even when upstream DNS is slow.
 */
const DNS_TIMEOUT_MS = 3_000;

/** Sentinel used to distinguish a DNS error from a timeout inside the race. */
const DNS_ERROR_SENTINEL = Symbol('DNS_ERROR');
/** Sentinel used to distinguish a timeout from a DNS result inside the race. */
const DNS_TIMEOUT_SENTINEL = Symbol('DNS_TIMEOUT');

/**
 * Resolves whether the domain part of an email address has at least one
 * valid MX record, using Node's native `dns/promises.resolveMx`.
 *
 * Rules:
 * - Returns `false` immediately for structurally invalid emails (no `@`).
 * - Returns `false` when DNS resolution fails (NXDOMAIN, ENOTFOUND, etc.).
 * - Returns `false` when the MX record list is empty.
 * - Returns `true` on timeout so we *fail open* — we never block a
 *   legitimate user because DNS was momentarily slow.
 *
 * @param email - The full email address to check (e.g. "user@gmail.com").
 */
export const hasValidMxRecord = async (email: string): Promise<boolean> => {
  const atIdx = email.indexOf('@');
  if (atIdx === -1) return false;

  const domain = email.slice(atIdx + 1).trim().toLowerCase();
  if (!domain || domain.length < 3) return false;

  // Race 1: real DNS query — resolves with MX records or the error sentinel
  const mxPromise = dns
    .resolveMx(domain)
    .then((records) => records)
    .catch(() => DNS_ERROR_SENTINEL as typeof DNS_ERROR_SENTINEL);

  // Race 2: timeout — resolves with the timeout sentinel after DNS_TIMEOUT_MS ms
  const timeoutPromise = new Promise<typeof DNS_TIMEOUT_SENTINEL>((resolve) =>
    setTimeout(() => resolve(DNS_TIMEOUT_SENTINEL), DNS_TIMEOUT_MS),
  );

  const result = await Promise.race([mxPromise, timeoutPromise]);

  // ── Explicit DNS failure (NXDOMAIN, ENOTFOUND, ENODATA, etc.) ──────────────
  if (result === DNS_ERROR_SENTINEL) {
    return false; // Domain does not exist / cannot accept email → block
  }

  // ── Timeout: DNS was too slow ───────────────────────────────────────────────
  // Fail *open* — never block a legitimate user because of a transient DNS issue.
  // Log a warning so ops can investigate without impacting UX.
  if (result === DNS_TIMEOUT_SENTINEL) {
    console.warn(
      `[dnsValidator] MX lookup for "${domain}" timed out after ${DNS_TIMEOUT_MS}ms — allowing through`,
    );
    return true;
  }

  // ── DNS resolved with a record list ────────────────────────────────────────
  return Array.isArray(result) && result.length > 0;
};

/**
 * Validates an email's domain via MX lookup and throws a structured
 * appError-compatible error if the domain is unreachable or has no MX records.
 *
 * Designed to be called directly from service functions before persistence:
 *   await assertValidEmailDomain(dto.email);
 */
export const assertValidEmailDomain = async (email: string): Promise<void> => {
  const valid = await hasValidMxRecord(email);
  if (!valid) {
    const err: any = new Error(
      'البريد الإلكتروني ينتمي إلى نطاق غير موجود أو لا يستقبل رسائل',
    );
    err.statusCode = 422;
    err.isOperational = true;
    throw err;
  }
};
