/* eslint-disable no-undef */
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        zlib: require.resolve('browserify-zlib'),
        stream: require.resolve('stream-browserify'),
      };

      webpackConfig.ignoreWarnings = [
        {
          module: /superstruct/,
        },
      ];

      return webpackConfig;
    },
  },

  devServer: (devServerConfig) => {
    devServerConfig.client = {
      overlay: {
        warnings: false,
        errors: true,
      },
    };
    return devServerConfig;
  },
};
