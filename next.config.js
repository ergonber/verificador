/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Opcional: Configurar headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
