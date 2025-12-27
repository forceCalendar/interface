import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'ForceCalendarUI',
      fileName: 'force-calendar-ui'
    },
    rollupOptions: {
      external: ['@forcecalendar/core'],
      output: {
        globals: {
          '@forcecalendar/core': 'ForceCalendarCore'
        }
      }
    }
  }
});