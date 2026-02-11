/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@qaskills/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

module.exports = nextConfig;
