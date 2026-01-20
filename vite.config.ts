import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      optimizeDeps: {
        esbuildOptions: {
          target: 'esnext'
        }
      },
      build: {
        target: 'esnext'
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      optimizeDeps: {
        exclude: ['pdfjs-dist'],
        esbuildOptions: {
          target: 'esnext',
          supported: {
            'top-level-await': true
          },
        }
      },
      esbuild: {
        supported: {
          'top-level-await': true
        },
      },
      build: {
        target: 'esnext'
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext'
      },
      esbuild: {
        supported: {
          'top-level-await': true
        },
      },
      
      optimizeDeps: {
        esbuildOptions: {
          target: 'esnext'
        }
      },
      build: {
        target: 'esnext'
      }
    };
});
