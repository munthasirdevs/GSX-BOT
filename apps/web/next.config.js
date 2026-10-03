const path = require("path");
const dotenv = require("dotenv");

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@discord-hub/database"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  },
};

module.exports = nextConfig;
