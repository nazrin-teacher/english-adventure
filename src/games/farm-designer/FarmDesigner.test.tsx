/**
 * Start-to-finish play-through of Little Farm Designer (jsdom, real logic and
 * storage; speech output stubbed).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const said: string[] = [];
vi.mock('../../services/audio', () => ({
  audio: {
    say: vi.fn((t: string) => (said.push(t), Promise.resolve())),
    stop: vi.fn(),
    subscribe: () => () => undefined,
    setEnabled: vi.fn(),
    hasSpeechSynthesis: true,
    isEnabled: true,
  },
}));

import { AppProvider } from '../../hooks/useApp';
import { FarmDesigner } from './FarmDesigner';
import { STORAGE_KEY } from '../../services/progress';
import { neighboursOf } from '../build-my-farm/logic';

const prompt = () => document.querySelector('.mission__text')?.textContent ?? '';
const pieces = () => [...document.querySelectorAll<HTMLButtonElement>('.piece[data-kind]')];
const kinds = () => pieces().map((p) => p.dataset.kind);
const spot = (id: string) => document.querySelector<HTMLButtonElement>(`.spot[data-spot="${id}"]`);
const selectAnimal = (kind: string) => {
  const btn = document.querySelector<HTMLButtonElement>(`.tray__item[aria-label="${kind}"]`)!;
  if (btn.getAttribute('aria-pressed') !== 'true') fireEvent.keyDown(btn, { key: 'Enter' });
};
const tapPiece = (el: HTMLElement) => {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: 10, clientY: 10 });
};
const nextPrompt = (prev: string) => waitFor(() => expect(prompt()).not.toBe(prev), { timeout: 5000 });
const saidIt = () => fireEvent.click(screen.getAllByRole('button', { name: /I said it!/ })[0]);
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!).games['build-my-farm'];

async function place(kind: string, spotId: string) {
  const before = prompt();
  selectAnimal(kind);
  fireEvent.click(spot(spotId)!);
  await nextPrompt(before);
}

beforeEach(() => {
  localStorage.clear();
  said.length = 0;
});

describe('Little Farm Designer — discover, challenge, create', () => {
  it('plays from the farm tour to the farm report', async () => {
    render(
      <AppProvider>
        <FarmDesigner onHome={() => undefined} onParent={() => undefined} />
      </AppProvider>,
    );

    // ---- Discover: tour the farm ----
    expect(prompt()).toMatch(/Welcome to my farm/);
    for (const id of ['barn', 'tree', 'fence']) fireEvent.click(screen.getByRole('button', { name: id }));
    fireEvent.click(screen.getByRole('button', { name: 'hay' }));
    expect(said).toContain('This is the barn.');
    await waitFor(() => expect(prompt()).toMatch(/Here are the animals/), { timeout: 4000 });

    // ---- Discover: meet the animals ----
    for (const k of ['cow', 'horse', 'pig', 'sheep', 'hen', 'duck']) fireEvent.click(screen.getByRole('button', { name: `${k} says hello` }));
    expect(said).toContain("It's a cow. Moo!");
    await waitFor(() => expect(prompt()).toBe('Put the cow next to the barn.'), { timeout: 5000 });
    expect(saved().stars).toBe(1);

    // ---- Challenge: placement missions with real checking ----
    selectAnimal('pig');
    fireEvent.click(spot('barn-side')!);
    expect(kinds()).toEqual([]); // wrong animal rejected
    await place('cow', 'barn-side');
    expect(prompt()).toBe('Put the duck next to the cow.');
    selectAnimal('duck');
    fireEvent.click(spot('tree-left')!);
    selectAnimal('duck');
    fireEvent.click(spot('fence-1')!);
    expect(kinds()).toEqual(['cow']);
    const hinted = [...document.querySelectorAll('.spot.is-hint')].map((s) => (s as HTMLElement).dataset.spot).sort();
    expect(hinted).toEqual(neighboursOf('barn-side').map((s) => s.id).sort());
    await place('duck', 'field-2');
    await place('sheep', 'tree-left');
    expect(prompt()).toBe('Find the big animal.');
    fireEvent.click(document.querySelector('.piece[data-kind="duck"]')!);
    expect(prompt()).toBe('Find the big animal.');
    fireEvent.click(document.querySelector('.piece[data-kind="cow"]')!);
    await nextPrompt('Find the big animal.');
    await place('horse', 'barn');
    await place('hen', 'fence-2');
    await place('pig', 'tree-right');
    await place('hen', 'field-5');

    // ---- Challenge: count 7, add two, count 9 ----
    expect(prompt()).toBe('Count seven animals.');
    for (const p of pieces()) fireEvent.click(p);
    await waitFor(() => expect(prompt()).toBe('Put two more animals on the farm.'), { timeout: 4000 });
    selectAnimal('pig');
    fireEvent.click(spot('field-6')!);
    selectAnimal('duck');
    fireEvent.click(spot('field-7')!);
    expect(pieces()).toHaveLength(9);
    await waitFor(() => expect(prompt()).toBe('Count all the animals again!'), { timeout: 4000 });
    for (const p of pieces()) fireEvent.click(p);
    await waitFor(() => expect(said).toContain('nine'));
    await waitFor(() => expect(prompt()).toMatch(/your farm/), { timeout: 5000 });
    expect(saved().stars).toBe(2);

    // ---- Create: free building (move, take off, add) ----
    const duck = () => document.querySelectorAll<HTMLButtonElement>('.piece[data-kind="duck"]');
    const lastDuck = duck()[duck().length - 1];
    tapPiece(lastDuck);
    expect(lastDuck.className).toContain('is-held');
    fireEvent.click(spot('field-3')!); // move it
    expect(spot('field-3')).toBeNull(); // now occupied
    expect(spot('field-7')).not.toBeNull(); // old place is free
    const pig = document.querySelectorAll<HTMLButtonElement>('.piece[data-kind="pig"]')[1];
    tapPiece(pig);
    fireEvent.click(screen.getByRole('toolbar', { name: 'Animals' })); // back to the tray
    expect(pieces()).toHaveLength(8);
    selectAnimal('cow');
    fireEvent.click(spot('field-4')!);
    expect(pieces()).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: /My farm is ready!/ }));

    // ---- Create: spoken farm report from the child's own farm ----
    await waitFor(() => expect(prompt()).toMatch(/Tell me about your farm/));
    fireEvent.click(document.querySelector('.piece[data-kind="horse"]')!);
    expect(screen.getByText('I can see a horse.', { selector: '.speak-card__sentence' })).toBeInTheDocument();
    saidIt();
    expect(screen.getByText("It's in the barn.", { selector: '.speak-card__sentence' })).toBeInTheDocument();
    saidIt();
    fireEvent.click(document.querySelector('.piece[data-kind="sheep"]')!);
    saidIt();
    expect(document.querySelector('.speak-card__sentence')?.textContent).toBe("It's under the tree.");
    saidIt();
    fireEvent.click(document.querySelectorAll('.piece[data-kind="hen"]')[0]);
    saidIt();
    saidIt();
    await waitFor(() => expect(document.querySelector('.speak-card__sentence')?.textContent).toBe('I can see nine animals.'));
    saidIt();

    // ---- Create: care for the animals ----
    await waitFor(() => expect(prompt()).toMatch(/hungry/));
    fireEvent.click(screen.getByRole('button', { name: 'hay' }));
    await screen.findByText('I feed the animals.', { selector: '.speak-card__sentence' }, { timeout: 3500 });
    saidIt();
    await waitFor(() => expect(prompt()).toMatch(/Stroke the animals/));
    for (const p of pieces().slice(0, 3)) fireEvent.click(p);
    await screen.findByText("I'm kind to animals.", { selector: '.speak-card__sentence' }, { timeout: 3000 });
    saidIt();

    await screen.findByRole('heading', { name: 'You designed a great farm!' });
    expect(screen.getByText('New sticker!')).toBeInTheDocument();
    expect(saved()).toMatchObject({ stars: 3, completed: true });
  }, 40000);
});
