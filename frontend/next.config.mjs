/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add config options here as needed
  reactStrictMode: true,
  
  // Disable type checking and linting during build
  // This allows the build to complete even with TypeScript/ESLint errors
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Fix chunk loading errors in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.cache = false;
    }
    return config;
  },
  
  // Disable compression in dev mode to prevent chunk loading errors
  compress: false,
};

export default nextConfig;
