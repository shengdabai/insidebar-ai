import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          // Markup tests inspect local HTML; they do not validate remote assets.
          disableCSSFileLoading: true,
          disableJavaScriptFileLoading: true,
          disableIframePageLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/dist/',
        '**/.{idea,git,cache,output,temp}/',
      ],
    },
    setupFiles: ['./tests/setup.js'],
  },
});
