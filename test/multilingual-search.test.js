const fs = require('fs');
const vm = require('vm');
const path = require('path');

describe('multilingual airport search resolver', () => {
  function loadConfig() {
    const classes = new Set();
    const drop = {
      innerHTML: '',
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
      },
    };
    let fallbackCalls = 0;
    const document = {
      readyState: 'complete',
      head: { appendChild() {} },
      documentElement: { appendChild() {} },
      querySelector: () => null,
      createElement: () => ({ setAttribute() {}, async: false, src: '' }),
      addEventListener() {},
      getElementById: (id) => id === 'from-ac' || id === 'to-ac' ? drop : null,
    };
    const window = {
      AP: [
        ['BER', 'Berlin Brandenburg', 'Berlin', 'DE', 'برلين', 'Berlin', 'Berlín', 'Berlin', 'Berlino', 'Berlijn', 'Berlin'],
        ['IST', 'Istanbul Airport', 'Istanbul', 'TR', 'إسطنبول', 'Istanbul', 'Estambul', 'Istanbul', 'Istanbul', 'Istanbul', 'Istanbul'],
      ],
      apLocalizedCityName: (row) => row[4] || row[2],
      acS: () => { fallbackCalls += 1; },
    };
    const context = { window, document, console, setTimeout, clearTimeout };
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'),
      context,
      { filename: 'config.js' },
    );
    return { window, drop, classes, getFallbackCalls: () => fallbackCalls };
  }

  test('resolves Arabic city input locally without calling the API fallback', () => {
    const { window, drop, classes, getFallbackCalls } = loadConfig();
    window.acS('from', 'برلين');

    expect(drop.innerHTML).toContain('BER');
    expect(drop.innerHTML).toContain('برلين');
    expect(classes.has('open')).toBe(true);
    expect(getFallbackCalls()).toBe(0);
  });

  test('normalizes accented Latin input locally', () => {
    const { window, drop, getFallbackCalls } = loadConfig();
    window.acS('to', 'Berlín');
    expect(drop.innerHTML).toContain('BER');
    expect(getFallbackCalls()).toBe(0);
  });

  test('falls back to the existing server resolver when local data has no match', () => {
    const { window, getFallbackCalls } = loadConfig();
    window.acS('to', 'zzzzzz');
    expect(getFallbackCalls()).toBe(1);
  });
});
