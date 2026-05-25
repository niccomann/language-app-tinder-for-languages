import { Cloud, GitBranch, Globe2, Layers, Magnet } from 'lucide-react';
import { HubGrid, SceneShell, type HubGridItem } from './scene';
import { grammarPath, type GrammarView } from '../routes/appRoutes';
import { useCopy } from '../i18n/languageContext';
import { isOwnerMode } from '../config/ownerMode';

interface GrammarHubProps {
  onNavigate: (path: string) => void;
}

type EntryKey = Extract<GrammarView, 'graph' | 'wordcloud' | 'clusters' | 'dialects' | 'sunburst'>;

const ICONS: Record<EntryKey, HubGridItem['icon']> = {
  graph: <GitBranch size={20} />,
  wordcloud: <Cloud size={20} />,
  clusters: <Magnet size={20} />,
  dialects: <Globe2 size={20} />,
  sunburst: <Layers size={20} />,
};

const ORDER: EntryKey[] = ['graph', 'wordcloud', 'clusters', 'dialects', 'sunburst'];

export function GrammarHub({ onNavigate }: GrammarHubProps) {
  const copy = useCopy();
  const gh = copy.grammarHub;
  // Dialects is owner-only (see ownerMode.ts) and currently has no data.
  const order = isOwnerMode() ? ORDER : ORDER.filter((key) => key !== 'dialects');
  const items: HubGridItem[] = order.map((key) => ({
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
