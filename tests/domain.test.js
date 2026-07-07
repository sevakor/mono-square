import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchemes, toMatrix, shuffle, STAIRS, buildMixedSequence } from '../src/domain.js';

test('catalog contains 256 unique schemes with natural difficulty groups', () => {
  const schemes = createSchemes();
  assert.equal(schemes.length, 256);
  assert.equal(new Set(schemes.map(s => s.tiles.join(','))).size, 256);
  assert.deepEqual([1,2,3,4].map(d => schemes.filter(s => s.difficulty === d).length), [63,58,61,74]);
});
test('permanent catalog matches representative manually assigned schemes', () => {
  const schemes = createSchemes();
  assert.equal(schemes.find(s => s.id === 's-00').difficulty, 1);
  assert.equal(schemes.find(s => s.id === 's-06').difficulty, 4);
  assert.equal(schemes.find(s => s.id === 's-ff').difficulty, 1);
});
test('matrix has one black cell in every physical tile', () => {
  for (const scheme of createSchemes()) {
    const m = toMatrix(scheme.tiles);
    assert.equal(m.flat().filter(Boolean).length, 4);
    for (let tr = 0; tr < 2; tr++) for (let tc = 0; tc < 2; tc++) assert.equal(m.slice(tr*2,tr*2+2).flatMap(r=>r.slice(tc*2,tc*2+2)).filter(Boolean).length,1);
  }
});
test('shuffle preserves elements', () => assert.deepEqual(shuffle([1,2,3], () => .2).sort(), [1,2,3]));
test('stairs table has exact totals', () => assert.deepEqual(STAIRS.map(x=>x.reduce((a,b)=>a+b,0)),[8,8,8,9,9,9,10,10,10,12,12,12]));
test('mix uses only selected difficulties and no duplicates', () => {
  const state={queues:{}}; const ids=buildMixedSequence(state,[1,3],12); const catalog=createSchemes();
  assert.equal(ids.length,12); assert.equal(new Set(ids).size,12);
  assert.ok(ids.every(id=>[1,3].includes(catalog.find(s=>s.id===id).difficulty)));
});
