let lastSent;
self.onmessage = function(e) {
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

self.onmessage = function(e) {
  const { type } = e.data;
  if (!self.modules) {
    self.modules = true;
    for (let i of e.data.modules) {
      self[i.name] = eval(i.module);
    }
  }
  switch(type) {
    case 'update':
      self.args = args;
      return;
    case 'run':
      Physics.updatePhysicsState({ ...self.args, ...args })
      self.postMessage(updatedArgs);
      return;
  }
  throw Error('Unknown Message Type');
}
