import { Cloud, Gamepad2, GitBranch, Globe2, Layers, Magnet, Puzzle } from 'lucide-react';
import { HubGrid, SceneShell, type HubGridItem } from './scene';
import { grammarPath, type GrammarView } from '../routes/appRoutes';

interface GrammarHubProps {
  onNavigate: (path: string) => void;
}

interface HubEntry {
  view: GrammarView;
  icon: HubGridItem['icon'];
  title: string;
  sub: string;
}

const ENTRIES: HubEntry[] = [
  { view: 'graph', icon: <GitBranch size={20} />, title: 'Sentence Graph', sub: 'Relazioni grammaticali tra le parole.' },
  { view: 'wordcloud', icon: <Cloud size={20} />, title: 'Word Cloud', sub: 'Frequenza delle parole incontrate.' },
  { view: 'builder', icon: <Puzzle size={20} />, title: 'Build Sentence', sub: 'Costruisci frasi da un word bank.' },
  { view: 'funbuilder', icon: <Gamepad2 size={20} />, title: 'Compose Sentence', sub: 'Versione playful del builder.' },
  { view: 'clusters', icon: <Magnet size={20} />, title: 'Clusters', sub: 'Gruppi semantici di parole correlate.' },
  { view: 'dialects', icon: <Globe2 size={20} />, title: 'Dialects', sub: 'Varianti regionali del vocabolario.' },
  { view: 'sunburst', icon: <Layers size={20} />, title: 'Hierarchy', sub: 'Struttura gerarchica dei concetti.' },
];

export function GrammarHub({ onNavigate }: GrammarHubProps) {
  const items: HubGridItem[] = ENTRIES.map((e) => ({
    id: e.view,
    icon: e.icon,
    title: e.title,
    sub: e.sub,
    onClick: () => onNavigate(grammarPath(e.view)),
  }));
  return (
    <SceneShell
      eyebrow="EXPLORE · GRAMMAR · HUB"
      title="Grammar Lab"
      subline="Sette strumenti per analizzare grammatica e vocabolario."
      explainerKey="grammar.hub"
      explainerTitle="Cosa trovi nel Grammar Lab"
      explainerBody={
        <>
          <p>
            Il Grammar Lab è la cassetta degli attrezzi per analizzare il tedesco. Ogni tool risponde a una
            domanda diversa.
          </p>
          <p>
            Esempio: Sentence Graph mostra come le parole di una frase sono legate; Word Cloud mostra quali
            parole compaiono più spesso. Aprili uno alla volta.
          </p>
        </>
      }
      onNavigate={onNavigate}
    >
      <HubGrid items={items} />
    </SceneShell>
  );
}
