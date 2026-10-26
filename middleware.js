export const config = {
  matcher: '/artikel/:path*',
};

export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Deteksi bot Social Media & WhatsApp
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|LinkedInBot|Discordbot|Slackbot/i.test(userAgent);

  // JIKA BUKAN BOT (Manusia): Langsung sajikan index.html
  // Ini akan mencegah error 404 saat halaman di-refresh
  if (!isBot) {
    const url = new URL('/index.html', request.url);
    return fetch(url);
  }

  // JIKA BOT: Ambil ID artikel dari URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const postId = pathParts[pathParts.length - 1];

  try {
    // Ambil data artikel dari Worker
    const res = await fetch('https://jelajah-api.akabonanza-official.workers.dev/posts', {
      headers: { 'User-Agent': 'Vercel-Bot-Scraper' }
    });
    
    if (!res.ok) throw new Error('Gagal mengambil data dari Worker');
    
    const json = await res.json();
    const posts = json.data || [];
    const post = posts.find(p => p.id === postId);

    if (post) {
      // Sajikan HTML khusus untuk bot dengan meta tag dinamis
      const html = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>${post.judul} — Jelajah Indonesia</title>
          <meta property="og:title" content="${post.judul}">
          <meta property="og:description" content="${post.ringkasan}">
          <meta property="og:image" content="${post.gambar}">
          <meta property="og:url" content="${url.href}">
          <meta property="og:type" content="article">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${post.judul}">
          <meta name="twitter:description" content="${post.ringkasan}">
          <meta name="twitter:image" content="${post.gambar}">
        </head>
        <body>
          <h1>${post.judul}</h1>
          <p>${post.ringkasan}</p>
          <img src="${post.gambar}" alt="${post.judul}">
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

  // Jika artikel tidak ditemukan, kembalikan ke index.html
  const fallbackUrl = new URL('/index.html', request.url);
  return fetch(fallbackUrl);
}
