import { Num, NumLike } from './num';

describe('Num', () => {
  describe('Erzeugung', () => {
    it('stellt Konstanten bereit', () => {
      expect(Num.ZERO.toNumber()).toBe(0);
      expect(Num.ONE.toNumber()).toBe(1);
    });

    it('erzeugt aus number, string und Num', () => {
      const value = Num.from(1284);
      expect(value.toNumber()).toBe(1284);
      expect(Num.from('1284').eq(value)).toBe(true);
      expect(Num.from(value)).toBe(value);
    });

    it.each([
      ['1.5', 1.5],
      ['+1.5', 1.5],
      ['-1.5', -1.5],
      ['.5', 0.5],
      ['5.', 5],
      ['0012.50', 12.5],
      ['0.00125', 0.00125],
      ['1E3', 1000],
      ['1.5e+3', 1500],
      ['1500e-3', 1.5],
      ['0', 0],
      ['-0.0e99', 0],
    ])('liest %s', (text, expected) => {
      expect(Num.from(text).toNumber()).toBe(expected);
    });

    it('liest Zahlen jenseits des number-Bereichs', () => {
      const value = Num.from('1E400');
      expect([value.mantissa, value.exponent]).toEqual([1, 400]);
      const digits = Num.from(`12${'0'.repeat(400)}`);
      expect([digits.mantissa, digits.exponent]).toEqual([1.2, 401]);
    });

    it('trägt beim Einlesen in den Exponenten über', () => {
      const value = Num.from('9.99999999999999999999');
      expect([value.mantissa, value.exponent]).toEqual([1, 1]);
    });

    it('behandelt -0 als 0', () => {
      const value = Num.from(-0);
      expect(Object.is(value.mantissa, 0)).toBe(true);
      expect(value.isNegative()).toBe(false);
      expect(Object.is(Num.from(5).sub(5).toNumber(), 0)).toBe(true);
    });

    it('macht winzige Beträge zu 0', () => {
      expect(Num.from('1e-9000000000000000').isZero()).toBe(true);
      expect(Num.from(`1e-${'9'.repeat(400)}`).isZero()).toBe(true);
    });

    it.each([
      [NaN],
      [Infinity],
      [-Infinity],
      [''],
      [' 1'],
      ['1 '],
      ['abc'],
      ['12abc'],
      ['1e5x'],
      ['e5'],
      ['.'],
      ['1e'],
      ['1,5'],
      ['0x10'],
      ['NaN'],
      ['Infinity'],
      ['-Infinity'],
      ['1e9000000000000000'],
      [`1e${'9'.repeat(400)}`],
      ['9.99999999999999999999e8999999999999999'],
    ])('lehnt %s ab', (value) => {
      expect(() => Num.from(value)).toThrow(RangeError);
    });

    it.each([[null], [undefined], [{}], [true]])('lehnt den Typ %s ab', (value) => {
      expect(() => Num.from(value as unknown as NumLike)).toThrow(RangeError);
    });
  });

  describe('Cache für number-Werte', () => {
    /** Mehr verschiedene Zahlen, als der Cache fasst; er wird dabei mindestens einmal geleert. */
    const overflowCache = (): void => {
      for (let i = 0; i < 2100; i++) {
        Num.from(1_000_000.5 + i);
      }
    };

    it('liefert für dieselbe Zahl denselben Wert', () => {
      expect(Num.from(1.07).toString()).toBe(Num.from('1.07').toString());
      expect(Num.from(1.07).toString()).toBe(Num.from(1.07).toString());
    });

    it('liefert denselben Wert auch, nachdem der Cache geleert wurde', () => {
      const values = [0.2, 1.07, 13.75, 1e300, -2.5e-7];
      const before = values.map((value) => Num.from(value).toString());
      overflowCache();
      expect(values.map((value) => Num.from(value).toString())).toEqual(before);
      expect(values.map((value) => Num.from(value).toNumber())).toEqual(values);
    });

    it('rechnet die verdrängten Zahlen weiter korrekt', () => {
      overflowCache();
      for (const value of [1_000_000.5, 1_001_000.5, 1_002_099.5]) {
        expect(Num.from(value).toNumber()).toBe(value);
      }
    });

    it.each([
      ['0 zuerst', [0, -0]],
      ['-0 zuerst', [-0, 0]],
    ])('behandelt 0 und -0 als normale Null (%s)', (_name, order) => {
      overflowCache();
      for (const value of order) {
        const zero = Num.from(value);
        expect(zero.isZero()).toBe(true);
        expect(zero.isNegative()).toBe(false);
        expect(Object.is(zero.mantissa, 0)).toBe(true);
        expect(Object.is(zero.exponent, 0)).toBe(true);
        expect(Object.is(zero.toNumber(), 0)).toBe(true);
        expect(zero.toString()).toBe('0e0');
      }
    });

    it.each([NaN, Infinity, -Infinity])('wirft bei %d auch wiederholt', (value) => {
      // Stünde der Wert nach dem ersten Versuch im Cache, bliebe der zweite Fehler aus.
      expect(() => Num.from(value)).toThrow(RangeError);
      expect(() => Num.from(value)).toThrow(RangeError);
    });
  });

  describe('Rechnen', () => {
    it('addiert und subtrahiert', () => {
      expect(Num.from(1284).add(16).toNumber()).toBe(1300);
      expect(Num.from(0.1).add('0.2').eq('0.3')).toBe(true);
      expect(Num.from(1300).sub(Num.from(16)).toNumber()).toBe(1284);
      expect(Num.from(5).add(0).toNumber()).toBe(5);
      expect(Num.ZERO.add(5).toNumber()).toBe(5);
      expect(Num.from(1).sub(3).toNumber()).toBe(-2);
    });

    it('ignoriert Summanden weit unter der Genauigkeit', () => {
      expect(Num.from('1e1000').add(1).eq('1e1000')).toBe(true);
    });

    it('multipliziert und dividiert ohne Gleitkomma-Rauschen', () => {
      expect(Num.from(3).mul(1284).eq(3852)).toBe(true);
      expect(Num.from(0.1).mul(3).eq('0.3')).toBe(true);
      expect(Num.from(6).div(3).eq(2)).toBe(true);
      expect(Num.from(1).div(4).eq('0.25')).toBe(true);
      expect(Num.ZERO.mul('1e1000').isZero()).toBe(true);
      expect(Num.ZERO.div(5).isZero()).toBe(true);
    });

    it('rechnet mit sehr großen Exponenten', () => {
      expect(Num.from('2e1000000').mul('3e1000000').toString()).toBe('6e2000000');
      expect(Num.from('6e1000000').div('2e999999').toString()).toBe('3e1');
      expect(Num.from('5e1000000').mul(4).toString()).toBe('2e1000001');
      expect(Num.from('1e1000000').add('1e1000000').toString()).toBe('2e1000000');
    });

    it('potenziert', () => {
      expect(Num.from(2).pow(10).toNumber()).toBe(1024);
      expect(Num.from(10).pow('3').toNumber()).toBe(1000);
      expect(Num.from(4).pow(0.5).eq(2)).toBe(true);
      expect(Num.from(2).pow(-1).eq('0.5')).toBe(true);
      expect(Num.from(5).pow(0).eq(1)).toBe(true);
      expect(Num.ZERO.pow(0).eq(1)).toBe(true);
      expect(Num.ZERO.pow(3).isZero()).toBe(true);
      expect(Num.from(10).pow(1000000).toString()).toBe('1e1000000');
      expect(Num.from('1e1000').pow(1000).toString()).toBe('1e1000000');
    });

    it('beachtet das Vorzeichen negativer Basen', () => {
      expect(Num.from(-2).pow(3).toNumber()).toBe(-8);
      expect(Num.from(-2).pow(2).toNumber()).toBe(4);
      expect(Num.from(-1).pow(3).toNumber()).toBe(-1);
      expect(Num.from(-1).pow('1e400').toNumber()).toBe(1);
    });

    it('behandelt Basis 1 und extreme Potenzen', () => {
      expect(Num.ONE.pow('1e400').eq(1)).toBe(true);
      expect(Num.from('0.5').pow('1e400').isZero()).toBe(true);
      expect(Num.from(10).pow('-1e16').isZero()).toBe(true);
    });

    it('negiert, bildet Betrag und rundet', () => {
      expect(Num.from(5).neg().toNumber()).toBe(-5);
      expect(Num.ZERO.neg().isNegative()).toBe(false);
      expect(Num.from(-5).abs().toNumber()).toBe(5);
      expect(Num.from(5).abs().toNumber()).toBe(5);
    });

    it.each([
      [1.5, 1, 2, 2],
      [-1.5, -2, -1, -2],
      [2.5, 2, 3, 3],
      [-2.5, -3, -2, -3],
      [1284.5, 1284, 1285, 1285],
      [0.4, 0, 1, 0],
      [-0.4, -1, 0, 0],
      [0.05, 0, 1, 0],
      [-0.05, -1, 0, 0],
      [7, 7, 7, 7],
      [0, 0, 0, 0],
    ])('rundet %d', (value, floor, ceil, round) => {
      const num = Num.from(value);
      expect(num.floor().toNumber()).toBe(floor);
      expect(num.ceil().toNumber()).toBe(ceil);
      expect(num.round().toNumber()).toBe(round);
    });

    it('rundet winzige Beträge richtig', () => {
      expect(Num.from('1e-400').floor().isZero()).toBe(true);
      expect(Num.from('1e-400').ceil().eq(1)).toBe(true);
      expect(Num.from('-1e-400').floor().eq(-1)).toBe(true);
      expect(Num.from('-1e-400').ceil().isZero()).toBe(true);
      expect(Num.from('1e-400').round().isZero()).toBe(true);
    });

    it('lässt große ganze Zahlen beim Runden unverändert', () => {
      const safe = Num.from(Number.MAX_SAFE_INTEGER);
      expect(safe.floor()).toBe(safe);
      const huge = Num.from('1.5e1000000');
      expect(huge.floor()).toBe(huge);
      expect(huge.ceil()).toBe(huge);
      expect(huge.round()).toBe(huge);
    });

    it('bestimmt Minimum und Maximum', () => {
      const one = Num.from(1);
      const two = Num.from(2);
      expect(one.min(two)).toBe(one);
      expect(two.min(one)).toBe(one);
      expect(one.max(two)).toBe(two);
      expect(two.max(one)).toBe(two);
      expect(one.max(1)).toBe(one);
      expect(Num.from('1e1000').max(5).eq('1e1000')).toBe(true);
      expect(Num.from('-1e1000').min(5).eq('-1e1000')).toBe(true);
    });

    it.each<[string, () => Num]>([
      ['Division durch 0', () => Num.from(1).div(0)],
      ['0 / 0', () => Num.ZERO.div(Num.ZERO)],
      ['0 hoch negativ', () => Num.ZERO.pow(-1)],
      ['negative Basis, gebrochener Exponent', () => Num.from(-8).pow(0.5)],
      ['Überlauf bei mul', () => Num.from('1e8000000000000000').mul('1e8000000000000000')],
      ['Überlauf bei div', () => Num.from('1e8000000000000000').div('1e-8000000000000000')],
      ['Überlauf bei add', () => Num.from('9.9e8999999999999999').add('9.9e8999999999999999')],
      ['Überlauf bei pow', () => Num.from(10).pow('1e16')],
      ['Überlauf bei pow mit riesigem Exponenten', () => Num.from(2).pow('1e400')],
      ['ungültiges Argument', () => Num.from(1).add('abc')],
      ['NaN als Argument', () => Num.from(1).mul(NaN)],
    ])('wirft bei %s', (_name, compute) => {
      expect(compute).toThrow(RangeError);
    });
  });

  describe('Vergleiche', () => {
    it.each<[NumLike, NumLike, -1 | 0 | 1]>([
      [1, 2, -1],
      [2, 1, 1],
      [2, '2', 0],
      [0, 0, 0],
      [0, 1, -1],
      [0, -1, 1],
      [1, 0, 1],
      [-1, 0, -1],
      [-1, 1, -1],
      [1, -1, 1],
      [-2, -1, -1],
      [-1, -2, 1],
      ['-1e10', '-1e5', -1],
      ['-1e5', '-1e10', 1],
      ['1e1000000', '1e999999', 1],
      ['1e999999', '1e1000000', -1],
    ])('vergleicht %s mit %s', (a, b, expected) => {
      const value = Num.from(a);
      expect(value.cmp(b)).toBe(expected);
      expect(value.eq(b)).toBe(expected === 0);
      expect(value.lt(b)).toBe(expected < 0);
      expect(value.lte(b)).toBe(expected <= 0);
      expect(value.gt(b)).toBe(expected > 0);
      expect(value.gte(b)).toBe(expected >= 0);
    });

    it('erkennt null und negative Werte', () => {
      expect(Num.ZERO.isZero()).toBe(true);
      expect(Num.from(1).isZero()).toBe(false);
      expect(Num.from(-1).isNegative()).toBe(true);
      expect(Num.ZERO.isNegative()).toBe(false);
    });
  });

  describe('Mantisse und Exponent', () => {
    it.each([
      [1284, 1.284, 3],
      [-1284, -1.284, 3],
      [0.05, 5, -2],
      [0, 0, 0],
      ['1e1000000', 1, 1000000],
    ])('zerlegt %s', (value, mantissa, exponent) => {
      const num = Num.from(value);
      expect(num.mantissa).toBe(mantissa);
      expect(num.exponent).toBe(exponent);
    });

    it('hält Ergebnisse normalisiert', () => {
      for (const value of [Num.from(9).mul(9), Num.from(1).div(3), Num.from(9.5).add(0.5)]) {
        expect(Math.abs(value.mantissa)).toBeGreaterThanOrEqual(1);
        expect(Math.abs(value.mantissa)).toBeLessThan(10);
      }
    });
  });

  describe('Serialisierung', () => {
    it.each([
      ['0'],
      ['1'],
      ['-1'],
      ['1284'],
      ['0.1'],
      ['1.7976931348623157e308'],
      ['5e-324'],
      ['1e1000000'],
      ['-1.2345678901234567e1000000'],
      ['1e-1000000'],
      ['8.999999999999999e8999999999999999'],
    ])('stellt %s exakt wieder her', (text) => {
      const value = Num.from(text);
      const restored = Num.from(value.toString());
      expect(restored.mantissa).toBe(value.mantissa);
      expect(restored.exponent).toBe(value.exponent);
      expect(restored.toString()).toBe(value.toString());
    });

    it('stellt berechnete Werte exakt wieder her', () => {
      let value = Num.from(1.15);
      for (let i = 0; i < 50; i++) {
        value = value.mul(1.15).add(0.1);
        const restored = Num.from(value.toString());
        expect(restored.mantissa).toBe(value.mantissa);
        expect(restored.exponent).toBe(value.exponent);
      }
    });

    it('nutzt in JSON denselben String', () => {
      const value = Num.from(1284);
      expect(value.toJSON()).toBe('1.284e3');
      expect(JSON.stringify({ value })).toBe('{"value":"1.284e3"}');
      expect(String(Num.ZERO)).toBe('0e0');
    });

    it('wandelt exakt in number um', () => {
      for (const value of [0.1, 1284.5, 1 / 3, Number.MAX_VALUE, Number.MIN_VALUE, -1e21]) {
        expect(Num.from(value).toNumber()).toBe(value);
      }
    });

    it('liefert außerhalb des number-Bereichs Grenzwerte', () => {
      expect(Num.from('1e400').toNumber()).toBe(Infinity);
      expect(Num.from('-1e400').toNumber()).toBe(-Infinity);
      expect(Object.is(Num.from('-1e-400').toNumber(), 0)).toBe(true);
    });
  });

  describe('Unveränderlichkeit', () => {
    it('ist eingefroren und zeigt keine Interna', () => {
      const value = Num.from(5);
      expect(Object.isFrozen(value)).toBe(true);
      expect(Object.keys(value)).toEqual([]);
      expect(() => {
        (value as unknown as { extra: number }).extra = 1;
      }).toThrow(TypeError);
      expect(() => {
        (value as unknown as { mantissa: number }).mantissa = 1;
      }).toThrow(TypeError);
    });

    it('verändert Operanden nicht', () => {
      const a = Num.from(5);
      const b = Num.from(3);
      a.add(b);
      a.sub(b);
      a.mul(b);
      a.div(b);
      a.pow(b);
      a.neg();
      a.abs();
      a.floor();
      expect(a.toString()).toBe('5e0');
      expect(b.toString()).toBe('3e0');
      expect(Num.ZERO.add(1).toNumber()).toBe(1);
      expect(Num.ZERO.isZero()).toBe(true);
    });
  });
});
