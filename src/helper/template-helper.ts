import _ from 'lodash';
import Serverless from 'serverless';

interface Option {
  configKey: string;
}

export class TemplateHelper {
  constructor(
    private readonly serverless: Serverless,
    private readonly option: Option,
  ) {}

  getConfig(field: string, defaultValue: any = null) {
    return _.get(
      this.serverless,
      `${this.option.configKey}.${field}`,
      defaultValue,
    );
  }
}
