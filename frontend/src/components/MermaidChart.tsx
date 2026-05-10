import { useEffect, useId, useMemo, useState } from 'react';
import { SurfacePanel } from './ui';

interface MermaidChartProps {
  title: string;
  chart: string;
}

type MermaidState =
  | { status: 'loading'; svg: string; error: string }
  | { status: 'ready'; svg: string; error: string }
  | { status: 'error'; svg: string; error: string };

type MermaidApi = typeof import('mermaid').default;

let mermaidRenderQueue: Promise<unknown> = Promise.resolve();
let mermaidRenderCounter = 0;

function renderMermaidChart(mermaid: MermaidApi, renderId: string, chart: string) {
  const renderTask = mermaidRenderQueue
    .catch(() => undefined)
    .then(() => mermaid.render(renderId, chart));

  mermaidRenderQueue = renderTask.then(
    () => undefined,
    () => undefined,
  );

  return renderTask;
}

export function MermaidChart({ title, chart }: MermaidChartProps) {
  const reactId = useId();
  const renderId = useMemo(() => `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [reactId]);
  const [state, setState] = useState<MermaidState>({ status: 'loading', svg: '', error: '' });

  useEffect(() => {
    let active = true;

    async function renderChart() {
      setState({ status: 'loading', svg: '', error: '' });

      try {
        const module = await import('mermaid');
        const mermaid = module.default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          flowchart: {
            htmlLabels: true,
            nodeSpacing: 58,
            rankSpacing: 72,
            wrappingWidth: 150,
          },
          themeVariables: {
            background: 'transparent',
            primaryColor: '#f5f0e8',
            primaryTextColor: '#141413',
            primaryBorderColor: '#cc785c',
            lineColor: '#706b63',
            secondaryColor: '#e8f5f2',
            tertiaryColor: '#fdf6e3',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          },
        });

        mermaidRenderCounter += 1;
        const result = await renderMermaidChart(mermaid, `${renderId}-${mermaidRenderCounter}`, chart);
        if (active) {
          setState({ status: 'ready', svg: result.svg, error: '' });
        }
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            svg: '',
            error: error instanceof Error ? error.message : 'Unable to render chart.',
          });
        }
      }
    }

    void renderChart();

    return () => {
      active = false;
    };
  }, [chart, renderId]);

  return (
    <SurfacePanel padding="lg" className="space-y-4 overflow-hidden">
      <div>
        <h2 className="text-xl font-black text-ink">{title}</h2>
      </div>

      <div className="min-h-[260px] overflow-x-auto rounded-lg border border-hairline bg-canvas p-4">
        {state.status === 'loading' ? (
          <div className="flex min-h-[228px] items-center justify-center text-sm font-black text-muted">
            Loading chart...
          </div>
        ) : state.status === 'ready' ? (
          <div
            className="min-w-[720px] [&_svg]:mx-auto [&_svg]:max-w-full"
            aria-label={`${title} Mermaid chart`}
            dangerouslySetInnerHTML={{ __html: state.svg }}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-error">{state.error}</p>
            <pre
              aria-label="Mermaid source fallback"
              className="overflow-x-auto rounded-lg bg-surface-soft p-4 text-xs font-semibold leading-6 text-body"
            >
              {chart}
            </pre>
          </div>
        )}

      </div>
    </SurfacePanel>
  );
}
