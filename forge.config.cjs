const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const isWindows = process.platform === 'win32';
const serverBinary = isWindows ? './dist/server.exe' : './dist/server';

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [serverBinary, './server/migrations'], // Server binary + migration files in Resources/
    icon: './assets/icon',      // .icns for macOS, .ico for Windows (omit extension)
    // osxSign: {},
    ignore: (filePath) => {
      if (!filePath) return false;

      const included = [
        /^\/electron(\/|$)/,
        /^\/dist(\/|$)/,
        /^\/shared(\/|$)/,
        /^\/package\.json$/,
        /^\/node_modules(\/|$)/,
      ];

      return !included.some((re) => re.test(filePath));
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Zidan241',
          name: 'Kairos'
        },
        prerelease: false,
        draft: true
      }
    }
  ]
};
