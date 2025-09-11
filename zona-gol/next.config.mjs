/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig
