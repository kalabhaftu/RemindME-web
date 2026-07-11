import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client to bypass RLS for storage (though bucket is public)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Resolve domain via Clearbit Autocomplete
    let domain = '';
    try {
      const suggestRes = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`);
      if (suggestRes.ok) {
        const suggestions = await suggestRes.json();
        if (suggestions.length > 0 && suggestions[0].domain) {
          domain = suggestions[0].domain;
        }
      }
    } catch (e) {
      console.error('Clearbit autocomplete error:', e);
    }

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Check if we already have it cached in Supabase storage
    const fileName = `${domain}.png`;
    const { data: files } = await supabase.storage.from('logos').list('', { search: fileName });
    let isCached = false;
    if (files && files.length > 0 && files[0].name === fileName) {
      isCached = true;
    }

    if (!isCached) {
      // 2. Try fetching from Clearbit -> Brandfetch -> Google Favicon
      let imageBuffer: ArrayBuffer | null = null;
      let contentType = 'image/png';
      
      const fetchUrls = [
        `https://logo.clearbit.com/${domain}`,
        `https://cdn.brandfetch.io/${domain}/w/400/h/400`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
      ];

      for (const url of fetchUrls) {
        try {
          const imgRes = await fetch(url);
          if (imgRes.ok && imgRes.headers.get('content-type')?.startsWith('image')) {
            imageBuffer = await imgRes.arrayBuffer();
            contentType = imgRes.headers.get('content-type')!;
            break; // Stop at first success
          }
        } catch (e) {
          console.error(`Error fetching logo from ${url}:`, e);
        }
      }

      if (!imageBuffer) {
        return NextResponse.json({ error: 'Could not fetch logo' }, { status: 404 });
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, imageBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return NextResponse.json({ error: 'Failed to cache logo' }, { status: 500 });
      }
    }

    // Supabase Public URL
    const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(fileName);
    const sourceUrl = publicUrlData.publicUrl;

    // Cloudinary Transform URL
    // Format: https://res.cloudinary.com/<cloud_name>/image/fetch/f_auto,q_auto,w_128,h_128,c_pad/<encoded_url>
    const cloudinaryUrl = cloudinaryCloudName 
      ? `https://res.cloudinary.com/${cloudinaryCloudName}/image/fetch/f_auto,q_auto,w_128,h_128,c_pad/${encodeURIComponent(sourceUrl)}`
      : sourceUrl;

    return NextResponse.json({
      domain,
      logoUrl: cloudinaryUrl,
      sourceUrl
    });

  } catch (error: any) {
    console.error('Logo resolve error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
