import withPWA from 'next-pwa';
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker deployments
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuración para excluir dependencias nativas que causan problemas con Webpack
  webpack: (config, { isServer }) => {
    // Excluir dependencias nativas que no son compatibles con el navegador
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        canvas: false,
        'canvas-prebuilt': false,
        '@mapbox/node-pre-gyp': false,
        'utf-8-validate': false,
        bufferutil: false,
        'mock-aws-s3': false,
        'aws-sdk': false,
        'nock': false,
        'node-gyp': false,
        'npm': false,
        os: false,
      };

      // Excluir módulos específicos de Node.js del bundle del cliente
      config.externals = [...(config.externals || []), {
        '@tensorflow/tfjs-node': 'commonjs @tensorflow/tfjs-node',
        'jimp': 'commonjs jimp',
        'canvas': 'commonjs canvas',
        'aws-sdk': 'commonjs aws-sdk',
        'nock': 'commonjs nock',
        'node-gyp': 'commonjs node-gyp',
        'npm': 'commonjs npm'
      }];
    }

    // Excluir archivos HTML específicos que están causando problemas
    config.module.rules.push({
      test: /\.html$/,
      loader: 'ignore-loader',
    });
    
    // Ignorar archivos .cs de node-gyp
    config.module.rules.push({
      test: /\.cs$/,
      loader: 'ignore-loader',
    });

    return config;
  },
}

// PWA Configuration
const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev to avoid caching issues
  runtimeCaching: [
    {
      // Cache API responses
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // Cache images
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      // Cache fonts
      urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'font-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      // Cache static assets
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
    {
      // Default handler for pages
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'page-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
  fallbacks: {
    document: '/offline', // Offline fallback page
  },
});

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Organization and project from Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
};

// Combine PWA and Sentry configs
const configWithPWA = withPWAConfig(nextConfig);

export default withSentryConfig(configWithPWA, {
  org: "gustavo-q2",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // tunnelRoute deshabilitado - causaba problemas con el middleware
  disableLogger: true,
});
