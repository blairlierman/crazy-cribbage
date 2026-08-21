/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'Crazy Cribbage',
    slug: 'crazy-cribbage',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    experiments: {
      // Set via EXPO_BASE_URL env var during CI builds (e.g. "/repo/branch-name")
      ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
    },
  },
};
