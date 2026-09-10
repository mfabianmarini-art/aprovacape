import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions default to a 1 MB request body — well under the 10 MB planta
      // upload and 15 MB documento upload this app validates for. Raised with headroom
      // for multipart/form-data overhead.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
