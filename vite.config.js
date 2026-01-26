import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// GitHub Pages 部署时使用仓库名作为 base
const base = process.env.GITHUB_ACTIONS ? '/zozo_ad/' : '/'

export default defineConfig({
  plugins: [uni()],
  base: base,
  build: {
    outDir: 'dist/build/h5'
  }
})
