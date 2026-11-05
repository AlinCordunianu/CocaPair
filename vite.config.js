import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react(), mkcert()] });
