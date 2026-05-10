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
            primaryColor: '#eef2ff',
            primaryTextColor: '#1e1b4b',
            primaryBorderColor: '#6366f1',
            lineColor: '#64748b',
            secondaryColor: '#ecfeff',
            tertiaryColor: '#fef3c7',
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
        <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>
      </div>

      <div className="min-h-[260px] overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        {state.status === 'loading' ? (
          <div className="flex min-h-[228px] items-center justify-center text-sm font-black text-slate-500 dark:text-slate-300">
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
            <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{state.error}</p>
            <pre
              aria-label="Mermaid source fallback"
              className="overflow-x-auto rounded-lg bg-slate-100 p-4 text-xs font-semibold leading-6 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {chart}
            </pre>
          </div>
        )}

      </div>
    </SurfacePanel>
  );
}
