import type { WordCloudItem } from '../types';
import type { LinguisticCriteria } from '../hooks/useLinguisticFilters';

/**
 * Hierarchical node structure for D3 sunburst
 */
export interface HierarchyNode {
    name: string;
    translation?: string;
    image_base64?: string;
    children?: HierarchyNode[];
    value?: number;
    wordData?: WordCloudItem;
}

export type HierarchyCriteria = 'category' | 'cefr' | 'gender' | 'frequency' | 'register' | 'part_of_speech';

/**
 * Mapping from database categories to semantic hierarchy paths
 * Each category maps to an array of ancestor names (from root to parent)
 */
const CATEGORY_HIERARCHY_MAP: Record<string, string[]> = {
    // Living beings
    animals: ['Essere vivente', 'Animale'],
    family: ['Essere vivente', 'Umano', 'Famiglia'],
    body: ['Essere vivente', 'Umano', 'Corpo'],

    // Objects
    food: ['Oggetti', 'Cibo'],
    objects: ['Oggetti', 'Quotidiano'],
    clothing: ['Oggetti', 'Abbigliamento'],
    transportation: ['Oggetti', 'Trasporti'],

    // World
    nature: ['Mondo', 'Natura'],
    weather: ['Mondo', 'Meteo'],
    places: ['Mondo', 'Luoghi'],

    // Concepts
    colors: ['Concetti', 'Colori'],
    actions: ['Concetti', 'Azioni'],
    verbs: ['Concetti', 'Azioni'],
    time: ['Concetti', 'Tempo'],
    music: ['Concetti', 'Arte', 'Musica'],
    sports: ['Concetti', 'Sport'],
    adjectives: ['Concetti', 'Aggettivi'],
};

/**
 * Get the hierarchy path for a word based on its category
 */
function getHierarchyPath(category: string | undefined): string[] {
    if (!category) return ['Altro'];

    const normalizedCategory = category.toLowerCase();
    return CATEGORY_HIERARCHY_MAP[normalizedCategory] || ['Altro'];
}

/**
 * Build a hierarchical tree structure from a flat list of words
 * 
 * @param words - Array of WordCloudItem from the API
 * @returns Root HierarchyNode with nested children
 */
export function buildHierarchyFromWords(words: WordCloudItem[]): HierarchyNode {
    const root: HierarchyNode = {
        name: 'Vocabolario',
        children: [],
    };

    // Map to keep track of created nodes by their path
    const nodeMap = new Map<string, HierarchyNode>();
    nodeMap.set('Vocabolario', root);

    for (const word of words) {
        const hierarchyPath = getHierarchyPath(word.category);
        const fullPath = ['Vocabolario', ...hierarchyPath];

        // Create intermediate nodes if they don't exist
        let currentPath = '';
        let parentNode = root;

        for (let i = 0; i < fullPath.length; i++) {
            const nodeName = fullPath[i];
            currentPath = currentPath ? `${currentPath}/${nodeName}` : nodeName;

            if (i === 0) {
                // Skip root, it's already created
                continue;
            }

            let node = nodeMap.get(currentPath);

            if (!node) {
                node = {
                    name: nodeName,
                    children: [],
                };
                nodeMap.set(currentPath, node);

                if (!parentNode.children) {
                    parentNode.children = [];
                }
                parentNode.children.push(node);
            }

            parentNode = node;
        }

        // Add the word as a leaf node
        const wordNode: HierarchyNode = {
            name: word.text,
            translation: word.translation,
            image_base64: word.image_base64,
            value: Math.max(1, word.review_count || 1),
            wordData: word,
        };

        if (!parentNode.children) {
            parentNode.children = [];
        }
        parentNode.children.push(wordNode);
    }

    return root;
}

/**
 * Get all unique top-level categories from the hierarchy
 */
export function getTopLevelCategories(root: HierarchyNode): string[] {
    return (root.children || []).map(child => child.name);
}

/**
 * Count total words in a hierarchy node (recursively)
 */
export function countWordsInNode(node: HierarchyNode): number {
    if (!node.children || node.children.length === 0) {
        return node.value ? 1 : 0;
    }

    return node.children.reduce((sum, child) => sum + countWordsInNode(child), 0);
}

/**
 * Get color for a category based on its root ancestor
 */
export function getCategoryColor(name: string): string {
    const colorMap: Record<string, string> = {
        'Essere vivente': '#10B981', // emerald
        'Oggetti': '#F59E0B',        // amber
        'Mondo': '#3B82F6',          // blue
        'Concetti': '#8B5CF6',       // violet
        'Altro': '#6B7280',          // gray
        'Vocabolario': '#EC4899',    // pink
        'A1': '#22c55e',
        'A2': '#84cc16',
        'B1': '#eab308',
        'B2': '#f97316',
        'C1': '#ef4444',
        'C2': '#dc2626',
        'der (maschile)': '#3b82f6',
        'die (femminile)': '#ec4899',
        'das (neutro)': '#22c55e',
        'Molto comune': '#22c55e',
        'Comune': '#84cc16',
        'Moderato': '#eab308',
        'Raro': '#f97316',
        'Arcaico': '#6b7280',
        'Sostantivo': '#3b82f6',
        'Verbo': '#ef4444',
        'Aggettivo': '#f59e0b',
        'Avverbio': '#8b5cf6',
    };

    return colorMap[name] || '#6B7280';
}

/**
 * Hierarchy configuration for different linguistic criteria
 */
const HIERARCHY_CONFIGS: Record<HierarchyCriteria, {
    rootName: string;
    getGroup: (word: WordCloudItem) => string;
}> = {
    category: {
        rootName: 'Vocabolario',
        getGroup: (word) => word.category || 'Altro',
    },
    cefr: {
        rootName: 'Livelli CEFR',
        getGroup: (word) => word.cefr_level?.toUpperCase() || 'Non classificato',
    },
    gender: {
        rootName: 'Genere Grammaticale',
        getGroup: (word) => {
            const gender = word.gender?.toLowerCase();
            if (gender === 'masculine' || gender === 'm') return 'der (maschile)';
            if (gender === 'feminine' || gender === 'f') return 'die (femminile)';
            if (gender === 'neuter' || gender === 'n') return 'das (neutro)';
            return 'Senza genere';
        },
    },
    frequency: {
        rootName: 'Frequenza d\'uso',
        getGroup: (word) => {
            const freq = word.frequency_band?.toLowerCase();
            if (freq === 'very_common') return 'Molto comune';
            if (freq === 'common') return 'Comune';
            if (freq === 'moderate') return 'Moderato';
            if (freq === 'rare') return 'Raro';
            if (freq === 'archaic') return 'Arcaico';
            return 'Non classificato';
        },
    },
    register: {
        rootName: 'Registro Linguistico',
        getGroup: (word) => {
            const reg = word.register?.toLowerCase();
            if (reg === 'formal') return 'Formale';
            if (reg === 'informal') return 'Informale';
            if (reg === 'colloquial') return 'Colloquiale';
            if (reg === 'literary') return 'Letterario';
            return reg || 'Non specificato';
        },
    },
    part_of_speech: {
        rootName: 'Parti del Discorso',
        getGroup: (word) => {
            const pos = word.part_of_speech?.toLowerCase();
            if (pos === 'noun') return 'Sostantivo';
            if (pos === 'verb') return 'Verbo';
            if (pos === 'adjective') return 'Aggettivo';
            if (pos === 'adverb') return 'Avverbio';
            if (pos === 'preposition') return 'Preposizione';
            return pos || 'Non classificato';
        },
    },
};

/**
 * Build a hierarchical tree structure from words using a specific criteria
 */
export function buildHierarchyByCriteria(
    words: WordCloudItem[], 
    criteria: HierarchyCriteria = 'category'
): HierarchyNode {
    const config = HIERARCHY_CONFIGS[criteria];
    
    const root: HierarchyNode = {
        name: config.rootName,
        children: [],
    };

    const groupMap = new Map<string, HierarchyNode>();

    for (const word of words) {
        const groupName = config.getGroup(word);
        
        let groupNode = groupMap.get(groupName);
        if (!groupNode) {
            groupNode = {
                name: groupName,
                children: [],
            };
            groupMap.set(groupName, groupNode);
            root.children!.push(groupNode);
        }

        const wordNode: HierarchyNode = {
            name: word.text,
            translation: word.translation,
            image_base64: word.image_base64,
            value: Math.max(1, word.review_count || 1),
            wordData: word,
        };

        groupNode.children!.push(wordNode);
    }

    return root;
}

/**
 * Get available hierarchy criteria based on data
 */
export function getAvailableHierarchyCriteria(words: WordCloudItem[]): HierarchyCriteria[] {
    const available: HierarchyCriteria[] = ['category'];
    
    if (words.some(w => w.cefr_level)) available.push('cefr');
    if (words.some(w => w.gender)) available.push('gender');
    if (words.some(w => w.frequency_band)) available.push('frequency');
    if (words.some(w => w.register)) available.push('register');
    if (words.some(w => w.part_of_speech)) available.push('part_of_speech');
    
    return available;
}
