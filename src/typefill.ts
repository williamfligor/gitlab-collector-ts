export function toArray<T>(t: any): T[] {
    if (!Array.isArray(t)) {
        return [t];
    }

    return t;
}

export interface BranchSchema {
    name: string;
    merged: boolean;
    protected: boolean;
    commit: object;
    developers_can_push: boolean;
    developers_can_merge: boolean;
    can_push: boolean;
    default: boolean;
}

export interface PipelineSchema {
    id: number;
    sha: string;
    ref: string;
    status: string;
    created_at: string;
    updated_at: string;
    web_url: string;
    before_sha: string;
    tag: boolean;
    yaml_errors: any;
    user: {
        name: string;
        username: string;
    };
    started_at: string;
    finished_at: string;
    committed_at: any;
    duration: number;
    coverage: any;
    detailed_status: object;
}
