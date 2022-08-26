import _ from 'lodash';
import Serverless from 'serverless';
import fs from 'fs';
import yaml from 'js-yaml';
import {TemplateHelper} from '../helper/template-helper';

export interface Option {
  configKey: string;
  templateFile: string;
}

export class LambdaUrlRunner {
  helper: TemplateHelper;

  constructor(
    private readonly serverless: Serverless,
    private readonly option: Option,
  ) {
    this.helper = new TemplateHelper(serverless, {configKey: option.configKey});
  }

  exec() {
    const filename = this.option.templateFile;
    const content = fs.readFileSync(filename, 'utf-8');
    const resources = yaml.load(content, {
      filename,
    });

    const distributionConfig = (resources as any).Resources.ApiDistribution
      .Properties.DistributionConfig;

    this.prepareLogging(distributionConfig);
    this.prepareDomain(distributionConfig);
    this.preparePriceClass(distributionConfig);
    this.prepareOrigins(distributionConfig);
    this.prepareCookies(distributionConfig);
    this.prepareHeaders(distributionConfig);
    this.prepareQueryString(distributionConfig);
    this.prepareComment(distributionConfig);
    this.prepareCertificate(distributionConfig);
    this.prepareWaf(distributionConfig);
    this.prepareCompress(distributionConfig);
    this.prepareMinimumProtocolVersion(distributionConfig);

    this.prepareRoute53((resources as any).Resources);

    const cnameDomain = this.getConfig('domain', '-');

    return [resources, cnameDomain];
  }

  // ----------- private -------------
  private prepareRoute53(resources: any) {
    const hostedZoneId = this.getConfig('hostedZoneId', null);
    const cnameDomain = this.getConfig('domain', null);

    console.log(hostedZoneId, cnameDomain);

    if (!(hostedZoneId && cnameDomain)) {
      delete resources.DistributionDNSName;
      return;
    }

    resources.DistributionDNSName.Properties.HostedZoneId = hostedZoneId;
    const record = resources.DistributionDNSName.Properties.RecordSets[0];

    record.Name = cnameDomain;
  }

  private prepareLogging(distributionConfig: any) {
    const loggingBucket = this.getConfig('logging.bucket', null);

    if (loggingBucket !== null) {
      distributionConfig.Logging.Bucket = loggingBucket;
      distributionConfig.Logging.Prefix = this.getConfig('logging.prefix', '');
    } else {
      delete distributionConfig.Logging;
    }
  }

  private prepareDomain(distributionConfig: any) {
    const domain = this.getConfig('domain', null);

    if (domain !== null) {
      distributionConfig.Aliases = [domain];
    } else {
      delete distributionConfig.Aliases;
    }
  }

  preparePriceClass(distributionConfig: any) {
    const priceClass = this.getConfig('priceClass', 'PriceClass_All');
    distributionConfig.PriceClass = priceClass;
  }

  prepareOrigins(distributionConfig: any) {
    let lambda = this.getConfig('lambda', '');
    if (!lambda) {
      throw new Error('lambda must be set');
    }

    lambda = lambda.charAt(0).toUpperCase() + lambda.slice(1);
    distributionConfig.Origins[0].DomainName['Fn::Select'][1]['Fn::Split'][1][
      'Fn::GetAtt'
    ][0] = `${lambda}LambdaFunctionUrl`;
  }

  prepareCookies(distributionConfig: any) {
    const forwardCookies = this.getConfig('cookies', 'all');
    distributionConfig.DefaultCacheBehavior.ForwardedValues.Cookies.Forward =
      Array.isArray(forwardCookies) ? 'whitelist' : forwardCookies;
    if (Array.isArray(forwardCookies)) {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.Cookies.WhitelistedNames =
        forwardCookies;
    }
  }

  prepareHeaders(distributionConfig: any) {
    const forwardHeaders = this.getConfig('headers', []);

    distributionConfig.DefaultCacheBehavior.ForwardedValues.Headers =
      forwardHeaders;
  }

  prepareQueryString(distributionConfig: any) {
    const forwardQueryString = this.getConfig('querystring', 'all');

    if (Array.isArray(forwardQueryString)) {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryString =
        true;
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryStringCacheKeys =
        forwardQueryString;
    } else {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryString =
        forwardQueryString === 'all' ? true : false;
    }
  }

  prepareComment(distributionConfig: any) {
    const name = this.serverless.getProvider('aws').naming.getApiGatewayName();
    distributionConfig.Comment = `Serverless Managed ${name}`;
  }

  prepareCertificate(distributionConfig: any) {
    const certificate = this.getConfig('certificate', null);

    if (certificate !== null) {
      distributionConfig.ViewerCertificate.AcmCertificateArn = certificate;
    } else {
      delete distributionConfig.ViewerCertificate;
    }
  }

  prepareWaf(distributionConfig: any) {
    const waf = this.getConfig('waf', null);

    if (waf !== null) {
      distributionConfig.WebACLId = waf;
    } else {
      delete distributionConfig.WebACLId;
    }
  }

  prepareCompress(distributionConfig: any) {
    distributionConfig.DefaultCacheBehavior.Compress =
      this.getConfig('compress', false) === true ? true : false;
  }

  prepareMinimumProtocolVersion(distributionConfig: any) {
    const minimumProtocolVersion = this.getConfig(
      'minimumProtocolVersion',
      undefined,
    );

    if (minimumProtocolVersion) {
      distributionConfig.ViewerCertificate.MinimumProtocolVersion =
        minimumProtocolVersion;
    }
  }

  getConfig(field: string, defaultValue: any = null) {
    return this.helper.getConfig(field, defaultValue);
  }
}
