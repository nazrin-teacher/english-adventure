import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

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
import { Home } from './Home';
import { GAMES } from '../content/games';
import { parseState, withStars, defaultState } from '../services/progress';

describe('Home screen', () => {
  it('shows nine game cards and every card opens its game', () => {
    const onOpen = vi.fn();
    render(
      <AppProvider>
        <Home onOpen={onOpen} onParent={() => undefined} />
      </AppProvider>,
    );
    const cards = document.querySelectorAll('.home-card');
    expect(cards).toHaveLength(9);
    for (const g of GAMES) expect(screen.getByRole('button', { name: new RegExp(g.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Little Farm Designer/ }));
    expect(onOpen).toHaveBeenCalledWith('build-my-farm');

    fireEvent.click(screen.getByRole('button', { name: /Farm Animal Detective/ }));
    expect(onOpen).toHaveBeenLastCalledWith('which-animal');
    expect(document.querySelectorAll('.home-card__lock')).toHaveLength(0);
  });
});

describe('progress storage', () => {
  it('keeps the best stars and survives corrupt data', () => {
    let s = withStars(defaultState(), 'build-my-farm', 3, true);
    s = withStars(s, 'build-my-farm', 1, false);
    expect(s.games['build-my-farm']).toMatchObject({ stars: 3, completed: true, timesCompleted: 1 });
    expect(parseState('{not json').games).toEqual({});
    expect(parseState(JSON.stringify({ games: { x: { stars: 99 } } })).games.x.stars).toBe(3);
  });
});

describe('no internal curriculum labels in the app', () => {
  const FORBIDDEN = [/Ready Steady/i, /\bUnit \d/i, /Vocabulary Game/i, /Language Structure/i, /Explore More/i, /At School/, /I Love My Family/, /Farm Animals/];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|json|css)$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p);
    }
  };
  walk(join(process.cwd(), 'src'));
  it.each(files)('%s', (file) => {
    const text = readFileSync(file, 'utf8');
    for (const re of FORBIDDEN) expect(text, `${file} contains ${re}`).not.toMatch(re);
  });
});
