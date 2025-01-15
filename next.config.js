/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true, // Generates source maps for production builds
  webpack: (config, { dev, isServer }) => {
    if (dev && isServer) {
      config.devtool = "source-map"; // Enable source maps for server
    }
    return config;
  },
};

module.exports = nextConfig;
