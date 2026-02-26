import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
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
        });
        console.log('✓ api/ → dist/api/');
      },
    },
  ],
})
