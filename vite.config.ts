import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Repo deploys to https://piefayth.github.io/chord-roll-proto/
export default defineConfig({
  base: '/chord-roll-proto/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
