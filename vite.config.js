import { defineConfig } from 'vite';

export default defineConfig({
    root: './src',
    build: {
        outDir: '../build',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: './src/index.html'
            }
        }
    },
    server: {
        open: false
    }
});
