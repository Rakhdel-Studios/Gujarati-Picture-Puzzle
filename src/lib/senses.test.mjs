import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { senses } from './senses.mjs';

test('splits a comma-separated gloss', () => {
  assert.deepEqual(senses('કાદવ, કીચડ, ગારો'), ['કાદવ', 'કીચડ', 'ગારો']);
});

test('commas inside parentheses do not split', () => {
  assert.deepEqual(senses('ધાર્મિક સંપ્રદાય (નો મઠ, વગેરે), ઘર'), [
    'ધાર્મિક સંપ્રદાય (નો મઠ, વગેરે)',
    'ઘર',
  ]);
});

test('drops empties and trailing stops', () => {
  assert.deepEqual(senses('ઘર,, મકાન.'), ['ઘર', 'મકાન']);
});

test('a one-sense gloss stays one sense', () => {
  assert.deepEqual(senses('ગળી બિસ્કિટ'), ['ગળી બિસ્કિટ']);
});

test('every shipped level yields at least one sense and never re-splits tiles', () => {
  const levels = JSON.parse(readFileSync(new URL('../data/levels.json', import.meta.url), 'utf8'));
  for (const l of levels) {
    assert.ok(senses(l.definition).length >= 1, `${l.slug} has no senses`);
    // the contract guarantee the whole UI rests on
    assert.equal(l.tiles.join(''), l.gujarati, `${l.slug} tiles do not join back`);
    assert.equal(l.images.length, 4, `${l.slug} needs 4 images`);
  }
});
