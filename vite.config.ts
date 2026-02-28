import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined
          }

          if (/node_modules[\\/](pixi\.js|@pixi)[\\/]/.test(id)) {
            return "pixi"
          }

          if (
            id.includes("radix-ui") ||
            id.includes("@base-ui") ||
            id.includes("@hugeicons")
          ) {
            return "ui-vendor"
          }

          if (id.includes("react")) {
            return "react-vendor"
          }

          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
