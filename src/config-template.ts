import _ from 'lodash';
import Serverless from 'serverless';
import path from 'path';
import {HttpApiRunner} from './runner/http-api.runner';
import {RestApiRunner} from './runner/rest-api.runner';
import {LambdaUrlRunner} from './runner/lamba-url.runner';

export interface Option {
  templateRoot: string;
  configKey: string;
}

export class ConfigTemplate {
  constructor(
    private readonly serverless: Serverless,
    private readonly slsOptions: Serverless.Options,
    private readonly option: Option,
  ) {}

  prepareResources() {
    const handlers: Record<string, () => any> = {
      http: this.handleHttpApi.bind(this),
      rest: this.handleRestApi.bind(this),
      lambda: this.handleLambdaUrl.bind(this),
    };

    const templateType = this.getConfig('type');
    if (!(templateType && handlers[templateType])) {
      throw new (this.serverless as any).classes.Error('Invalid type');
    }

    return handlers[templateType]();
  }

  // ----------- private -------------
  private handleLambdaUrl() {
    const filename = path.resolve(this.option.templateRoot, 'lambda-url.yml');
    const runner = new LambdaUrlRunner(this.serverless, {
      templateFile: filename,
      configKey: this.option.configKey,
    });

    return runner.exec();
  }

  private handleHttpApi() {
    const filename = path.resolve(this.option.templateRoot, 'http-api.yml');
    const runner = new HttpApiRunner(this.serverless, {
      templateFile: filename,
      configKey: this.option.configKey,
    });

    return runner.exec();
  }

  private handleRestApi() {
    const filename = path.resolve(this.option.templateRoot, 'rest-api.yml');
    const runner = new RestApiRunner(this.serverless, this.slsOptions, {
      templateFile: filename,
      configKey: this.option.configKey,
    });

    return runner.exec();
  }

  private getConfig(field: string, defaultValue: any = null) {
    return _.get(
      this.serverless,
      `${this.option.configKey}.${field}`,
      defaultValue,
    );
  }
}
