import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SealVersion} from './seal-version.mjs';
test('a preview is not a locked version; only a successful commit seals it',()=>{
 const v=new SealVersion(),ticket=v.ticket();assert.equal(v.lock,null);
 assert.equal(v.commit(ticket,{savedAt:'2026-10-29T00:00:00Z'}),true);assert.ok(v.lock.savedAt);
});
test('editing cannot silently unlock a saved version; explicit unlock invalidates stale completions',()=>{
 const v=new SealVersion(),old=v.ticket();v.commit(old,{savedAt:'first'});
 assert.equal(v.edit(),false);assert.ok(v.lock);assert.equal(v.unlock(),true);assert.equal(v.lock,null);assert.equal(v.edit(),true);assert.equal(v.commit(old,{savedAt:'late'}),false);
 const current=v.ticket();assert.equal(v.commit(current,{savedAt:'new'}),true);assert.equal(v.lock.savedAt,'new');
});
test('repeated confirmations can seal the same version without silently changing its revision',()=>{
 const v=new SealVersion(),ticket=v.ticket();v.commit(ticket,{savedAt:'image'});v.commit(ticket,{createdAt:'shared',expiresAt:'later'});
 assert.equal(v.ticket(),ticket);assert.equal(v.lock.createdAt,'shared');
});

test('unlocking an already editable draft does not create an extra revision',()=>{
 const v=new SealVersion(),ticket=v.ticket();assert.equal(v.unlock(),false);assert.equal(v.ticket(),ticket);
});
