// Small helpers for building the screens without a framework.
// Every string goes in as text. The one exception is setTrustedHtml, for the recipe file's *_html
// fields, which the export generates from the owner's own cards (brief section 5).

/**
 * Make an element.
 * @param {string} tag
 * @param {object} [props] `class`, `text`, `on` ({ click: fn }), `data` ({ id: 'x' }); anything else is
 *   set as an attribute. A false or null value leaves the attribute off; true sets it empty.
 * @param {...(Node | string | null | false | undefined | (Node | string | null | false)[])} children
 */
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (name === 'class') node.className = value;
    else if (name === 'text') node.textContent = value;
    else if (name === 'on') for (const [type, handler] of Object.entries(value)) node.addEventListener(type, handler);
    else if (name === 'data') for (const [key, data] of Object.entries(value)) node.dataset[key] = data;
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Remove everything inside a node. */
export function clear(node) {
  node.replaceChildren();
  return node;
}

/**
 * Insert one of the recipe file's *_html fields. This is the only place the app parses HTML.
 * Web links are made to open outside the app; links to other cards ("#/recipe/<id>") stay inside it.
 */
export function setTrustedHtml(node, html) {
  node.innerHTML = String(html || '');
  for (const link of node.querySelectorAll('a[href]')) {
    if (link.getAttribute('href').startsWith('#')) continue;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
  return node;
}

/** A link that opens outside the app, or plain text when the address is not a web address. */
export function webLink(label, url) {
  if (!/^https?:\/\//.test(String(url || ''))) return document.createTextNode(label);
  return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: label });
}

/** A + or - button with a spoken label. */
export function stepButton(symbol, label, onClick, disabled = false) {
  return h('button', { type: 'button', class: 'step-btn', 'aria-label': label, disabled, on: { click: onClick } }, symbol);
}
