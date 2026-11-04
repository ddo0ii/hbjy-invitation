import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import hosting from './.openai/hosting.json';
import { sites } from './scripts/vite/sites-vite-plugin.ts';

export default defineConfig(async ({ mode }) => {
  if (mode !== 'sites') return { plugins: [react()], build: { target: 'es2022', sourcemap: false } };
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    plugins: [react(), sites({ mockAuth: false }), cloudflare({
      viteEnvironment: { name: 'server' },
      inspectorPort: false,
      config: {
        name: 'hbjy-invitation',
        main: './worker/index.ts',
        compatibility_date: '2026-11-01',
        compatibility_flags: ['nodejs_compat'],
        assets: { binding: 'ASSETS', not_found_handling: 'single-page-application', run_worker_first: true },
        d1_databases: [{ binding: hosting.d1, database_name: 'hbjy-local', database_id: '00000000-0000-4000-8000-000000000000' }],
        r2_buckets: [{ binding: hosting.r2, bucket_name: 'hbjy-local-photos' }],
      },
    })],
    build: { target: 'es2022', sourcemap: false },
  };
});
