export interface OrderedSentenceNode {
  id: string;
  label: string;
}

export interface OrderedSentenceConnection {
  fromId: string;
  toId: string;
}

export function buildOrderedSentence(
  nodes: OrderedSentenceNode[],
  connections: OrderedSentenceConnection[],
): string {
  if (connections.length === 0) {
    return nodes.map(node => node.label).join(' ');
  }

  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const fromIds = new Set(connections.map(connection => connection.fromId));
  const toIds = new Set(connections.map(connection => connection.toId));
  const startIds = [...fromIds].filter(id => !toIds.has(id));

  if (startIds.length === 0 && connections.length > 0) {
    startIds.push(connections[0].fromId);
  }

  const orderedLabels: string[] = [];
  const visited = new Set<string>();

  const traverse = (nodeId: string) => {
    if (visited.has(nodeId) || !nodeMap.has(nodeId)) return;
    visited.add(nodeId);
    orderedLabels.push(nodeMap.get(nodeId)!.label);

    for (const connection of connections) {
      if (connection.fromId === nodeId) {
        traverse(connection.toId);
      }
    }
  };

  for (const startId of startIds) {
    traverse(startId);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      orderedLabels.push(node.label);
    }
  }

  return orderedLabels.join(' ');
}
