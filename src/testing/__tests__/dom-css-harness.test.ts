import { afterEach, describe, expect, it } from 'vitest'
import { createDomCssFixture, type DomCssFixture } from '../dom-css-harness'

const activeFixtures: DomCssFixture[] = []

afterEach(() => {
  while (activeFixtures.length > 0) {
    activeFixtures.pop()?.cleanup()
  }
})

describe('createDomCssFixture', () => {
  it('mounts markup and allows scoped querying', () => {
    const fixture = createDomCssFixture({
      html: '<button class="spw-ui-trigger" data-spw-component="trigger">open</button>',
    })
    activeFixtures.push(fixture)

    const button = fixture.query<HTMLButtonElement>('.spw-ui-trigger')

    expect(button).not.toBeNull()
    expect(button?.dataset.spwComponent).toBe('trigger')
  })

  it('applies CSS and exposes computed style values', () => {
    const fixture = createDomCssFixture({
      html: '<div class="chip">signal</div>',
      css: '.chip { --spw-gap: 12px; color: rgb(255, 0, 0); }',
    })
    activeFixtures.push(fixture)

    const chip = fixture.query('.chip')
    expect(chip).not.toBeNull()

    expect(fixture.cssValue(chip!, '--spw-gap')).toBe('12px')
    expect(fixture.cssValue(chip!, 'color')).toContain('255')
  })

  it('supports DOM/CSS updates for feature probes', () => {
    const fixture = createDomCssFixture({
      html: '<section class="panel">alpha</section>',
      css: '.panel { opacity: 0.4; }',
    })
    activeFixtures.push(fixture)

    const panel = fixture.query('.panel')
    expect(panel).not.toBeNull()
    expect(fixture.cssValue(panel!, 'opacity')).toBe('0.4')

    fixture.setHtml('<section class="panel active">beta</section>')
    fixture.setCss('.panel.active { opacity: 1; }')

    const activePanel = fixture.query('.panel.active')
    expect(activePanel).not.toBeNull()
    expect(fixture.cssValue(activePanel!, 'opacity')).toBe('1')
  })
})
