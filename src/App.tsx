import { Component, useCallback, useEffect, useState, type ReactNode } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { AppProvider } from './hooks/useApp';
import { Home } from './screens/Home';
import { GAME_COMPONENTS } from './games/registry';
import { ParentPanel, PillButton } from './components/ui';
import { gameById, type GameId } from './content/games';
import { audio } from './services/audio';

function GameView({ id, onHome, onParent }: { id: GameId; onHome: () => void; onParent: () => void }) {
  const C = GAME_COMPONENTS[id];
  return C ? <C onHome={onHome} onParent={onParent} /> : null;
}

type Screen = { name: 'home' } | { name: 'game'; id: GameId };

/** Keeps a crash in one game from blanking the whole app. */
class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error(err);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash">
        <p>Oops! Something went wrong.</p>
        <PillButton tone="orange" onClick={() => (this.setState({ failed: false }), this.props.onReset())}>
          Back home
        </PillButton>
      </div>
    );
  }
}

const screenFromHash = (): Screen => {
  const id = location.hash.replace(/^#\/?/, '');
  const g = gameById(id);
  return g && GAME_COMPONENTS[g.id] ? { name: 'game', id: g.id } : { name: 'home' };
};

export function App() {
  const [screen, setScreen] = useState<Screen>(screenFromHash);
  const [parentOpen, setParentOpen] = useState(false);

  // Browser back button returns to the home screen.
  useEffect(() => {
    const on = () => setScreen(screenFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((s: Screen) => {
    audio.stop();
    location.hash = s.name === 'game' ? `/${s.id}` : '';
    setScreen(s);
  }, []);

  const goHome = useCallback(() => go({ name: 'home' }), [go]);

  return (
    <MotionConfig reducedMotion="user">
    <AppProvider>
      <ErrorBoundary onReset={goHome}>
        {/* Keyed fade-in only — no exit animation, so a screen can never get stuck half-way. */}
        <motion.div key={screen.name === 'game' ? screen.id : 'home'} className="screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {screen.name === 'home' && <Home onOpen={(id) => go({ name: 'game', id })} onParent={() => setParentOpen(true)} />}
            {screen.name === 'game' && <GameView id={screen.id} onHome={goHome} onParent={() => setParentOpen(true)} />}
        </motion.div>
        <ParentPanel open={parentOpen} onClose={() => setParentOpen(false)} gameId={screen.name === 'game' ? screen.id : undefined} />
      </ErrorBoundary>
    </AppProvider>
    </MotionConfig>
  );
}
