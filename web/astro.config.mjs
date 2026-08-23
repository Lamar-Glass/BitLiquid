import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://bitliquid.gitlawb.com',
  trailingSlash: 'always',
  redirects: {
    '/changelog/': 'https://github.com/Gitlawb/bitliquid/releases',
  },
  integrations: [sitemap()],
})
