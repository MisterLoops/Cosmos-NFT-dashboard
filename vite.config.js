import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  server: {
    host: '0.0.0.0',
  },
  optimizeDeps: {
    include: [
      '@cosmjs/crypto',
      '@cosmjs/encoding',
      '@cosmjs/proto-signing',
      '@cosmjs/stargate',
      '@keplr-wallet/types',
      '@skip-go/widget',
      'axios',
      'bech32',
      'js-sha3',
      'lucide-react',
      'vite-plugin-node-polyfills',
      'ethers',
    ],
  },
  build: {
    rollupOptions: {
      external: [
        '@cosmjs/crypto',
        '@cosmjs/encoding',
        '@cosmjs/proto-signing',
        '@cosmjs/stargate',
        '@keplr-wallet/types',
        '@skip-go/widget',
        'axios',
        'bech32',
        'js-sha3',
        'lucide-react',
        'vite-plugin-node-polyfills',
        'ethers',
      ],
    },
  },
});

