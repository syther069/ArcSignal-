import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    const apiKey = process.env.IMGBB_API_KEY || '2c45e0f5e98e44a1de5d7c1c2e7fc870';
    const uploadData = new FormData();
    uploadData.append('image', image);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: uploadData,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return NextResponse.json(
        { error: json?.error?.message || 'Failed to upload image to ImgBB' },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: json.data.url,
      display_url: json.data.display_url,
    });
  } catch (error) {
    console.error('Profile image upload failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
