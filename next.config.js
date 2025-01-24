/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    domains: [
      'orbis.mypinata.cloud',
      'ipfs.io',
      'gateway.ipfs.io'
    ]
  },
  // Modern Next.js deployment configuration
  output: 'standalone'
}

module.exports = nextConfig