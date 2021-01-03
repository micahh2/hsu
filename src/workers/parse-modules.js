
function parseResults(e) {
    lastSent = e.data.args;
    const fun = eval(e.data.fun);
    const replacements = e.data.replacements;
    const argKeys = Object.keys(e.data.replacements);
    for(let i of argKeys) {
      e.data.args[i] = eval(replacements[i]);
    }
    const updatedArgs = fun(e.data.args);
    for(let i of argKeys) {
      if (typeof updatedArgs[i] !== 'function') { continue; }
      updatedArgs[i] = null;
    }
}
