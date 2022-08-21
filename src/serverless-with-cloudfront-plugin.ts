import Serverless from 'serverless';
import Plugin from 'serverless/classes/Plugin';
import {ConfigTemplate} from './config-template';

import path from 'path';
import _ from 'lodash';
import chalk from 'chalk';

// const TAG = '[serverless-with-cloudfront]';

interface Injects {
  log: any;
}

export class ServerlessWithCloudFrontPlugin {
  hooks: {[key: string]: () => void};
  cnameDomain = '-';

  constructor(
    private readonly serverless: Serverless,
    private readonly options: Serverless.Options,
    private injects: Injects,
  ) {
    this.hooks = {
      'before:package:createDeploymentArtifacts':
        this.createDeploymentArtifacts.bind(this),
      'aws:info:displayStackOutputs': this.printSummary.bind(this),
    };
  }

  createDeploymentArtifacts() {
    const baseResources =
      this.serverless.service.provider.compiledCloudFormationTemplate;

    // const awsInfo = this.serverless.pluginManager.plugins.find(
    //   (plugin: Plugin) => plugin.constructor.name === 'AwsInfo',
    // ) as any;

    const templateRoot = path.resolve(__dirname, '..', 'resource-template');

    const template = new ConfigTemplate(this.serverless, this.options, {
      templateRoot,
      configKey: 'service.custom.withCloudFront',
    });
    const [resources, cnameDomain] = template.prepareResources();
    this.cnameDomain = cnameDomain;

    return _.merge(baseResources, resources);
  }

  printSummary() {
    const awsInfo = this.serverless.pluginManager.plugins.find(
      (plugin: Plugin) => plugin.constructor.name === 'AwsInfo',
    ) as any;

    if (!awsInfo || !awsInfo.gatheredData) {
      return;
    }

    const outputs = awsInfo.gatheredData.outputs;
    const apiDistributionDomain = _.find(outputs, (output: any) => {
      return output.OutputKey === 'ApiDistribution';
    });

    if (!apiDistributionDomain || !apiDistributionDomain.OutputValue) {
      return;
    }

    this.injects.log(chalk.yellow('CloudFront domain name'));
    this.injects.log(
      `${apiDistributionDomain.OutputValue} (CNAME: ${this.cnameDomain})`,
    );
  }
}
