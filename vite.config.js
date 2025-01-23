import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const projectRoot = process.cwd();
    
    const env = loadEnv(mode, projectRoot, 'VITE_');
    
    console.log('Loading environment:', {
        mode,
        env,
        projectRoot
    });

    return {
        root: './src',
        base: env.VITE_BASE_PATH || '/',
        envDir: projectRoot, 
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
    };
});
