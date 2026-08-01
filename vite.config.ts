import path from 'path';
import {defineConfig, Plugin} from 'vite';

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
          login: path.resolve(__dirname, 'pages/login.html'),
          signup: path.resolve(__dirname, 'pages/signup.html'),
          addListing: path.resolve(__dirname, 'pages/add-listing.html'),
          listing: path.resolve(__dirname, 'pages/listing.html'),
          allListings: path.resolve(__dirname, 'pages/all-listings.html'),
          profile: path.resolve(__dirname, 'pages/profile.html'),
          admin: path.resolve(__dirname, 'pages/admin.html'),
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
