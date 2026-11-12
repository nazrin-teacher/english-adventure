/**
 * Start-to-finish play-throughs of the eight newer games in jsdom, with real
 * components, logic and progress storage. Only speech output is stubbed.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const said: string[] = [];
vi.mock('../services/audio', () => ({
  audio: {
    say: vi.fn((t: string) => (said.push(t), Promise.resolve())),
    stop: vi.fn(),
    subscribe: () => () => undefined,
    setEnabled: vi.fn(),
    hasSpeechSynthesis: true,
    isEnabled: true,
  },
}));

import { AppProvider } from '../hooks/useApp';
import { STORAGE_KEY } from '../services/progress';
import { GAME_COMPONENTS, type GameProps } from './registry';
import { GAMES } from '../content/games';
import { makeRounds } from './which-animal/logic';
import { makeDeck, flip } from './family-memory/logic';
import { MEMORY_LEVELS } from '../content/family';
import { shuffle } from '../components/scene';
import { THING_ORDER, THINGS } from '../content/school';
import { SOFA_ORDER } from '../content/family';
import { ANIMAL_ORDER } from '../content/farm';
import { ANIMAL_CLUES, ANIMAL_SOUNDS } from '../content/whichAnimal';

const saved = (id: string) => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').games?.[id];
const play = (C: ComponentType<GameProps>) =>
  render(
    <AppProvider>
      <C onHome={() => undefined} onParent={() => undefined} />
    </AppProvider>,
  );
const saidIt = () => fireEvent.click(screen.getAllByRole('button', { name: /I said it!/ })[0]);
const celebration = (title: RegExp) => screen.findByRole('heading', { name: title }, { timeout: 4000 });

beforeEach(() => {
  localStorage.clear();
  said.length = 0;
});

describe('every home card opens a game', () => {
  it.each(GAMES.map((g) => g.id))('%s', (id) => expect(GAME_COMPONENTS[id]).toBeTruthy());
});

describe('Which Animal Is It?', () => {
  it('rounds cover every animal and never repeat back-to-back', () => {
    for (let seed = 1; seed < 20; seed++) {
      const r = makeRounds(seed);
      expect(new Set(r.slice(0, 6).map((x) => x.answer)).size).toBe(6);
      for (let i = 1; i < r.length; i++) expect(r[i].answer).not.toBe(r[i - 1].answer);
    }
  });

  it('plays all nine rounds (sound, shadow, clue) with a wrong try', async () => {
    play(GAME_COMPONENTS['which-animal']!);
    const rounds = makeRounds(1);
    // a wrong answer first
    const wrong = ANIMAL_ORDER.find((a) => a !== rounds[0].answer)!;
    fireEvent.click(screen.getByRole('button', { name: wrong }));
    await waitFor(() => expect(said.some((s) => s.startsWith(`That's the ${wrong}`))).toBe(true));
    for (const [i, r] of rounds.entries()) {
      await waitFor(() => expect(screen.getByText(`${i + 1} / 9`)).toBeInTheDocument());
      if (r.kind === 'shadow') expect(screen.getByLabelText('Animal shadow')).toBeInTheDocument();
      if (r.kind === 'sound') await waitFor(() => expect(said).toContain(ANIMAL_SOUNDS[r.answer]));
      if (r.kind === 'clue') await waitFor(() => expect(said).toContain(ANIMAL_CLUES[r.answer]));
      fireEvent.click(screen.getByRole('button', { name: r.answer }));
    }
    await celebration(/farm animals/);
    expect(saved('which-animal')).toMatchObject({ stars: 3, completed: true });
    expect(said.some((s) => /Moo|Neigh|Oink|Baa|Cluck|Quack/.test(s))).toBe(true);
  });
});

describe('I Can See…!', () => {
  it('see → describe → where', async () => {
    play(GAME_COMPONENTS['i-can-see']!);
    for (const a of ANIMAL_ORDER) {
      fireEvent.click(screen.getByRole('button', { name: `${a} on the farm` }));
      expect(screen.getByText(`I can see a ${a}.`, { selector: '.speak-card__sentence' })).toBeInTheDocument();
      saidIt();
    }
    // describe: tap the shining animal, then three sentences
    for (let n = 0; n < 3; n++) {
      const glowing = await waitFor(() => {
        const el = document.querySelector<HTMLButtonElement>('.sprite.is-glow');
        expect(el).not.toBeNull();
        return el!;
      });
      fireEvent.click(glowing);
      saidIt();
      saidIt();
      saidIt();
    }
    // where
    await waitFor(() => expect(screen.getByText('Where is the duck? Tap it.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'duck on the farm' }));
    expect(screen.getByText('The duck is next to the cow.', { selector: '.speak-card__sentence' })).toBeInTheDocument();
    saidIt();
    await waitFor(() => expect(screen.getByText('Where is the pig? Tap it.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'pig on the farm' }));
    saidIt();
    await celebration(/see the farm/);
    expect(saved('i-can-see')).toMatchObject({ stars: 3, completed: true });
  });
});

describe('School Objects Match', () => {
  it('finds all nine school things', async () => {
    play(GAME_COMPONENTS['school-objects-match']!);
    const order = shuffle(THING_ORDER, 1);
    expect(screen.getByText('Find the ' + THINGS[order[0]].word + '.')).toBeInTheDocument();
    for (const [i, t] of order.entries()) {
      await waitFor(() => expect(screen.getByText(`${i + 1} / 9`)).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: THINGS[t].word }));
    }
    await celebration(/school things/);
    expect(saved('school-objects-match')).toMatchObject({ stars: 3, completed: true });
  });
});

describe("It's a…!", () => {
  it('models each sentence and moves on with "I said it!"', async () => {
    play(GAME_COMPONENTS['its-a']!);
    const order = shuffle(THING_ORDER, 4);
    for (const t of order) {
      const expected = t === 'scissors' ? "They're scissors." : t === 'eraser' ? "It's an eraser." : `It's a ${THINGS[t].word}.`;
      await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument());
      await act(async () => saidIt());
    }
    await celebration(/Super speaking/);
    expect(saved('its-a')).toMatchObject({ stars: 3, completed: true });
  });
});

describe('School Object Hunt', () => {
  it('six home missions with spoken answers', async () => {
    play(GAME_COMPONENTS['school-object-hunt']!);
    for (let i = 0; i < 6; i++) {
      await waitFor(() => expect(screen.getByText(`Mission ${i + 1}`)).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /I found it!/ }));
      expect(document.querySelector('.speak-card__sentence')?.textContent).toMatch(/^I found /);
      saidIt();
    }
    await celebration(/super hunter/);
    expect(saved('school-object-hunt')).toMatchObject({ stars: 3, completed: true });
  });
});

describe('My Family Memory', () => {
  it('decks hold real pairs and flip rules work', () => {
    const deck = makeDeck(4, 3);
    expect(deck).toHaveLength(8);
    const counts = deck.reduce<Record<string, number>>((m, c) => ((m[c.member] = (m[c.member] ?? 0) + 1), m), {});
    expect(Object.values(counts).every((n) => n === 2)).toBe(true);
    const a = deck[0];
    const twin = deck.find((c) => c.member === a.member && c.id !== a.id)!;
    const other = deck.find((c) => c.member !== a.member)!;
    expect(flip(deck, [], [], a.id)).toBe('first');
    expect(flip(deck, [a.id], [], twin.id)).toBe('match');
    expect(flip(deck, [a.id], [], other.id)).toBe('miss');
    expect(flip(deck, [a.id], [], a.id)).toBe('ignored');
    expect(flip(deck, [a.id, other.id], [], twin.id)).toBe('ignored');
  });

  it('plays three levels of growing size', async () => {
    play(GAME_COMPONENTS['family-memory']!);
    for (const [level, pairs] of MEMORY_LEVELS.entries()) {
      await waitFor(() => expect(screen.getByText(`Level ${level + 1}`)).toBeInTheDocument(), { timeout: 4000 });
      const deck = makeDeck(pairs, 1 * 5 + level);
      const cards = () => [...document.querySelectorAll<HTMLButtonElement>('.memory-card')];
      await waitFor(() => expect(cards()).toHaveLength(pairs * 2));
      // one miss first (cards turn back), then all the matches
      const first = deck[0];
      const miss = deck.find((c) => c.member !== first.member)!;
      fireEvent.click(cards()[first.id]);
      fireEvent.click(cards()[miss.id]);
      await waitFor(() => expect(document.querySelectorAll('.memory-card.is-up')).toHaveLength(0), { timeout: 3000 });
      const seen = new Set<number>();
      for (const c of deck) {
        if (seen.has(c.id)) continue;
        const twin = deck.find((d) => d.member === c.member && d.id !== c.id)!;
        seen.add(c.id).add(twin.id);
        fireEvent.click(cards()[c.id]);
        fireEvent.click(cards()[twin.id]);
        await waitFor(() => expect(cards()[twin.id].className).toContain('is-matched'), { timeout: 3000 });
      }
    }
    await celebration(/Super memory/);
    expect(saved('family-memory')).toMatchObject({ stars: 3, completed: true });
  }, 30000);
});

describe('Meet My Family', () => {
  it('meet → find → say', async () => {
    play(GAME_COMPONENTS['meet-my-family']!);
    for (const m of SOFA_ORDER) {
      fireEvent.click(screen.getByRole('button', { name: `${m} picture` }));
      expect(document.querySelector('.speak-card__sentence')?.textContent).toMatch(/^(She|He)'s my /);
      saidIt();
      saidIt();
    }
    const findOrder = shuffle(SOFA_ORDER, 1);
    for (const m of findOrder) {
      await waitFor(() => expect(document.querySelector('.prompt__text')?.textContent).toContain(m));
      fireEvent.click(screen.getByRole('button', { name: `${m} picture` }));
    }
    for (let i = 0; i < 4; i++) {
      await waitFor(() => expect(screen.getByText('Who is it? You say it!')).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText(`${i + 1} / 4`)).toBeInTheDocument());
      fireEvent.click(screen.getAllByRole('button', { name: /I said it!/ })[0]);
      saidIt();
    }
    await celebration(/lovely family/);
    expect(saved('meet-my-family')).toMatchObject({ stars: 3, completed: true });
  });
});

describe('My Family Puppet Studio', () => {
  it('builds three puppets from separate parts and introduces them', async () => {
    play(GAME_COMPONENTS['puppet-studio']!);
    const looks: [string, string, string][] = [
      ['dad', 'black hair', "He's got black hair."],
      ['grandma', 'curly hair', "She's got curly hair."],
      ['mum', 'yellow hair', "She's got yellow hair."],
    ];
    for (const [who, hair, sentence] of looks) {
      fireEvent.click(screen.getByRole('button', { name: who }));
      fireEvent.click(screen.getByRole('button', { name: hair.startsWith('black') ? 'bob hair' : hair.startsWith('curly') ? 'curly hair' : 'bun hair' }));
      fireEvent.click(screen.getByRole('button', { name: 'stripes top' }));
      fireEvent.click(screen.getByRole('button', { name: 'smile face' }));
      expect(document.querySelector('.puppet img[src*="wig-"]')).not.toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Show the puppet' }));
      await waitFor(() => expect(document.querySelector('.speak-card__sentence')?.textContent).toBe(`This is my ${who}.`), { timeout: 2000 });
      saidIt();
      expect(document.querySelector('.speak-card__sentence')?.textContent).toBe(sentence);
      saidIt();
    }
    await celebration(/puppet show/);
    expect(saved('puppet-studio')).toMatchObject({ stars: 3, completed: true });
  });
});
