export interface GraphNode {
    id: string;
    relativePath: string;
    isEntry?: boolean;
}

export interface GraphEdge {
    from: string;
    to:string;
    specifier: string;
}

export interface DependencyGraph {
    nodes: Map<string, GraphNode>;
    edges: GraphEdge[];
    outgoing: Map<string, Set<string>>;
    incoming: Map<string, Set<string>>;
}