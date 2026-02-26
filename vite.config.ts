import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read .env + .env.development.local etc. so we can inspect VITE_API_URL
  const env = loadEnv(mode, process.cwd(), '')

  // If VITE_API_URL is a relative path (e.g. "/api") we're running against the
  // local Docker stack → add a dev-server proxy so CORS is irrelevant.
  // If it's an absolute URL (e.g. "https://bookitty.bidebliss.com/api") the
  // browser calls the remote server directly – CORS is handled there.
  const useProxy = (env.VITE_API_URL ?? '').startsWith('/')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Copy the api/ folder into dist/api/ after every build.
        // dist/ is already in .gitignore, so credentials in config.php never hit GitHub.
        name: 'copy-api',
        closeBundle() {
          cpSync(resolve(__dirname, 'api'), resolve(__dirname, 'dist/api'), {
            recursive: true,
          })
          console.log('[build] api/ -> dist/api/')
        },
      },
    ],
    server: useProxy
      ? {
          proxy: {
            // /api/* → http://localhost:8080/api/*  (PHP+Apache Docker container)
            '/api': { target: 'http://localhost:8080', changeOrigin: true },
          },
        }
      : {},
  }
})
