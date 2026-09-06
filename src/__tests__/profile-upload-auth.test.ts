import { describe, expect, it } from 'vitest';
import { profileUploadMessage, sha256Hex } from '@/lib/profile-upload-auth';

describe('profile upload authorization', () => {
  it('binds the signature message to a normalized wallet, time, and file hash', () => {
    expect(profileUploadMessage('0xAbC', '1234', '0xdeadbeef')).toBe([
      'ArcSignal profile image upload',
      'Wallet: 0xabc',
      'Timestamp: 1234',
      'File-SHA256: 0xdeadbeef',
    ].join('\n'));
  });

  it('computes the standard SHA-256 digest used by both browser and server', async () => {
    const bytes = new TextEncoder().encode('ArcSignal');
    await expect(sha256Hex(bytes.buffer)).resolves.toBe(
      '0x8721a79fdccdb7fe065a094bf9221a8428f3def84dce9b1484b29bac1cc93cb3',
    );
  });
});
