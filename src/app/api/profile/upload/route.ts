import { NextResponse } from 'next/server';
import { isAddress, verifyMessage } from 'viem';
import { getSql } from '@/lib/db';
import {
  PROFILE_UPLOAD_MAX_AGE_MS,
  profileUploadMessage,
  sha256Hex,
} from '@/lib/profile-upload-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function hasValidImageSignature(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.IMGBB_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Profile image uploads are temporarily unavailable' },
        { status: 503 },
      );
    }

    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
      return NextResponse.json({ error: 'Content-Length is required' }, { status: 411 });
    }
    if (contentLength > MAX_IMAGE_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'Image must be 2 MB or smaller' }, { status: 413 });
    }

    const formData = await req.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are allowed' },
        { status: 415 },
      );
    }

    if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be 2 MB or smaller' }, { status: 413 });
    }

    const walletAddress = req.headers.get('x-wallet-address')?.trim() ?? '';
    const timestamp = req.headers.get('x-upload-timestamp')?.trim() ?? '';
    const signature = req.headers.get('x-upload-signature')?.trim() ?? '';
    const timestampMs = Number(timestamp);
    if (
      !isAddress(walletAddress)
      || !/^0x(?:[a-fA-F0-9]{128}|[a-fA-F0-9]{130})$/.test(signature)
      || !Number.isSafeInteger(timestampMs)
      || timestampMs > Date.now() + 30_000
      || Date.now() - timestampMs > PROFILE_UPLOAD_MAX_AGE_MS
    ) {
      return NextResponse.json({ error: 'A fresh wallet signature is required' }, { status: 401 });
    }

    const imageBuffer = await image.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    if (!hasValidImageSignature(image.type, imageBytes)) {
      return NextResponse.json({ error: 'File content does not match its image type' }, { status: 415 });
    }
    const fileHash = await sha256Hex(imageBuffer);
    const verified = await verifyMessage({
      address: walletAddress,
      message: profileUploadMessage(walletAddress, timestamp, fileHash),
      signature: signature as `0x${string}`,
    });
    if (!verified) {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 });
    }

    const sql = getSql();
    const authorizationRows = await sql`
      with recent as (
        select count(*)::int as count from profile_uploads
        where lower(wallet_address) = lower(${walletAddress}) and created_at > now() - interval '24 hours'
      ), inserted as (
        insert into profile_uploads (signature, wallet_address)
        select ${signature.toLowerCase()}, ${walletAddress.toLowerCase()}
        from recent where recent.count < 10
        on conflict (signature) do nothing
        returning signature
      )
      select count(*)::int as count from inserted
    `;
    if (Number(authorizationRows[0]?.count ?? 0) !== 1) {
      return NextResponse.json({ error: 'Upload authorization was reused or daily limit reached' }, { status: 429 });
    }

    const uploadData = new FormData();
    uploadData.append('image', new Blob([imageBuffer], { type: image.type }), image.name);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: uploadData,
      signal: AbortSignal.timeout(15_000),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json.success) {
      console.error('ImgBB upload failed:', res.status, json?.error?.message ?? 'Unknown provider error');
      return NextResponse.json(
        { error: 'Failed to upload profile image' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      url: json.data.url,
      display_url: json.data.display_url,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Profile image upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload profile image' }, { status: 500 });
  }
}
