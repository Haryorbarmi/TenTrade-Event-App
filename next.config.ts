import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: lets another PC on the same Wi-Fi open the laptop's dev server
  // (http://<laptop-ip>:3000) with a working page. Change it if the laptop's address changes.
  allowedDevOrigins: ["192.168.18.3"],
};

export default nextConfig;
