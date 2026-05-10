import { Code2 } from 'lucide-react';
import { AppScreen, ScreenHeader } from './ui';
import { MermaidChart } from './MermaidChart';

interface DeveloperChartsScreenProps {
  onBack: () => void;
}

interface DeveloperChartDefinition {
  title: string;
  chart: string;
}

const developerCharts: DeveloperChartDefinition[] = [
  {
    title: 'Preference-driven learning',
    chart: `flowchart TD
  A["Onboarding answers"] --> B["Profile JSON"]
  B --> C["LearningPreferenceProfile"]
  C --> D["POST /api/cards/adaptive/query"]
  D --> E["FlashcardEntity rows"]
  E --> F["Filter: request.language"]
  F --> G{"selected_categories?"}
  G -->|yes| H["Optional: selected_categories"]
  G -->|no| I["language-only query"]
  H --> J["session.exec query all"]
  I --> J
  J --> K["get_user_stats_by_word"]
  K --> L["build_adaptive_candidates"]
  L --> M["Further refinement after SQL"]
  M --> N["Weights from onboarding answers"]
  N --> O["Python ranking"]
  O --> P["select_preference_weighted_candidates"]
  P --> Q["card_preference_score"]
  Q --> R["Preference score ranks candidates"]
  R --> S["domain +8"]
  R --> T["tone +3"]
  R --> U["word style +2"]
  R --> V["part of speech +2"]
  P --> W["grammar reserve: 18%"]
  P --> X["exploration: 8%"]
  P --> AA{"semanticDiversityMode?"}
  AA -->|wide| AB["round-robin semantic groups"]
  AA -->|precise| AC["cluster semantic groups"]
  AA -->|balanced| AD["keep ranked order"]
  AB --> Y["AdaptiveFlashcard response"]
  AC --> Y
  AD --> Y
  S --> Y
  T --> Y
  U --> Y
  V --> Y
  W --> Y
  X --> Y`,
  },
  {
    title: 'Vocabulary memory loop',
    chart: `flowchart TD
  A["Shown card"] --> B{"Known?"}
  B -->|Yes| C["Raise confidence"]
  B -->|No| D["Raise urgency"]
  C --> E["update stats"]
  D --> E
  E --> F["user_word_statistics"]
  F --> G["Your Vocabulary"]
  F --> H["Adaptive summary"]
  H --> I["400-level path"]
  F --> J["Deck order"]`,
  },
  {
    title: 'Sentence challenge truth flow',
    chart: `flowchart TD
  A["User profile"] --> B["GET challenges"]
  B --> C["sentence_challenges"]
  C --> D["Target + distractors"]
  D --> E["Word bank"]
  E --> F["User sentence"]
  F --> G{"Matches truth?"}
  G -->|Correct| H["XP feedback"]
  G -->|Wrong| I["Correction"]
  H --> J["Grammar signals"]
  I --> J`,
  },
  {
    title: 'Semantic diversity ordering',
    chart: `flowchart TD
  A["semanticDiversityMode wide"] --> B["semantic_group_key"]
  B --> C["thematic_domain"]
  B --> D["category"]
  B --> E["part_of_speech"]
  C --> F["round-robin semantic groups"]
  D --> F
  E --> F
  F --> G["Less adjacent topic repetition"]`,
  },
  {
    title: 'Route and feature map',
    chart: `flowchart TD
  A["/"] --> B["Learning path"]
  B --> C["/learn"]
  B --> D["/learn/filters"]
  B --> E["/placement/sentence"]
  B --> F["/vocabulary"]
  A --> G["/grammar/graph"]
  G --> H["/grammar/build-sentence"]
  G --> I["/grammar/compose-sentence"]
  A --> J["/library"]
  J --> K["/library/words/:id/db-row"]
  A --> L["/developer"]
  L --> M["Mermaid system charts"]`,
  },
];

export function DeveloperChartsScreen({ onBack }: DeveloperChartsScreenProps) {
  return (
    <AppScreen width="wide" contentClassName="min-h-dvh px-4 py-4">
      <div className="space-y-5 pb-10">
        <ScreenHeader
          title="Sviluppatore"
          subtitle="Diagrammi Mermaid basati solo sul codice realmente implementato."
          icon={<Code2 size={30} />}
          onBack={onBack}
        />

        <div className="space-y-5">
          {developerCharts.map((chart) => (
            <MermaidChart
              key={chart.title}
              title={chart.title}
              chart={chart.chart}
            />
          ))}
        </div>
      </div>
    </AppScreen>
  );
}
