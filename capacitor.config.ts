import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.robotrix.app',
  appName: 'Robotrix',
  webDir: 'dist',
  plugins:{
    CapacitorAssets: {
      pwa: false
    }
  }
};

export default config;
