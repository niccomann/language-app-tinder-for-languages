export type GrammarNodeType = 'subject' | 'predicate' | 'object' | 'indirect_object' | 'direct_object';

const NODE_COLORS: Record<string, string> = {
  subject: '#3B82F6',
  predicate: '#EF4444',
  object: '#10B981',
  indirect_object: '#F59E0B',
  direct_object: '#10B981',
};

const NODE_LABELS: Record<string, string> = {
  subject: 'Subject',
  predicate: 'Verb',
  object: 'Object',
  indirect_object: 'Ind. Obj.',
  direct_object: 'Dir. Obj.',
};

export function getNodeColor(type: string): string {
  return NODE_COLORS[type] || '#6B7280';
}

export function getNodeLabel(type: string): string {
  return NODE_LABELS[type] || type;
}
