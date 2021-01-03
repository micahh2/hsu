// import { Changes } from './changes.js';
const processes = {};

export const Process = {
  spawn(modules, fun, args) {
    const moduleCodes = modules.map((t) => {
      const m = t.toString();
      const prefix = 'const export';
      return {
        name: m.slice(m.indexOf(prefix) + prefix.length, m.indexOf('= {')).trim(),
        module: `'use strict';(function() { return ${m.replace('export const', 'const')}; })()`,
      };
    });
    const processKey = [].concat(modules).map((t) => t.name).join('|');
    const code = `(${fun})`;
    const updatedArgs = { ...args };
    const argKeys = Object.keys(args);
    const replacements = {};
    for (const i of argKeys) {
      if (typeof updatedArgs[i] !== 'function') { continue; }
      let funCode = `${updatedArgs[i]}`;
      if (!funCode.startsWith('function') && !funCode.startsWith('() =>')) {
        funCode = `function ${funCode}`;
      }
      replacements[i] = `(${funCode})`;
      updatedArgs[i] = null;
    }
    const oldp = processes[processKey];
    const worker = !oldp || oldp.running ? new Worker('./worker.js') : oldp.worker;
    const p = new Promise((res) => {
      processes[processKey] = { running: true, worker };
      worker.postMessage({ modules: moduleCodes, fun: code, args: updatedArgs, replacements });
      worker.onmessage = (e) => {
        for (const i of Object.keys(replacements)) {
          e.data[i] = args[i];
        }
        res(e.data);
        processes[processKey] = { running: false, worker };
      };
    });
    return p;
  },
};
