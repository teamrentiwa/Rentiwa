import path from 'path';
import { defineConfig, Plugin } from 'vite';

const adminRewritePlugin = (): Plugin => ({
  name: 'admin-rewrite',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/admin' || req.url === '/admin/') {
        req.url = '/pages/admin.html';
      }
      next();
    });
  }
});

export default defineConfig(() => {
  return {
    plugins: [adminRewritePlugin()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),

          'pages/login': path.resolve(__dirname, 'pages/login.html'),
          'pages/signup': path.resolve(__dirname, 'pages/signup.html'),
          'pages/add-listing': path.resolve(__dirname, 'pages/add-listing.html'),
          'pages/listing': path.resolve(__dirname, 'pages/listing.html'),
          'pages/all-listings': path.resolve(__dirname, 'pages/all-listings.html'),
          'pages/profile': path.resolve(__dirname, 'pages/profile.html'),
          'pages/admin': path.resolve(__dirname, 'pages/admin.html'),

          // IMPORTANT: These two pages were missing
          'pages/promote': path.resolve(__dirname, 'pages/promote.html'),
          'pages/terms': path.resolve(__dirname, 'pages/terms.html'),
        },
      },
    },

    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
