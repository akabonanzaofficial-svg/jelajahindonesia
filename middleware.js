export const config = {
  matcher: '/artikel/:path*',
};

export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Deteksi bot Social Media & WhatsApp
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|LinkedInBot|Discordbot|Slackbot/i.test(userAgent);

  // JIKA MANUSIA: Alihkan (rewrite) secara internal ke index.html
  if (!isBot) {
    return new Response(null, {
      headers: {
        'x-middleware-rewrite': new URL('/index.html', request.url).toString(),
      },
    });
  }

  // JIKA BOT: Ambil ID artikel dari URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const postId = pathParts[pathParts.length - 1];

  try {
    // Ambil data artikel dari Cloudflare Worker
    const res = await fetch('https://jelajah-api.akabonanza-official.workers.dev/posts', {
      headers: { 'User-Agent': 'Vercel-Bot-Scraper' }
    });
    
    if (!res.ok) throw new Error('Gagal mengambil data');
    
    const json = await res.json();
    const posts = json.data || [];
    const post = posts.find(p => p.id === postId);

    if (post) {
      // PERBAIKAN: Ubah URL gambar menjadi Absolut (harus diawali https://)
      // Jika gambar dari CMS (dimulai dengan /), tambahkan domain di depannya
      const origin = url.origin; // Mengambil domain, contoh: https://jelajahindonesia.com
      const absoluteImageUrl = post.gambar.startsWith('http') 
                               ? post.gambar 
                               : `${origin}${post.gambar}`;

      // Sajikan HTML dengan meta tag untuk bot
      const html = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>${post.judul} — Jelajah Indonesia</title>
          <meta property="og:title" content="${post.judul}">
          <meta property="og:description" content="${post.ringkasan}">
          <meta property="og:image" content="${absoluteImageUrl}">
          <meta property="og:image:secure_url" content="${absoluteImageUrl}">
          <meta property="og:url" content="${url.href}">
          <meta property="og:type" content="article">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${post.judul}">
          <meta name="twitter:description" content="${post.ringkasan}">
          <meta name="twitter:image" content="${absoluteImageUrl}">
        </head>
        <body>
          <h1>${post.judul}</h1>
          <p>${post.ringkasan}</p>
          <img src="${absoluteImageUrl}" alt="${post.judul}">
        </body>
        </html>
      `;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  } catch (error) {
    console.error('Middleware Error:', error);
  }

  // Jika artikel tidak ditemukan, alihkan ke index.html
  return new Response(null, {
    headers: {
      'x-middleware-rewrite': new URL('/index.html', request.url).toString(),
    },
  });
}
