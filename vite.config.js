import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [{
    name: 'social-origin',
    transformIndexHtml(html) {
      const origin = (process.env.SITE_URL || 'https://bestbefore.gallery').replace(/\/$/, '');
      if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) throw new Error('SITE_URL must be an HTTPS origin');
      return html.replaceAll('https://bestbefore.gallery/', `${origin}/`);
    },
  }],
});
