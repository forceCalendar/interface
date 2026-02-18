import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      // Main entry point for the library
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ForceCalendarInterface',
      // Output file names
      fileName: (format) => {
        if (format === 'es') return 'force-calendar-interface.esm.js';
        if (format === 'umd') return 'force-calendar-interface.umd.js';
        return `force-calendar-interface.${format}.js`;
      }
    },
    rollupOptions: {
      // @forcecalendar/core is a peer dependency — consumers supply it.
      // Bundling it would cause it to be loaded twice in projects that also
      // import core directly, bloating every consumer's bundle unnecessarily.
      external: ['@forcecalendar/core'],
      output: {
        // Global variable name for UMD builds (script-tag / CDN consumers)
        globals: {
          '@forcecalendar/core': 'ForceCalendarCore'
        }
      }
    },
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Clear output directory before build
    emptyOutDir: true,
    // Output directory
    outDir: 'dist'
  },
  server: {
    port: 5000,
    open: true
  }
});