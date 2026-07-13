import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function resolveDomain(query: string): Promise<string | null> {
  try {
    const suggestRes = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`
    );
    if (suggestRes.ok) {
      const suggestions = await suggestRes.json();
      if (suggestions.length > 0 && suggestions[0].domain) {
        return suggestions[0].domain;
      }
    }
  } catch (e) {
    console.error('Clearbit autocomplete error:', e);
  }
  
  // Try DuckDuckGo Autocomplete as fallback
  try {
    const ddgRes = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query + ' official site')}&type=list`);
    if (ddgRes.ok) {
      const ddgData = await ddgRes.json();
      if (Array.isArray(ddgData) && ddgData.length > 1 && Array.isArray(ddgData[1]) && ddgData[1].length > 0) {
        const topResult = ddgData[1][0];
        // DuckDuckGo autocomplete doesn't always give domain, but sometimes gives URLs.
        const match = topResult.match(/https?:\/\/(?:www\.)?([^\/]+)/);
        if (match && match[1]) return match[1];
      }
    }
  } catch (e) {}

  // Fallback: guess the domain from the query
  let cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanQuery === 'chatgpt' || cleanQuery === 'openai') return 'openai.com';
  if (cleanQuery === 'x') return 'x.com';
  if (cleanQuery === 'twitter') return 'twitter.com';

  if (cleanQuery.length > 0) {
    return `${cleanQuery}.com`;
  }
  
  return null;
}

async function fetchLogoBuffer(domain: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const fetchUrls = [
    `https://cdn.brandfetch.io/${domain}/w/400/h/400`,
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icon.horse/icon/${domain}`, // excellent fallback
  ];

  for (const url of fetchUrls) {
    try {
      const imgRes = await fetch(url);
      if (imgRes.ok && imgRes.headers.get('content-type')?.startsWith('image')) {
        const arrayBuffer = await imgRes.arrayBuffer();
        return {
          buffer: Buffer.from(arrayBuffer),
          contentType: imgRes.headers.get('content-type') ?? 'image/png',
        };
      }
    } catch (e) {
      // Silently continue to the next fallback url
    }
  }
  return null;
}

function uploadToCloudinary(buffer: Buffer, publicId: string): Promise<{ secure_url: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'remindme/logos',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        format: 'png',
        transformation: [{ width: 128, height: 128, crop: 'pad', background: 'transparent' }],
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result as { secure_url: string });
      }
    );
    stream.end(buffer);
  });
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 500 });
    }

    const domain = await resolveDomain(query);
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const publicId = domain.replace(/\./g, '_');

    // Try to fetch existing from Cloudinary admin API
    try {
      const existing = await cloudinary.api.resource(`remindme/logos/${publicId}`, { resource_type: 'image' });
      if (existing?.secure_url) {
        return NextResponse.json({
          domain,
          logoUrl: existing.secure_url,
          colorAccent: '#3B82F6',
          cached: true,
        });
      }
    } catch {
      // Not cached yet — fetch and upload
    }

    const logoData = await fetchLogoBuffer(domain);
    if (!logoData) {
      return NextResponse.json({ error: 'Could not fetch logo' }, { status: 404 });
    }

    const uploaded = await uploadToCloudinary(logoData.buffer, publicId);

    return NextResponse.json({
      domain,
      logoUrl: uploaded.secure_url,
      colorAccent: '#3B82F6',
      cached: false,
    });
  } catch (error: unknown) {
    console.error('Logo resolve error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
