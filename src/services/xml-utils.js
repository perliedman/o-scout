export const createXml = (document, n) => {
  const node = document.createElement(n.type);
  n.id && (node.id = n.id);
  n.attrs &&
    Object.keys(n.attrs).forEach((attrName) =>
      node.setAttribute(attrName, n.attrs[attrName])
    );
  n.text && node.appendChild(document.createTextNode(n.text));
  n.children &&
    n.children.forEach((child) => node.appendChild(createXml(document, child)));

  return node;
};
