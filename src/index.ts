import * as log4js from "log4js";
import * as client from "prom-client";
import { GitLabCollector } from "./gitlab";
import { PipelineCollector } from "./pipeline";

log4js.configure("config/log4js.json");
const logger = log4js.getLogger("index");

const collectors = [new PipelineCollector()];

(async () => {
    await GitLabCollector.loadGroups();
    await GitLabCollector.loadProjects();
    await collectors[0].refresh();

    collectors[0].setMetrics();
    console.log(client.register.metrics());

    collectors[0].setMetrics();
    collectors[0].setMetrics();
    console.log(client.register.metrics());
})();
