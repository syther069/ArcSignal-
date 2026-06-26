/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

