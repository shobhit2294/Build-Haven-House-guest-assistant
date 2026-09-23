import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = Number(env.PORT) || 3001;

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      proxy: {
        "/api": `http://127.0.0.1:${backendPort}`,
      },
    },
    build: {
      cssMinify: false,
    },
  };
});
