export const config = {
  // Hanya jalankan middleware di halaman detail artikel
  matcher: '/artikel/:path*',
};

// Daftar bot media sosial yang diperbarui (sesuai panduan)
const SOCIAL_BOTS = /Twitterbot|facebookexternalhit|Facebot|LinkedInBot|Pinterest|Slackbot|vkShare|W3C_Validator|WhatsApp|TelegramBot|Discordbot/i;

export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // JIKA YANG DATANG ADALAH MANUSIA: 
  // Alihkan (rewrite) secara internal ke index.html agar halaman tidak blank/404
  if (!SOCIAL_BOTS.test(userAgent)) {
    return new Response(null, {
      headers: {
        'x-middleware-rewrite': new URL('/index.html', request.url).toString(),
      },
    });
  }

  // JIKA YANG DATANG ADALAH BOT MEDIA SOSIAL:
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Ambil ID artikel dari URL terakhir (contoh: /artikel/post-123 -> post-123)
  const postId = pathParts[pathParts.length - 1];

  try {
    // Ambil data artikel terbaru langsung dari Cloudflare Worker
    const apiRes = await fetch('https://jelajah-api.akabonanza-official.workers.dev/posts', {
      headers: { 'User-Agent': 'Vercel-Bot-Scraper' }
    });
    
    if (!apiRes.ok) throw new Error('Gagal mengambil data dari API');
    
    const apiJson = await apiRes.json();
    const allData = apiJson.data || [];
    
    // Cari artikel yang ID-nya cocok
    const post = allData.find(p => p.id === postId);

    if (!post) {
      // Jika artikel tidak ada, kembalikan ke index.html
      return new Response(null, {
        headers: { 'x-middleware-rewrite': new URL('/index.html', request.url).toString() },
      });
    }

    // PERBAIKAN KRUSIAL: Pastikan URL Gambar Absolut (dimulai dengan https://)
    const origin = url.origin; 
    const absoluteImageUrl = post.gambar.startsWith('http') 
                             ? post.gambar 
                             : `${origin}${post.gambar}`;

    // Siapkan Meta Tag Dinamis
    const title = post.judul || 'Jelajah Indonesia';
    const description = post.ringkasan || 'Media perjalanan dan gaya hidup Nusantara.';
    const fullUrl = url.href;

    // Kembalikan HTML minimal ke Bot
    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>${title} — Jelajah Indonesia</title>
          <meta name="description" content="${description}">
          
          <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
          <meta property="og:title" content="${title}">
          <meta property="og:description" content="${description}">
          <meta property="og:image" content="${absoluteImageUrl}">
          <meta property="og:image:secure_url" content="${absoluteImageUrl}">
          <meta property="og:url" content="${fullUrl}">
          <meta property="og:type" content="article">
          
          <!-- Twitter Card -->
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${title}">
          <meta name="twitter:description" content="${description}">
          <meta name="twitter:image" content="${absoluteImageUrl}">
        </head>
        <body>
          <h1>${title}</h1>
          <p>${description}</p>
          <img src="${absoluteImageUrl}" alt="${title}">
        </body>
      </html>
    `;

    return new Response(html, { 
      headers: { 
        'content-type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60'
      } 
    });
    
  } catch (error) {
    console.error('Middleware Error:', error);
    // Jika error, biarkan halaman normal dimuat
    return new Response(null, {
      headers: { 'x-middleware-rewrite': new URL('/index.html', request.url).toString() },
    });
  }
}
