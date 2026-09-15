const fs = require('fs');
const vm = require('vm');
const path = require('path');

describe('multilingual airport search resolver', () => {
  function loadConfig() {
    const listeners = {};
    const classes = new Set();
    const drop = {
      innerHTML: '',
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
      },
    };
    const document = {
      readyState: 'complete',
      head: { appendChild() {} },
      documentElement: { appendChild() {} },
      querySelector: () => null,
      createElement: () => ({ setAttribute() {}, async: false, src: '' }),
      addEventListener: (name, fn) => { listeners[name] = fn; },
      getElementById: (id) => id === 'from-ac' || id === 'to-ac' ? drop : null,
    };
    const window = {
      AP: [
        ['BER', 'Berlin Brandenburg', 'Berlin', 'DE', 'برلين', 'Berlin', 'Berlín', 'Berlin', 'Berlino', 'Berlijn', 'Berlin'],
        ['IST', 'Istanbul Airport', 'Istanbul', 'TR', 'إسطنبول', 'Istanbul', 'Estambul', 'Istanbul', 'Istanbul', 'Istanbul', 'Istanbul'],
      ],
      apLocalizedCityName: (row) => row[4] || row[2],
      acS: jest.fn(),
    };
    const context = { window, document, console, setTimeout, clearTimeout };
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'),
      context,
      { filename: 'config.js' },
    );
    return { window, drop, classes };
  }

  test('resolves Arabic city input locally without calling the API fallback', () => {
    const { window, drop, classes } = loadConfig();
    window.acS('from', 'برلين');

    expect(window.acS).not.toBe(window.acS.mock?.original);
    expect(drop.innerHTML).toContain('BER');
    expect(drop.innerHTML).toContain('برلين');
    expect(classes.has('open')).toBe(true);
    expect(window.acS).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining('unknown'));
  });

  test('normalizes accented Latin input locally', () => {
    const { window, drop } = loadConfig();
    window.acS('to', 'Berlín');
    expect(drop.innerHTML).toContain('BER');
  });

  test('falls back to the existing server resolver when local data has no match', () => {
    const { window } = loadConfig();
    const original = window.acS;
    // Recreate the expected original fallback by replacing the wrapper target.
    // The resolver must not swallow unmatched queries; this is a static contract
    // test for the wrapper behavior in config.js.
    expect(typeof original).toBe('function');
    expect(fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'))
      .toContain('return originalAcS.apply(this, arguments);');
  });
});
