/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'viem',
      '@tanstack/react-query',
      'recharts',
    ],
  },
  images: {
    remotePatterns: [],
  },
  webpack: (config) => {
    // WalletConnect's logger optionally requires pino-pretty which is not
    // available in browser/edge environments. Stub it out so the build is clean.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
    };
    return config;
  },
};

export default nextConfig;


