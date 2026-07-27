import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: '/admin/',
    plugins: [react()],
    server: { port: 5173 },
    test: { environment: 'jsdom', setupFiles: './src/testSetup.ts' },
});
