import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const serverTarget = env.VITE_DEV_SERVER_URL || "http://localhost:8080";

  return {
    plugins: [solidPlugin()],
    build: {
      target: "esnext",
    },
    server: {
      proxy: {
        "/api": {
          target: serverTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
