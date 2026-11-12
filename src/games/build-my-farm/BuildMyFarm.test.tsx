/**
 * End-to-end play-through of Build My Farm in jsdom: real components, real
 * game logic, real progress storage. Only speech output is stubbed (instant).
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const said: string[] = [];
vi.mock('../../services/audio', () => ({
  audio: {
    say: vi.fn((t: string) => {
      said.push(t);
      return Promise.resolve();
    }),
    stop: vi.fn(),
    subscribe: () => () => undefined,
    setEnabled: vi.fn(),
    hasSpeechSynthesis: true,
    isEnabled: true,
  },
}));

import { AppProvider } from '../../hooks/useApp';
import { BuildMyFarm } from './BuildMyFarm';
import { STORAGE_KEY } from '../../services/progress';
import { neighboursOf } from './logic';

const missionText = () => document.querySelector('.mission__text')?.textContent ?? '';
const pieces = () => [...document.querySelectorAll<HTMLButtonElement>('.piece')];
const pieceKinds = () => pieces().map((p) => p.dataset.kind);
const tapPiece = (kind: string) => fireEvent.click(document.querySelector<HTMLButtonElement>(`.piece[data-kind="${kind}"]`)!);
const spot = (id: string) => document.querySelector<HTMLButtonElement>(`.spot[data-spot="${id}"]`);
/** Select an animal in the tray (keyboard path), unless it is already selected. */
const selectAnimal = (kind: string) => {
  const btn = document.querySelector<HTMLButtonElement>(`.tray__item[aria-label="${kind}"]`)!;
  if (btn.getAttribute('aria-pressed') !== 'true') fireEvent.keyDown(btn, { key: 'Enter' });
};
const nextText = async (prev: string) => waitFor(() => expect(missionText()).not.toBe(prev), { timeout: 4000 });
const saidIt = () => fireEvent.click(screen.getByRole('button', { name: /I said it!/ }));

async function place(kind: string, spotId: string) {
  const before = missionText();
  selectAnimal(kind);
  const el = spot(spotId);
  expect(el, `spot ${spotId} should be free`).not.toBeNull();
  fireEvent.click(el!);
  await nextText(before);
}

beforeEach(() => {
  localStorage.clear();
  said.length = 0;
});

describe('Build My Farm — full play-through', () => {
  it('checks placements, counts, talks, feeds and saves 3 stars', async () => {
    render(
      <AppProvider>
        <BuildMyFarm onHome={() => undefined} onParent={() => undefined} />
      </AppProvider>,
    );

    // Mission 1 (scenario A on a first play)
    expect(missionText()).toBe('Put the cow next to the barn.');

    // wrong animal is rejected and named
    selectAnimal('pig');
    fireEvent.click(spot('barn-side')!);
    expect(pieceKinds()).toEqual([]);
    await waitFor(() => expect(said).toContain("That's the pig. Where is the cow?"));

    // wrong place is rejected
    selectAnimal('cow');
    fireEvent.click(spot('tree-left')!);
    expect(pieceKinds()).toEqual([]);
    expect(missionText()).toBe('Put the cow next to the barn.');

    // correct place
    selectAnimal('cow');
    fireEvent.click(spot('barn-side')!);
    expect(pieceKinds()).toEqual(['cow']);
    await nextText('Put the cow next to the barn.');

    // "Put the duck next to the cow." — far away is NOT accepted …
    expect(missionText()).toBe('Put the duck next to the cow.');
    selectAnimal('duck');
    fireEvent.click(spot('tree-left')!);
    selectAnimal('duck');
    fireEvent.click(spot('fence-1')!);
    expect(pieceKinds()).toEqual(['cow']);
    // … after two misses only the spots really next to the cow glow …
    const hinted = [...document.querySelectorAll('.spot.is-hint')].map((s) => (s as HTMLElement).dataset.spot).sort();
    expect(hinted).toEqual(neighboursOf('barn-side').map((s) => s.id).sort());
    // … and one of them is accepted.
    await place('duck', 'field-2');

    await place('sheep', 'tree-left');

    // Find the big animal: the duck is wrong, the cow is right
    expect(missionText()).toBe('Find the big animal.');
    tapPiece('duck');
    expect(missionText()).toBe('Find the big animal.');
    tapPiece('cow');
    await nextText('Find the big animal.');

    await place('horse', 'barn');
    await place('hen', 'fence-2');
    await place('pig', 'tree-right');
    await place('hen', 'field-5');

    // ---- Count ----
    expect(missionText()).toBe('Count seven animals.');
    expect(pieces()).toHaveLength(7);
    for (const p of pieces()) fireEvent.click(p);
    await waitFor(() => expect(said).toContain('seven'));
    await nextText('Count seven animals.');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).games['build-my-farm'].stars).toBeGreaterThanOrEqual(2);

    // ---- Talk: sentences come from the child's real farm ----
    expect(missionText()).toBe('Tell me about your farm. Tap an animal.');
    tapPiece('duck');
    expect(screen.getByText('The duck is next to the cow.')).toBeInTheDocument();
    saidIt();
    tapPiece('horse');
    expect(screen.getByText('The horse is in the barn.')).toBeInTheDocument();
    saidIt();
    tapPiece('sheep');
    expect(screen.getByText('The sheep is under the tree.')).toBeInTheDocument();
    saidIt();

    // ---- Feed ----
    await waitFor(() => expect(missionText()).toBe('The animals are hungry. Tap the hay!'), { timeout: 2000 });
    fireEvent.click(screen.getByRole('button', { name: 'Hay' }));
    const feedCard = await screen.findByText('I feed the animals.', { selector: '.speak-card__sentence' }, { timeout: 3500 });
    expect(feedCard).toBeInTheDocument();
    saidIt();

    // ---- Kind ----
    await waitFor(() => expect(missionText()).toBe('Stroke the animals gently.'));
    for (const k of ['cow', 'pig', 'horse']) tapPiece(k);
    await screen.findByText("I'm kind to animals.", { selector: '.speak-card__sentence' }, { timeout: 2500 });
    saidIt();

    // ---- Celebration + saved progress ----
    await screen.findByRole('heading', { name: 'You built a great farm!' });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!).games['build-my-farm'];
    expect(saved).toMatchObject({ stars: 3, completed: true, timesCompleted: 1 });

    // Replay starts a fresh farm with the other scenario
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Play again' })));
    await waitFor(() => expect(missionText()).toBe('Put the horse next to the barn.'));
    expect(pieces()).toHaveLength(0);
    expect(within(document.body).queryByRole('heading', { name: 'You built a great farm!' })).toBeNull();
  }, 30000);
});
