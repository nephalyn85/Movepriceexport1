// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import fs from "fs";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
function copyPublicSkipLocked() {
  return {
    name: "copy-public-skip-locked",
    apply: "build",
    config() {
      return { build: { copyPublicDir: false } };
    },
    closeBundle() {
      const publicDir = path.resolve(__vite_injected_original_dirname, "public");
      const distDir = path.resolve(__vite_injected_original_dirname, "dist");
      function copyDir(src, dest) {
        fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
          const srcPath = path.join(src, entry);
          const destPath = path.join(dest, entry);
          try {
            const stat = fs.statSync(srcPath);
            if (stat.isDirectory()) {
              copyDir(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          } catch {
          }
        }
      }
      copyDir(publicDir, distDir);
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), copyPublicSkipLocked()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmZ1bmN0aW9uIGNvcHlQdWJsaWNTa2lwTG9ja2VkKCk6IGltcG9ydCgndml0ZScpLlBsdWdpbiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2NvcHktcHVibGljLXNraXAtbG9ja2VkJyxcbiAgICBhcHBseTogJ2J1aWxkJyxcbiAgICBjb25maWcoKSB7XG4gICAgICByZXR1cm4geyBidWlsZDogeyBjb3B5UHVibGljRGlyOiBmYWxzZSB9IH07XG4gICAgfSxcbiAgICBjbG9zZUJ1bmRsZSgpIHtcbiAgICAgIGNvbnN0IHB1YmxpY0RpciA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdwdWJsaWMnKTtcbiAgICAgIGNvbnN0IGRpc3REaXIgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZGlzdCcpO1xuICAgICAgZnVuY3Rpb24gY29weURpcihzcmM6IHN0cmluZywgZGVzdDogc3RyaW5nKSB7XG4gICAgICAgIGZzLm1rZGlyU3luYyhkZXN0LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBmcy5yZWFkZGlyU3luYyhzcmMpKSB7XG4gICAgICAgICAgY29uc3Qgc3JjUGF0aCA9IHBhdGguam9pbihzcmMsIGVudHJ5KTtcbiAgICAgICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihkZXN0LCBlbnRyeSk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyhzcmNQYXRoKTtcbiAgICAgICAgICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgY29weURpcihzcmNQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmcy5jb3B5RmlsZVN5bmMoc3JjUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gc2tpcCBsb2NrZWQgb3IgdW5hdmFpbGFibGUgZmlsZXNcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvcHlEaXIocHVibGljRGlyLCBkaXN0RGlyKTtcbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgY29weVB1YmxpY1NraXBMb2NrZWQoKV0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUhqQixJQUFNLG1DQUFtQztBQUt6QyxTQUFTLHVCQUE4QztBQUNyRCxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsSUFDUCxTQUFTO0FBQ1AsYUFBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLE1BQU0sRUFBRTtBQUFBLElBQzNDO0FBQUEsSUFDQSxjQUFjO0FBQ1osWUFBTSxZQUFZLEtBQUssUUFBUSxrQ0FBVyxRQUFRO0FBQ2xELFlBQU0sVUFBVSxLQUFLLFFBQVEsa0NBQVcsTUFBTTtBQUM5QyxlQUFTLFFBQVEsS0FBYSxNQUFjO0FBQzFDLFdBQUcsVUFBVSxNQUFNLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDdEMsbUJBQVcsU0FBUyxHQUFHLFlBQVksR0FBRyxHQUFHO0FBQ3ZDLGdCQUFNLFVBQVUsS0FBSyxLQUFLLEtBQUssS0FBSztBQUNwQyxnQkFBTSxXQUFXLEtBQUssS0FBSyxNQUFNLEtBQUs7QUFDdEMsY0FBSTtBQUNGLGtCQUFNLE9BQU8sR0FBRyxTQUFTLE9BQU87QUFDaEMsZ0JBQUksS0FBSyxZQUFZLEdBQUc7QUFDdEIsc0JBQVEsU0FBUyxRQUFRO0FBQUEsWUFDM0IsT0FBTztBQUNMLGlCQUFHLGFBQWEsU0FBUyxRQUFRO0FBQUEsWUFDbkM7QUFBQSxVQUNGLFFBQVE7QUFBQSxVQUVSO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFDQSxjQUFRLFdBQVcsT0FBTztBQUFBLElBQzVCO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQztBQUFBLEVBQ3pDLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
