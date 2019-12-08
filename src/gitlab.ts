import { Gitlab, GroupSchema, ProjectSchema } from "gitlab";
import * as log4js from "log4js";
import * as filterConfig from "../config/filters.json";
import * as gitlabConfig from "../config/gitlab.json";

const logger = log4js.getLogger("collector");

export abstract class GitLabCollector {
    private static gl: Gitlab = new Gitlab(gitlabConfig);
    private static groups: GroupSchema[] = [];
    private static projects: ProjectSchema[] = [];

    abstract async refresh(): Promise<void>;
    abstract async update(event: object): Promise<void>;

    get gl(): Gitlab {
        return GitLabCollector.gl;
    }

    protected get projects(): ProjectSchema[] {
        return GitLabCollector.projects;
    }

    protected get groups(): GroupSchema[] {
        return GitLabCollector.groups;
    }

    static async loadGroups() {
        logger.info(`groups request`);

        let groups = await this.gl.Groups.all();

        logger.debug(`groups result = ${groups.map(group => group.full_path)}`);

        if ("groups" in filterConfig) {
            groups = groups.filter(group => {
                for (const filter of filterConfig.groups) {
                    if (group.full_path.startsWith(filter)) {
                        return true;
                    }
                }

                return false;
            });

            logger.debug(`groups filtered = ${groups.map(group => group.full_path)}`);
        }

        this.groups = groups;

        logger.info(`groups request done: ${groups.length}`);
    }

    static async loadProjects() {
        logger.info("projects request");

        let projects: ProjectSchema[] = [];

        for (const group of this.groups) {
            const groupProjects = await this.gl.Groups.projects(group.id);

            projects = projects.concat(groupProjects);
        }

        logger.debug("Loaded projects....");
        for (const project of projects) {
            logger.debug(`       ${project.path_with_namespace}`);
        }

        this.projects = projects;

        logger.info(`projects request done: ${projects.length}`);
    }

    toTimestamp(timestamp: string) {
        return new Date(timestamp).getTime();
    }
}
