import { Cloud, Gamepad2, GitBranch, Globe2, Layers, Magnet, Puzzle } from 'lucide-react';
import { HubGrid, SceneShell, type HubGridItem } from './scene';
import { grammarPath, type GrammarView } from '../routes/appRoutes';
import { useCopy } from '../i18n/languageContext';

interface GrammarHubProps {
  onNavigate: (path: string) => void;
}

type EntryKey = Extract<GrammarView, 'graph' | 'wordcloud' | 'builder' | 'funbuilder' | 'clusters' | 'dialects' | 'sunburst'>;

const ICONS: Record<EntryKey, HubGridItem['icon']> = {
  graph: <GitBranch size={20} />,
  wordcloud: <Cloud size={20} />,
  builder: <Puzzle size={20} />,
  funbuilder: <Gamepad2 size={20} />,
  clusters: <Magnet size={20} />,
  dialects: <Globe2 size={20} />,
  sunburst: <Layers size={20} />,
};

const ORDER: EntryKey[] = ['graph', 'wordcloud', 'builder', 'funbuilder', 'clusters', 'dialects', 'sunburst'];

export function GrammarHub({ onNavigate }: GrammarHubProps) {
  const copy = useCopy();
  const gh = copy.grammarHub;
  const items: HubGridItem[] = ORDER.map((key) => ({
    id: key,
    icon: ICONS[key],
    title: gh.entries[key].title,
    sub: gh.entries[key].sub,
    onClick: () => onNavigate(grammarPath(key)),
  }));
  return (
    <SceneShell
      eyebrow={gh.eyebrow}
      title={gh.title}
      subline={gh.subline}
      explainerKey="grammar.hub"
      explainerTitle={gh.explainerTitle}
      explainerBody={
        <>
          <p>{gh.explainerBodyP1}</p>
          <p>{gh.explainerBodyP2}</p>
        </>
      }
      onNavigate={onNavigate}
    >
      <HubGrid items={items} />
    </SceneShell>
  );
}
