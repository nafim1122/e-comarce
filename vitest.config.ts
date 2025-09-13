import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test-setup.ts'],
  // Only include project unit tests under src to avoid running library or e2e tests
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  exclude: ['**/e2e/**', '**/*.e2e.*', '**/playwright/**', 'node_modules/**', 'server/**'],
  },
});
