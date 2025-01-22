import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        outDir: 'build',
        rollupOptions: {
            input: './src/index.html',
        },
    },
    server: {
        open: true,
    },
});
