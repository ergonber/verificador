/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // FORZA PAGES ROUTER
  experimental: {
    appDir: false  // Esto desactiva App Router
  },
  // Configuración para Pages Router
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Ignora errores de ESLint y TypeScript durante build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
}

module.exports = nextConfig
