import type { ReactNode } from 'react';

interface CalloutCardProps {
  title: ReactNode;
  body?: ReactNode;
  cta?: ReactNode;
  className?: string;
}

export function CalloutCard({ title, body, cta, className = '' }: CalloutCardProps) {
  return (
    <section
      className={`rounded-lg bg-primary text-on-primary p-12 flex flex-col gap-4 ${className}`.trim()}
    >
      <h2 className="font-display font-normal text-display-sm leading-tight tracking-[-0.3px]">
        {title}
      </h2>
      {body ? <p className="font-sans text-body-md text-on-primary/90 max-w-prose">{body}</p> : null}
      {cta ? <div className="pt-2">{cta}</div> : null}
    </section>
  );
}
