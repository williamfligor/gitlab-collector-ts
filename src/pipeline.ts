import { ProjectSchema } from "gitlab";
import * as log4js from "log4js";
import * as client from "prom-client";
import { GitLabCollector } from "./gitlab";
import { BranchSchema, PipelineSchema, toArray } from "./typefill";

const logger = log4js.getLogger("pipeline");

export interface DatabaseEntry {
    project: ProjectSchema;
    branch: BranchSchema;
    pipeline: PipelineSchema;
}

export interface DatabaseMap {
    [key: string]: DatabaseEntry;
}

export class PipelineCollector extends GitLabCollector {
    private database: DatabaseMap = {};

    private gaugeStatus: client.Gauge;
    private gaugeDuration: client.Gauge;
    private gaugeCreatedAt: client.Gauge;

    constructor() {
        super();

        const labels = ["project", "ref", "user", "username"];

        this.gaugeStatus = new client.Gauge({
            name: "gitlab_pipeline_status",
            help: "Pipeline Status",
            labelNames: labels,
        });

        this.gaugeDuration = new client.Gauge({
            name: "gitlab_pipeline_duration",
            help: "Pipeline Status",
            labelNames: labels,
        });

        this.gaugeCreatedAt = new client.Gauge({
            name: "gitlab_pipeline_created_at",
            help: "Pipeline Created At",
            labelNames: labels,
        });
    }

    setMetrics() {
        for (const { project, pipeline, branch } of Object.values(this.database)) {
            this.gaugeStatus.set(
                {
                    project: project.path_with_namespace,
                    ref: branch.name,
                    user: pipeline.user.name,
                    username: pipeline.user.username,
                },
                this.getStatus(pipeline.status)
            );

            this.gaugeDuration.set(
                {
                    project: project.path_with_namespace,
                    ref: branch.name,
                    user: pipeline.user.name,
                    username: pipeline.user.username,
                },
                this.getDuration(pipeline)
            );

            this.gaugeCreatedAt.set(
                {
                    project: project.path_with_namespace,
                    ref: branch.name,
                    user: pipeline.user.name,
                    username: pipeline.user.username,
                },
                this.toTimestamp(pipeline.created_at)
            );
        }
    }

    async refresh() {
        logger.info("refresh database");
        const database: DatabaseMap = {};

        for (const project of this.projects) {
            try {
                const branches = toArray<BranchSchema>(await this.gl.Branches.all(project.id));

                for (const branch of branches) {
                    const pipeline = await this.getPipeline(project.id, branch.name);

                    if (!pipeline) {
                        continue;
                    }

                    database[this.getKey(project, branch)] = { project, branch, pipeline };
                }
            } catch (e) {
                logger.error(`failed project: ${project.id}`, e);
            }
        }

        this.database = database;

        logger.info("refresh database done");
    }

    async update(event: object): Promise<void> {
        logger.info(`update called`);
        logger.debug(`update event: ${event}`);

        logger.info(`update done`);
    }

    async getPipeline(projectId: number, ref: string): Promise<PipelineSchema | undefined> {
        try {
            // make the list request
            const pipelines = toArray<PipelineSchema>(
                await this.gl.Pipelines.all(projectId, { ref: ref, page: 1, perPage: 1 })
            );

            if (pipelines.length === 0) {
                return undefined;
            }

            // make the fuller request - more details are returned with .show() than .all()
            return toArray<PipelineSchema>(this.gl.Pipelines.show(projectId, pipelines[0].id))[0];
        } catch (e) {
            logger.error(`failed projectId: ${projectId} ref: ${ref}`, e);
            return undefined;
        }
    }

    private getKey(project: ProjectSchema, branch: BranchSchema): string {
        return `${project.path_with_namespace}:${branch.name}`;
    }

    private getStatus(status: string): number {
        // ugh
        const statusMap: any = {
            running: 0,
            pending: 1,
            success: 2,
            failed: 3,
            canceled: 4,
            skipped: 5,
        };

        if (status in statusMap) {
            return statusMap[status];
        }

        return -1;
    }

    private getDuration(pipeline: PipelineSchema) {
        if (pipeline.duration === null) {
            return -1;
        }

        return pipeline.duration;
    }
}
