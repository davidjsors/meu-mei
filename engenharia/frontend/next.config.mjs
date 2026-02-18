/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Vercel build time environment variables might not be available in the same way.
    // We check if API_URL is set; otherwise, we fallback to a placeholder that won't break the build.
    // Ideally, NEXT_PUBLIC_API_URL should be set in Vercel project settings.
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Garantir que tem protocolo (https://) para não quebrar o build da Vercel
    // O erro mostra que a variável está como "meu-mei-backend.vercel.app" sem o https://
    if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
      apiUrl = `https://${apiUrl}`;
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
