export const PROFILE_UPLOAD_MAX_AGE_MS = 5 * 60_000;

export function profileUploadMessage(walletAddress: string, timestamp: string, fileHash: string) {
  return [
    'ArcSignal profile image upload',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `File-SHA256: ${fileHash}`,
  ].join('\n');
}

export async function sha256Hex(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
