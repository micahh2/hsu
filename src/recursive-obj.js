export const RecursiveObj = {
  largeRandom() {
    return `ref:${Math.floor(Math.random() * 100_000_000_000)}`;
  },
  flatten(a, references = {}, found = []) {
    if (typeof a !== 'object') { return { obj: a, references, found }; }
    const keys = Object.keys(a);
    const newObj = a instanceof Array ? [] : {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      // Already been cataloged
      const kvPair = found.find(({ v }) => v === a[key]);
      if (kvPair) {
        newObj[key] = kvPair.k;
        continue;
      }
      const r = { k: RecursiveObj.largeRandom() };
      const flattened = RecursiveObj.flatten(
        a[key],
        references,
        found.concat({ v: a[key], k: r.k }),
      );
      r.v = flattened.obj;

      references = { // eslint-disable-line no-param-reassign
        ...references,
        ...flattened.references,
        [r.k]: r.v,
      };
      found = flattened.found; // eslint-disable-line no-param-reassign

      newObj[key] = flattened.obj;
    }
    return { obj: newObj, references, found };
  },
  inflate(a, references, inflated = {}) {
    if (typeof a !== 'object') { return a; }
    const keys = Object.keys(a);
    const newObj = a instanceof Array ? [] : {};
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const val = a[key];
      // Already been inflated
      if (typeof val === 'string' && inflated[val] != null) {
        newObj[key] = inflated[val];
        continue;
      }
      // Uninflated reference
      if (typeof val === 'string' && references[val] != null) {
        const flat = { ...references[val] };
        inflated[val] = flat; // eslint-disable-line no-param-reassign
        const filled = RecursiveObj.inflate(flat, references, inflated);
        // Move the inflated properties over to the "flat" object
        Object.keys(filled).forEach((t) => { flat[t] = filled[t]; });
        newObj[key] = inflated[val];
        continue;
      }
      // Not a reference
      newObj[key] = RecursiveObj.inflate(val, references, inflated);
    }
    return newObj;
  },
  stringify(a) {
    const { obj, references } = RecursiveObj.flatten(a);
    return JSON.stringify({ obj, references });
  },
  parse(a) {
    const { obj, references } = JSON.parse(a);
    return RecursiveObj.inflate(obj, references);
  },
};
