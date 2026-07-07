import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.robotrix.app',
  appName: 'Robotrix',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  },
  plugins:{
    CapacitorAssets: {
      pwa: false
    }
  }
};

export default config;
