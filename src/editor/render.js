let events = [];

export const Render = {
  registerEvent(node, type, callback, options) {
    let nodes = [node];
    if (node.synthetic && node.getEventNodes) {
      nodes = node.getEventNodes();
    }
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener(type, callback, options);
      events = events.concat({ node: nodes[i], type, callback, options });
    }
  },
  deregisterEvents(node) {
    events = events.filter((t) => {
      let old = t.node;
      if (t.node.synthetic) { old = t.node.element; }
      if (t.node === node || old === node || node.contains(old)) {
        old.removeEventListener(t.type, t.callback, t.options);
        return false;
      }
      return true;
    });
  },
  moveEvents(a, b) {
    events = events.map((t) => {
      if (t.node === a) {
        a.removeEventListener(t.type, t.callback, t.options);
        b.addEventListener(t.type, t.callback, t.options);
        return { node: b, type: t.type, callback: t.callback, options: t.options };
      }
      return t;
    });
  },
  syntheticToEl(newEl) {
    // Deal with synthetic elements / strings
    if (typeof newEl === 'object' && newEl.synthetic) {
      return newEl.element;
    } if (typeof newEl === 'string') {
      return document.createTextNode(newEl);
    }
    return newEl;
  },
  renderToEl(p, c) {
    if (c == null) { c = []; }
    if (p == null) {
      console.warn('Parent undefined. Parent:', p, 'Child:', c);
      return;
    }
    if (c instanceof HTMLCollection || c instanceof NodeList) {
      c = Array.prototype.slice.call(c);
    }
    if (!(c instanceof Array)) {
      c = [c];
    }
    let i;
    const children = Array.prototype.slice.call(p.childNodes); // Convert to array
    for (i = 0; i < children.length; i++) {
      const currentNode = children[i];
      // Remove excess children
      if (i >= c.length) {
        p.removeChild(currentNode);
        continue;
      }

      // Deal with synthetic elements / strings
      const newEl = Render.syntheticToEl(c[i]);

      // Update node
      if (currentNode.nodeValue == null
        && currentNode.nodeName === newEl.nodeName
        && currentNode.nodeType === newEl.nodeType) {
        const attrs = Array.prototype.slice.call(currentNode.attributes);
        const attrNames = attrs.map((t) => t.name);
        const newAttrs = Array.prototype.slice.call(newEl.attributes);
        // Remove unneeded attributes
        for (let j = 0; j < attrs.length; j++) {
          if (attrNames.includes(attrs[j].name)) { continue; }
          currentNode.removeAttribute(attrs[j].name);
        }
        // Set new/updated attributes
        for (let j = 0; j < newAttrs.length; j++) {
          currentNode.setAttribute(newAttrs[j].name, newAttrs[j].value);
        }

        // Copy over some input stuff
        if (!!newEl.checked !== !!currentNode.checked) {
          currentNode.checked = newEl.checked;
        }
        if (newEl.value !== currentNode.value) {
          currentNode.value = newEl.value;
        }
        if (newEl.type !== currentNode.type) {
          currentNode.type = newEl.type;
        }
        if (newEl.disabled !== currentNode.disabled) {
          currentNode.disabled = newEl.disabled;
        }
        if (newEl.className !== currentNode.className) {
          currentNode.className = newEl.className;
        }
        // Register / deregister events
        Render.deregisterEvents(currentNode);
        Render.moveEvents(newEl, currentNode);
        // Set innerHTML the same way
        Render.renderToEl(currentNode, newEl.childNodes);
        Render.deregisterEvents(newEl);
      } else { // Replace node
        Render.deregisterEvents(currentNode);
        currentNode.replaceWith(newEl);
      }
    }

    // Add extra children
    while (i < c.length) {
      const newEl = Render.syntheticToEl(c[i]);
      p.appendChild(newEl);
      i++;
    }
  },
};
