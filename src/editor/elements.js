export const Elements = {
  wrap(contLabel, nodes) {
    const w = typeof contLabel === 'string'
      ? document.createElement(contLabel)
      : contLabel;

    if (!(nodes instanceof Array)) {
      nodes = [nodes]
    }
    for (let i = 0; i < nodes.length; i++) {
      if (typeof nodes[i] === 'string') {
        nodes[i] = document.createTextNode(nodes[i]);
      }
      w.appendChild(nodes[i]);
    }
    return w;
  },
  createCheckbox(name, labelText, checked) {
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.name = name;
    check.id = `${name}-checkbox`;
    check.checked = !!checked;
    const label = document.createElement('label');
    const labelTextNode = document.createTextNode(labelText);
    label.htmlFor = check.id;
    label.appendChild(labelTextNode);

    const cont = document.createElement('span');
    cont.appendChild(check);
    cont.appendChild(label);

    return {
      synthetic: true,
      element: cont,
      getEventNodes: () => [check],
    };
  },
  create(contLabel, attrs = {}) {
    const el = document.createElement(contLabel);
    const keys = Object.keys(attrs) || [];
    for (let i = 0; i < keys.length; i++) {
      el.setAttribute(""+keys[i], ""+attrs[keys[i]]);
    }
    return el;
  },
};
