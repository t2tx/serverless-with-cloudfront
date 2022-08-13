import Serverless from "serverless";
import Plugin from "serverless/classes/Plugin";
import { ConfigTemplate } from "./config-template";
const { log } = require("@serverless/utils/log");

import path from "path";
import _ from "lodash";
import chalk from "chalk";

const TAG = "[serverless-with-cloudfront]";

export class ServerlessWithCloudFrontPlugin {
  hooks: { [key: string]: Function };
  cnameDomain: string = "-";

  constructor(private readonly serverless: Serverless) {
    this.hooks = {
      "before:package:createDeploymentArtifacts":
        this.createDeploymentArtifacts.bind(this),
      "aws:info:displayStackOutputs": this.printSummary.bind(this),
    };
  }

  createDeploymentArtifacts() {
    const baseResources =
      this.serverless.service.provider.compiledCloudFormationTemplate;

    const awsInfo = this.serverless.pluginManager.plugins.find(
      (plugin: Plugin) => plugin.constructor.name === "AwsInfo"
    ) as any;

    const templateRoot = path.resolve(__dirname, "..", "resource-template");

    const template = new ConfigTemplate(this.serverless, {
      templateRoot,
      configKey: "service.custom.withCloudFront",
    });
    const [resources, cnameDomain] = template.prepareResources();
    this.cnameDomain = cnameDomain;

    return _.merge(baseResources, resources);
  }

  printSummary() {
    const awsInfo = this.serverless.pluginManager.plugins.find(
      (plugin: Plugin) => plugin.constructor.name === "AwsInfo"
    ) as any;

    if (!awsInfo || !awsInfo.gatheredData) {
      return;
    }

    const outputs = awsInfo.gatheredData.outputs;
    const apiDistributionDomain = _.find(outputs, (output: any) => {
      return output.OutputKey === "ApiDistribution";
    });

    if (!apiDistributionDomain || !apiDistributionDomain.OutputValue) {
      return;
    }

    log(chalk.yellow("CloudFront domain name"));
    log(`${apiDistributionDomain.OutputValue} (CNAME: ${this.cnameDomain})`);
  }
}
