export interface DomCssFixtureOptions {
  html?: string
  css?: string
  rootTag?: keyof HTMLElementTagNameMap
  rootAttributes?: Record<string, string>
}

export interface DomCssFixture {
  root: HTMLElement
  style: HTMLStyleElement
  query<T extends Element = HTMLElement>(selector: string): T | null
  queryAll<T extends Element = HTMLElement>(selector: string): T[]
  computedStyle(node: Element): CSSStyleDeclaration
  cssValue(node: Element, property: string): string
  setHtml(html: string): void
  setCss(css: string): void
  cleanup(): void
}

export function createDomCssFixture(options: DomCssFixtureOptions = {}): DomCssFixture {
  const root = document.createElement(options.rootTag ?? 'div')
  root.setAttribute('data-spw-component', 'dom-css-fixture')

  for (const [name, value] of Object.entries(options.rootAttributes ?? {})) {
    root.setAttribute(name, value)
  }

  root.innerHTML = options.html ?? ''

  const style = document.createElement('style')
  style.setAttribute('data-spw-component', 'dom-css-fixture-style')
  style.textContent = options.css ?? ''

  document.head.appendChild(style)
  document.body.appendChild(root)

  return {
    root,
    style,
    query: <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector),
    queryAll: <T extends Element = HTMLElement>(selector: string) => Array.from(root.querySelectorAll<T>(selector)),
    computedStyle: (node: Element) => window.getComputedStyle(node),
    cssValue: (node: Element, property: string) => window.getComputedStyle(node).getPropertyValue(property).trim(),
    setHtml: (html: string) => {
      root.innerHTML = html
    },
    setCss: (css: string) => {
      style.textContent = css
    },
    cleanup: () => {
      style.remove()
      root.remove()
    },
  }
}
