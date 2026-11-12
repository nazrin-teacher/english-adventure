/**
 * Start-to-finish play-throughs of the eight upgraded games (jsdom, real
 * components, logic and progress storage; only speech output is stubbed),
 * plus checks that every challenge has exactly one correct answer.
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
import { ANIMAL_ORDER } from '../content/farm';
import { THING_ORDER, THINGS } from '../content/school';
import { MEMBERS, MEMORY_MEMBERS, PUPPET_ORDERS, SOFA_ORDER, puppetSentences } from '../content/family';
import { SAFARI_MISSIONS, matches } from '../content/iCanSee';
import { animalsMatching, clueFor, makeRounds as animalRounds } from './which-animal/logic';
import { CLUE_TARGETS, COLOUR, SIMILAR, makeRounds as classRounds } from './school-match/logic';
import { DESK, MISSIONS, fits, solvable } from './its-a/logic';
import { makeDeck, flip } from './family-memory/logic';
import { LOOKS, cluesFor, makeGuessRounds, partAt, whoMatches } from './meet-family/logic';
import { pickMissions } from './object-hunt/ObjectHunt';
import { shuffle } from '../components/scene';

const saved = (id: string) => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').games?.[id];
const play = (C: ComponentType<GameProps>) =>
  render(
    <AppProvider>
      <C onHome={() => undefined} onParent={() => undefined} />
    </AppProvider>,
  );
const prompt = () => document.querySelector('.prompt__text')?.textContent ?? '';
const saidIt = () => fireEvent.click(screen.getAllByRole('button', { name: /I said it!/ })[0]);
const sayAll = async (max = 4) => {
  for (let i = 0; i < max && screen.queryAllByRole('button', { name: /I said it!/ }).length; i++) saidIt();
};
const click = (label: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: label }));
const celebration = (title: RegExp) => screen.findByRole('heading', { name: title }, { timeout: 6000 });
const until = (fn: () => void, timeout = 6000) => waitFor(fn, { timeout });

beforeEach(() => {
  localStorage.clear();
  said.length = 0;
});

describe('every home card opens a game', () => {
  it.each(GAMES.map((g) => g.id))('%s', (id) => expect(GAME_COMPONENTS[id]).toBeTruthy());
});

/* ------------------------------------------------------------------ */
describe('content: every challenge has exactly one answer', () => {
  it('Farm Animal Detective clues and rounds', () => {
    for (const a of ANIMAL_ORDER) expect(animalsMatching(clueFor(a))).toEqual([a]);
    for (let seed = 1; seed < 30; seed++) {
      const r = animalRounds(seed);
      expect(new Set(r.map((x) => x.kind)).size).toBe(5);
      for (let i = 1; i < r.length; i++) expect(r[i].answer).not.toBe(r[i - 1].answer);
      for (const x of r.filter((x) => x.kind === 'match')) expect(x.options!.filter((o) => o === x.answer)).toHaveLength(1);
    }
  });
  it('Farm Safari missions', () => {
    for (const m of SAFARI_MISSIONS) expect(ANIMAL_ORDER.filter((a) => matches(a, m.find))).toEqual([m.answer]);
  });
  it('Classroom Detective rounds', () => {
    for (const t of CLUE_TARGETS) expect(THING_ORDER.filter((u) => COLOUR[u] === COLOUR[t])).toEqual([t]);
    for (const s of SIMILAR) expect(s.options.filter((o) => o === s.target)).toHaveLength(1);
    for (let seed = 1; seed < 30; seed++)
      for (const r of classRounds(seed)) {
        if (r.kind === 'missing') {
          expect(r.shown).toContain(r.target);
          expect(r.options.filter((o) => r.shown.includes(o))).toEqual([r.target]);
        }
        if (r.kind === 'hidden') expect(r.options.filter((o) => o === r.target)).toHaveLength(1);
      }
  });
  it('Pack My School Bag: every mission is possible in order', () => {
    let desk = [...DESK];
    for (const m of MISSIONS) {
      expect(solvable(desk, m)).toBe(true);
      const take = desk.filter((d) => fits(d, m)).slice(0, m.count ?? 1);
      desk = desk.filter((d) => !take.includes(d));
    }
    // colour missions really need listening: another colour of the same thing is on the desk
    for (const m of MISSIONS.filter((x) => x.colour)) expect(DESK.filter((d) => d.thing === m.thing).length).toBeGreaterThan(1);
  });
  it('Guess Who? clues', () => {
    for (let seed = 1; seed < 40; seed++) {
      const rounds = makeGuessRounds(seed);
      expect(rounds).toHaveLength(6);
      for (const r of rounds) expect(whoMatches(r.clues)).toEqual([r.target]);
      expect(rounds.slice(3).every((r) => r.clues.length === 2)).toBe(true);
    }
    for (const m of MEMORY_MEMBERS) for (const c of cluesFor(m)) expect(c.test(LOOKS[m])).toBe(true);
    expect(partAt(1247, 320)).toBe('nose');
    expect(partAt(1240, 360)).toBe('mouth');
    expect(partAt(1250, 520)).toBe('body');
  });
  it('Puppet sentences', () => {
    expect(puppetSentences({ who: 'grandma', wig: 'curly', hair: 'grey', extra: 'glasses' })).toEqual(['This is my grandma.', "She's got curly grey hair.", "She's got glasses."]);
    expect(puppetSentences({ who: 'dad', wig: 'bun', hair: 'black', extra: 'none' })).toEqual(['This is my dad.', "He's got black hair."]);
  });
});

/* ------------------------------------------------------------------ */
describe('Farm Animal Detective', () => {
  it('discover → 10 mixed rounds → speak', async () => {
    play(GAME_COMPONENTS['which-animal']!);
    for (const a of ANIMAL_ORDER) click(a);
    expect(said).toContain("Moo! It's a cow.");
    await until(() => expect(prompt()).not.toMatch(/Meet the farm/));
    const rounds = animalRounds(1);
    const wrong = ANIMAL_ORDER.find((a) => a !== rounds[0].answer)!;
    click(wrong);
    await until(() => expect(said.some((s) => s.startsWith(`That's the ${wrong}`))).toBe(true));
    for (const [i, r] of rounds.entries()) {
      await until(() => expect(screen.getByText(`${i + 1} / ${rounds.length}`)).toBeInTheDocument());
      if (r.kind === 'shadow') expect(screen.getByAltText('Animal shadow')).toBeInTheDocument();
      if (r.kind === 'hidden') expect(screen.getByLabelText('An animal is hiding')).toBeInTheDocument();
      if (r.kind === 'match') click(`Sound ${r.options!.indexOf(r.answer) + 1}`);
      else click(r.answer);
    }
    await until(() => expect(prompt()).toMatch(/Now you!/));
    for (const a of ['cow', 'pig', 'duck']) {
      click(a);
      await sayAll();
    }
    await celebration(/farm detective/);
    expect(saved('which-animal')).toMatchObject({ stars: 3, completed: true });
  }, 40000);
});

describe('Farm Safari', () => {
  it('binocular discovery → observation missions → farm report', async () => {
    play(GAME_COMPONENTS['i-can-see']!);
    for (const a of ANIMAL_ORDER) {
      click(`${a} on the farm`); // moves the lens onto the animal
      await until(() => expect(said).toContain(`I can see a ${a}!`));
    }
    await until(() => expect(prompt()).not.toMatch(/Move the binoculars/));
    const missions = shuffle(SAFARI_MISSIONS, 1).slice(0, 5);
    for (const m of missions) {
      await until(() => expect(prompt()).toBe(m.say));
      const wrong = ANIMAL_ORDER.find((a) => a !== m.answer)!;
      await act(async () => click(`${wrong} on the farm`));
      await act(async () => click(`${m.answer} on the farm`));
    }
    await until(() => expect(prompt()).toMatch(/farm report/));
    for (const a of ['horse', 'hen', 'sheep']) {
      click(`${a} on the farm`);
      expect(document.querySelector('.speak-card__sentence')?.textContent).toBe(`I can see a ${a}.`);
      await sayAll(3);
    }
    await until(() => expect(prompt()).toMatch(/Listen to your farm report/));
    click('Play my report');
    click(/I said it!/);
    await celebration(/Great farm report/);
    expect(saved('i-can-see')).toMatchObject({ stars: 3, completed: true });
  }, 40000);
});

describe('Classroom Detective', () => {
  it('explore → clue, look-alike, hidden and missing missions → "It\'s a…"', async () => {
    play(GAME_COMPONENTS['school-objects-match']!);
    for (const t of THING_ORDER) click(THINGS[t].word);
    await until(() => expect(prompt()).not.toMatch(/explore/));
    const rounds = classRounds(1);
    for (const [i, r] of rounds.entries()) {
      await until(() => expect(screen.getByText(`${i + 1} / ${rounds.length}`)).toBeInTheDocument());
      if (r.kind === 'clue') {
        expect(prompt()).toBe(`It's ${COLOUR[r.target]}. What is it? Find it!`);
        await act(async () => click(THINGS[r.target].word));
      } else {
        await until(() => expect(screen.getByRole('button', { name: `choice ${r.target}` })).toBeInTheDocument());
        await act(async () => click(`choice ${r.target}`));
      }
    }
    await until(() => expect(prompt()).toMatch(/Your turn/));
    for (const t of ['pencil', 'scissors', 'eraser', 'book'] as const) {
      click(THINGS[t].word);
      await sayAll();
    }
    expect(said).toContain("They're scissors.");
    await celebration(/classroom detective/);
    expect(saved('school-objects-match')).toMatchObject({ stars: 3, completed: true });
  }, 40000);
});

describe('Pack My School Bag', () => {
  it('explore → find & put with colours and numbers → open the bag', async () => {
    play(GAME_COMPONENTS['its-a']!);
    for (const id of ['red book', 'blue book', 'green pen', 'orange sharpener', 'pink eraser', 'red scissors']) click(id);
    await until(() => expect(prompt()).toBe('Find the pen.'));
    const order: [string, string[]][] = [
      ['green pen', []],
      ['orange sharpener', []],
      ['red book', ['blue book']],
      ['pink pencil case', ['blue pencil case']],
      ['yellow pencil', []],
      ['blue scissors', ['red scissors']],
      ['blue eraser', ['pink eraser']],
    ];
    for (const [i, [item, wrong]] of order.entries()) {
      await until(() => expect(screen.getByText(`${i + 1} / ${MISSIONS.length}`)).toBeInTheDocument());
      for (const w of wrong) {
        click(w); // wrong colour is not accepted
        expect(document.querySelector('.desk-item.is-selected')).toBeNull();
      }
      if (MISSIONS[i].count) {
        for (let n = 0; n < 2; n++) {
          fireEvent.click(screen.getAllByRole('button', { name: item }).find((b) => !(b as HTMLButtonElement).disabled)!);
          click('school bag');
          await until(() => expect(document.querySelectorAll('[data-packed^="pencil"]')).toHaveLength(n + 1));
        }
      } else {
        click(item);
        await act(async () => click('school bag'));
      }
    }
    await until(() => expect(prompt()).toMatch(/open my bag/));
    expect(document.querySelectorAll('[data-packed]')).toHaveLength(8);
    for (const id of ['book-red', 'scissors-blue', 'sharpener', 'pen']) {
      fireEvent.click(document.querySelector(`[data-packed="${id}"]`)!);
      await sayAll();
    }
    expect(said).toContain("It's a red book.");
    expect(said).toContain("It's an orange sharpener.");
    expect(said).toContain("They're blue scissors.");
    await celebration(/ready for school/);
    expect(saved('its-a')).toMatchObject({ stars: 3, completed: true });
  }, 40000);
});

describe('School Treasure Hunt', () => {
  it('mission cards → grown-up confirms real finds → describe treasures', async () => {
    play(GAME_COMPONENTS['school-object-hunt']!);
    const missions = pickMissions(1);
    expect(missions.map((m) => m.id)).toContain('orange');
    for (const btn of screen.getAllByRole('button', { name: 'Mission card' })) fireEvent.click(btn);
    for (const [i, m] of missions.entries()) {
      await until(() => expect(prompt()).toBe(`${m.say} Go and look!`));
      click("I'm back!");
      if (i === 2) {
        click('Not this time'); // skipping is allowed; nothing is pretended
        continue;
      }
      fireEvent.keyDown(screen.getByRole('button', { name: 'Grown-up: hold if found' }), { key: 'Enter' });
      expect(document.querySelector('.speak-card__sentence')?.textContent).toBe(m.found);
      await sayAll();
    }
    await until(() => expect(prompt()).toMatch(/Look at your treasures/));
    const treasures = screen.getAllByRole('button', { name: /^treasure:/ });
    expect(treasures).toHaveLength(4);
    for (const t of treasures.slice(0, 3)) {
      fireEvent.click(t);
      await sayAll();
    }
    await celebration(/treasure hunter/);
    expect(saved('school-object-hunt')).toMatchObject({ stars: 3, completed: true });
  }, 40000);
});

describe('Family Mystery', () => {
  it('memory rules', () => {
    const deck = makeDeck(4, 3);
    const a = deck[0];
    const twin = deck.find((c) => c.member === a.member && c.id !== a.id)!;
    const other = deck.find((c) => c.member !== a.member)!;
    expect(flip(deck, [a.id], [], twin.id)).toBe('match');
    expect(flip(deck, [a.id], [], other.id)).toBe('miss');
  });

  it('meet → memory, missing, listen, picture → introduce', async () => {
    play(GAME_COMPONENTS['family-memory']!);
    for (const m of MEMORY_MEMBERS) click(MEMBERS[m].word);
    expect(said).toContain('This is my grandpa.');
    for (const [level, pairs] of [3, 4].entries()) {
      await until(() => expect(screen.getByText(`Level ${level + 1}`)).toBeInTheDocument());
      const deck = makeDeck(pairs, 1 * 5 + level);
      const cards = () => [...document.querySelectorAll<HTMLButtonElement>('.memory-card')];
      await until(() => expect(cards()).toHaveLength(pairs * 2));
      const seen = new Set<number>();
      for (const c of deck) {
        if (seen.has(c.id)) continue;
        const twin = deck.find((d) => d.member === c.member && d.id !== c.id)!;
        seen.add(c.id).add(twin.id);
        fireEvent.click(cards()[c.id]);
        fireEvent.click(cards()[twin.id]);
        await until(() => expect(cards()[twin.id].className).toContain('is-matched'));
      }
    }
    for (let i = 0; i < 2; i++) {
      await until(() => expect(prompt()).toBe('Who is missing?'));
      const target = [...document.querySelectorAll<HTMLElement>('.family-wall__tile')].find((t) => t.style.visibility === 'hidden')!.getAttribute('aria-label')!;
      await act(async () => click(`choice ${target}`));
      if (i === 0) await until(() => expect(prompt()).toBe('Look at my family!'));
    }
    for (let i = 0; i < 2; i++) {
      await until(() => expect(prompt()).toMatch(/^Where is/));
      const who = prompt().replace('Where is ', '').replace('? Tap.', '');
      await act(async () => click(who));
      if (i === 0) await until(() => expect(prompt()).not.toBe(`Where is ${who}? Tap.`));
    }
    for (let i = 0; i < 2; i++) {
      await until(() => expect(prompt()).toMatch(/in the picture/));
      const who = prompt().replace('Find ', '').replace(' in the picture!', '');
      expect(SOFA_ORDER).toContain(who);
      await act(async () => click(`${who} in the picture`));
      if (i === 0) await until(() => expect(prompt()).not.toBe(`Find ${who} in the picture!`));
    }
    await until(() => expect(prompt()).toMatch(/Introduce my family/));
    for (const m of ['mum', 'grandpa', 'sister']) {
      click(m);
      expect(document.querySelector('.speak-card__sentence')?.textContent).toBe(`This is my ${m}.`);
      await sayAll();
    }
    expect(said).toContain("He's my grandpa.");
    await celebration(/family mystery/);
    expect(saved('family-memory')).toMatchObject({ stars: 3, completed: true });
  }, 50000);
});

describe('Guess Who?', () => {
  it('body parts → clue guessing → describe → make a clue for a grown-up', async () => {
    play(GAME_COMPONENTS['meet-my-family']!);
    click("grandma's nose"); // wrong part first (it asks for her hair)
    expect(said.some((s) => s.startsWith('This is her nose. Touch her hair.'))).toBe(true);
    for (const p of ['hair', 'eyes', 'nose', 'mouth', 'ears', 'face', 'arms', 'body']) {
      await until(() => expect(prompt()).toBe(`Touch grandma's ${p}.`));
      click(`grandma's ${p}`);
    }
    const rounds = makeGuessRounds(1);
    for (const [i, r] of rounds.entries()) {
      await until(() => expect(screen.getByText(`${i + 1} / ${rounds.length}`)).toBeInTheDocument());
      for (const c of r.clues) expect(screen.getByText(c.text)).toBeInTheDocument();
      await act(async () => click(r.target));
    }
    await until(() => expect(prompt()).toMatch(/Choose a person/));
    click('grandma');
    await sayAll();
    expect(said).toContain("She's my grandma.");
    await until(() => expect(prompt()).toMatch(/secret person/));
    click('dad');
    expect(screen.getByText("He's got black hair.")).toBeInTheDocument();
    click(/I said it!/);
    await until(() => expect(prompt()).toMatch(/Grown-up, who is it/));
    click('brother');
    await act(async () => click('dad'));
    await celebration(/super guesser/);
    expect(saved('meet-my-family')).toMatchObject({ stars: 3, completed: true });
  }, 40000);
});

describe('My Family Puppet Studio', () => {
  it('meet puppets → build from orders (checked) → own puppet → arrange → show', async () => {
    play(GAME_COMPONENTS['puppet-studio']!);
    for (const w of ['mum', 'dad', 'grandma', 'grandpa']) click(w);
    const orders = shuffle(PUPPET_ORDERS, 1).slice(0, 2);
    for (const o of orders) {
      await until(() => expect(prompt()).toBe(o.say), 8000);
      click('Show the puppet'); // not built yet → gently rejected
      expect(said).toContain(`Not yet! ${o.say}`);
      click(o.who);
      click(`${o.wig === 'bob' ? 'straight' : o.wig} hair`);
      click(`${o.hair} hair colour`);
      const look = document.querySelector('.puppet-stage .puppet')!.getAttribute('data-look')!;
      expect(look.startsWith(`${o.who}|${o.wig}|${o.hair}`)).toBe(true);
      click('Show the puppet');
    }
    await until(() => expect(prompt()).toMatch(/make your own puppet/));
    click('mum');
    click('bun hair');
    click('yellow hair colour');
    click('dress top');
    click('bow');
    expect(document.querySelector('.puppet-stage .puppet__bow')).not.toBeNull();
    expect(document.querySelector('.puppet-stage [data-hair="yellow"]')).not.toBeNull();
    click('Show the puppet');
    await until(() => expect(prompt()).toMatch(/swap/));
    expect(screen.getAllByRole('button', { name: /^stage puppet/ })).toHaveLength(3);
    click(/stage puppet 1/);
    click(/stage puppet 3/);
    expect(screen.getByRole('button', { name: /stage puppet 1/ }).getAttribute('aria-label')).toMatch(/mum/);
    click('Start the show!');
    await until(() => expect(document.querySelector('.speak-card__sentence')?.textContent).toBe('This is my mum.'));
    await sayAll();
    expect(said).toContain("She's got yellow hair.");
    expect(said).toContain("She's got a pink bow.");
    for (let i = 0; i < 2; i++) {
      await until(() => expect(screen.queryAllByRole('button', { name: /I said it!/ }).length).toBeGreaterThan(0));
      await sayAll();
    }
    await until(() => expect(prompt()).toMatch(/Bravo/));
    click('Finish');
    await celebration(/puppet show/);
    expect(saved('puppet-studio')).toMatchObject({ stars: 3, completed: true });
  }, 40000);
});
