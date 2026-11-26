import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rune} from '../sigil.js';
test('visual rune alphabet has distinct characters and preserves readable Latin letters',()=>{
 const s=rune('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
 assert.equal(Array.from(s).length,26);
 assert.equal(new Set(s).size,26);
 assert.equal(rune('draw mark cast'),'DᚱAW ᛗAᚱK CAᛋT');
 assert.equal(rune('HINT'),'ᚺᛁNT');
 assert.equal(rune('P · 02 → ∇'),'ᚹ · 02 → ∇');
 assert.equal(rune('xyz'),'ᚷᛉZ');
});
test('static grimoire labels use the same mapping as runtime labels',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const visible=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 for(const label of ['GRIMOIRE','COM','EASY','NORMAL','HARD','EXTRA','ARCHIVE','ARCANA','CHRONICLE','RITES','DRAW MARK CAST','FIELD','ORDER','CHAIN','BREAK','SWAP','BONUS'])assert.ok(visible.includes(' '+rune(label)+' '),label);
});
