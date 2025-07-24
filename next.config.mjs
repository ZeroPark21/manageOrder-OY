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
  serverExternalPackages: ['@supabase/supabase-js'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude heavy client-side libraries from server bundle
      config.externals = [...(config.externals || []), 'recharts']
    }
    return config
  }
}

export default nextConfig
