import React, { useState } from 'react';
import { CanvasContainer } from './components/CanvasContainer';
import { CinematicIntro } from './components/CinematicIntro';

export const App: React.FC = () => {
  const [introFinished, setIntroFinished] = useState(false);

  return (
    <main className="simulation-app">
      {!introFinished && (
        <CinematicIntro onComplete={() => setIntroFinished(true)} />
      )}
      <CanvasContainer />
    </main>
  );
};

export default App;
