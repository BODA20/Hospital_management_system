/**
 * tests/auth/dns.validator.test.ts
 *
 * Unit-tests for src/common/utils/dnsValidator.ts
 * All real DNS I/O is mocked so the suite never touches the network.
 */

import { hasValidMxRecord, assertValidEmailDomain } from '../../src/common/utils/dnsValidator';

// ── Mock dns/promises ────────────────────────────────────────────────────────
jest.mock('dns/promises', () => ({
  resolveMx: jest.fn(),
}));

import dns from 'dns/promises';
const mockedResolveMx = dns.resolveMx as jest.MockedFunction<typeof dns.resolveMx>;

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Real timers by default; only the timeout suite overrides to fake timers.
  jest.useRealTimers();
});

// ─── hasValidMxRecord ────────────────────────────────────────────────────────

describe('hasValidMxRecord()', () => {
  describe('Valid / real domains', () => {
    it('returns TRUE for gmail.com (has MX records)', async () => {
      mockedResolveMx.mockResolvedValueOnce([
        { exchange: 'gmail-smtp-in.l.google.com', priority: 5 },
      ]);

      const result = await hasValidMxRecord('user@gmail.com');
      expect(result).toBe(true);
      expect(mockedResolveMx).toHaveBeenCalledWith('gmail.com');
    });

    it('returns TRUE for yahoo.com (multiple MX records)', async () => {
      mockedResolveMx.mockResolvedValueOnce([
        { exchange: 'mta5.am0.yahoodns.net', priority: 1 },
        { exchange: 'mta6.am0.yahoodns.net', priority: 1 },
      ]);

      const result = await hasValidMxRecord('test@yahoo.com');
      expect(result).toBe(true);
    });

    it('returns TRUE for a custom hospital.com domain with MX records', async () => {
      mockedResolveMx.mockResolvedValueOnce([
        { exchange: 'mail.hospital.com', priority: 10 },
      ]);

      const result = await hasValidMxRecord('doctor@hospital.com');
      expect(result).toBe(true);
    });
  });

  describe('Invalid / fake domains', () => {
    it('returns FALSE for a non-existent domain (ENOTFOUND)', async () => {
      mockedResolveMx.mockRejectedValueOnce(
        Object.assign(new Error('ENOTFOUND fake-domain-123456.com'), { code: 'ENOTFOUND' }),
      );

      const result = await hasValidMxRecord('user@fake-domain-123456.com');
      expect(result).toBe(false);
    });

    it('returns FALSE for a domain with no MX records (ENODATA)', async () => {
      mockedResolveMx.mockRejectedValueOnce(
        Object.assign(new Error('ENODATA no-mx-records.io'), { code: 'ENODATA' }),
      );

      const result = await hasValidMxRecord('user@no-mx-records.io');
      expect(result).toBe(false);
    });

    it('returns FALSE when the MX record array is empty', async () => {
      mockedResolveMx.mockResolvedValueOnce([] as any);

      const result = await hasValidMxRecord('user@empty-mx.org');
      expect(result).toBe(false);
    });
  });

  describe('Malformed email inputs', () => {
    it('returns FALSE for email without @ sign', async () => {
      const result = await hasValidMxRecord('notanemail');
      expect(result).toBe(false);
      // DNS should never be queried for structurally invalid input
      expect(mockedResolveMx).not.toHaveBeenCalled();
    });

    it('returns FALSE for empty string', async () => {
      const result = await hasValidMxRecord('');
      expect(result).toBe(false);
      expect(mockedResolveMx).not.toHaveBeenCalled();
    });

    it('returns FALSE for email with empty domain (user@)', async () => {
      const result = await hasValidMxRecord('user@');
      expect(result).toBe(false);
      expect(mockedResolveMx).not.toHaveBeenCalled();
    });
  });

  describe('Timeout / slow DNS (fail-open)', () => {
    it('returns TRUE (fail-open) when DNS query exceeds 3-second timeout', async () => {
      jest.useFakeTimers();

      // DNS never resolves — simulates a frozen upstream resolver
      mockedResolveMx.mockImplementationOnce(
        () => new Promise(() => {}), // Hangs indefinitely
      );

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const resultPromise = hasValidMxRecord('user@slow-dns.net');

      // Advance fake timers past the 3000ms threshold
      jest.advanceTimersByTime(3500);

      const result = await resultPromise;

      expect(result).toBe(true); // Fail-open: never block on timeout
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('timed out'),
      );

      warnSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});

// ─── assertValidEmailDomain ──────────────────────────────────────────────────

describe('assertValidEmailDomain()', () => {
  it('resolves silently for a valid domain', async () => {
    mockedResolveMx.mockResolvedValueOnce([
      { exchange: 'gmail-smtp-in.l.google.com', priority: 5 },
    ]);

    await expect(assertValidEmailDomain('user@gmail.com')).resolves.toBeUndefined();
  });

  it('throws with statusCode 422 and Arabic error message for a fake domain', async () => {
    mockedResolveMx.mockRejectedValueOnce(
      Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }),
    );

    await expect(assertValidEmailDomain('user@fake-domain-123456.com')).rejects.toMatchObject({
      statusCode: 422,
      message: 'البريد الإلكتروني ينتمي إلى نطاق غير موجود أو لا يستقبل رسائل',
    });
  });

  it('throws with isOperational=true so global error handler formats it correctly', async () => {
    mockedResolveMx.mockRejectedValueOnce(
      Object.assign(new Error('ENODATA'), { code: 'ENODATA' }),
    );

    await expect(assertValidEmailDomain('admin@nonexistent.xyz')).rejects.toMatchObject({
      isOperational: true,
    });
  });

  it('does NOT throw when DNS times out (fail-open)', async () => {
    jest.useFakeTimers();

    mockedResolveMx.mockImplementationOnce(() => new Promise(() => {}));

    const resultPromise = assertValidEmailDomain('user@slow-dns.net');
    jest.advanceTimersByTime(3500);

    // Must resolve (not throw) — timeout is fail-open
    await expect(resultPromise).resolves.toBeUndefined();

    jest.useRealTimers();
  });
});
