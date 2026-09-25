// Bod 2 (P1_P2_FIX_PROPOSAL): vulgarizmus nesmie zahodiť požiadavku.
// Pevná odpoveď "Ta brate, bordel pomenovaný…" len pre čistý výlev bez obsahu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldUsePopiciEdgeShortcut } from '../src/routing/deterministicRegistry.js';

test('existing contract (tests/test_deterministic_registry.js) still holds', () => {
  assert.equal(shouldUsePopiciEdgeShortcut('ta co'), false);
  assert.equal(shouldUsePopiciEdgeShortcut('bordel?'), false);
  assert.equal(shouldUsePopiciEdgeShortcut('ta co mame nove? aj bordel?'), false);
  assert.equal(shouldUsePopiciEdgeShortcut('toto je totalny bordel v routingu'), true);
  assert.equal(shouldUsePopiciEdgeShortcut('kokot toto si rozjebal'), true);
});

test('pure rant without content keeps the shortcut', () => {
  for (const msg of ['kurva, zas bordel', 'Kurva!', 'ta co, kurva, toto je bordel', 'jebe mi z toho, brate']) {
    assert.equal(shouldUsePopiciEdgeShortcut(msg), true, msg);
  }
});

test('profanity with a real request goes to the LLM', () => {
  for (const msg of [
    'kurva, oprav mi tento skript na zálohu',
    'kurva, prečo mi nejde git push',
    'kurva pomôž mi s tým excelom',
    'napíš mi kurva ten mail pre šéfa',
    'kurva, ako mám nastaviť tú tlačiareň',
    'kurva to je dlhé, zhrň mi ten článok o klimatických zmenách a ich dopadoch',
    'jebe mi z toho, čo mám robiť?',
  ]) {
    assert.equal(shouldUsePopiciEdgeShortcut(msg), false, msg);
  }
});

test('lock mode still disables the shortcut', () => {
  assert.equal(shouldUsePopiciEdgeShortcut('kurva, zas bordel', { lockMode: true }), false);
});
