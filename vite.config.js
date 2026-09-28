import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // 资源用相对路径引用：内网部署时放在域名根目录或任意子目录都能直接跑。
  // 路由是 hash 模式，不依赖服务器重写规则，所以纯静态托管无需额外配置。
  base: './',
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    // echarts 是已知的大体积 vendor chunk，且只在访问统计分析页时才被懒加载，
    // 不会进入监测总览首屏，因此这里放宽体积告警阈值。
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts')) return 'echarts'
          if (id.includes('node_modules/leaflet')) return 'leaflet'
        },
      },
    },
  },
})
