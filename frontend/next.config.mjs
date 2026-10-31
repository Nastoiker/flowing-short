/** @type {import('next').NextConfig} */
import { fileURLToPath } from 'node:url';
export default {
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { cpus: 2 },
  async rewrites() {
    return [{ source: '/api/:path*', destination: (process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000') + '/:path*' }];
  },
};
