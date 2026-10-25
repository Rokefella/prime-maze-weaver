import { describe, it, expect } from 'bun:test';
import { pushStep, writeLabel, HISTORY_CAP } from './history';
const place = { id: 7, kind: 'maze_entrance', name: 'Maze 23', x: 10, y: 20, maze_level: 23, npc_key: null, status: 'confirmed', notes: null };
describe('WORLD undo history', () => {
 it('caps the stack at 100 steps, dropping the oldest', () => {
  let stack = [];
  for (let n = 0; n < HISTORY_CAP + 5; n++) stack = pushStep(stack, { type: 'insert-link', id: n, row: { id: n, from_place: 1, to_place: 2, kind: 'clue', requirement: null, note: null } });
  expect(stack.length).toBe(HISTORY_CAP);
  expect(stack[0].id).toBe(5);
  expect(stack[stack.length - 1].id).toBe(HISTORY_CAP + 4);
 });
 it('labels a place move as move', () => {
  expect(writeLabel({ type: 'update-place', id: 7, before: place, after: { ...place, x: 30, y: 40 } })).toBe('move Maze 23');
 });
 it('labels a same-position place save as edit', () => {
  expect(writeLabel({ type: 'update-place', id: 7, before: place, after: { ...place, notes: 'x' } })).toBe('edit Maze 23');
 });
 it('labels create draft areas distinctly from plain area saves', () => {
  const before = { ax: 3, ay: 4, era_id: null, status: 'empty', draft_name: null, notes: null };
  expect(writeLabel({ type: 'update-area', before, after: { ...before, draft_name: 'world_3_4', status: 'proposed' } })).toBe('create draft area 3,4');
  expect(writeLabel({ type: 'update-area', before, after: { ...before, status: 'final' } })).toBe('area 3,4');
 });
 it('labels creates, deletes, eras and links', () => {
  expect(writeLabel({ type: 'insert-place', id: 1, row: place })).toBe('create Maze 23');
  expect(writeLabel({ type: 'delete-place', id: 1, row: { ...place, name: '' }, links: [] })).toBe('delete maze_entrance');
  expect(writeLabel({ type: 'update-era', id: 2, before: { name: 'Old' }, after: { name: 'New' } })).toBe('era New');
  expect(writeLabel({ type: 'insert-link', id: 9, row: {} })).toBe('add link');
  expect(writeLabel({ type: 'delete-link', id: 9, row: {} })).toBe('delete link');
 });
});
