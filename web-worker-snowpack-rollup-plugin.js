const { rollup } = require('rollup');

const workerBundles = {};
const inputOptions = { cache: true };
const outputOptions = { format: 'cjs' };
module.exports = (/* snowpackConfig, pluginOptions */) => ({
  name: 'web-worker-snowpack-rollup-plugin',
  resolve: {
    input: ['.js'],
    output: ['.js'],
  },
  async load({ filePath }) {
    if (!filePath.endsWith('worker.js')) { return null; }
    const bundle = await rollup({ ...inputOptions, input: filePath });
    workerBundles[filePath] = bundle;
    const { output } = await bundle.generate(outputOptions);
    const { code } = output[0];
    return code;
  },
  onChange({ filePath }) {
    Object.keys(workerBundles)
      .filter((t) => workerBundles[t].watchFiles.includes(filePath) && filePath !== t)
      .forEach((t) => this.markChanged(t));
  },
  async cleanup() {
    await Promise.all(
      Object.values(workerBundles).map((t) => t.close()),
    );
  },
});
