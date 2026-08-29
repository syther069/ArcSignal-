import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

    const uploadData = new FormData();
    uploadData.append('image', image);

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
