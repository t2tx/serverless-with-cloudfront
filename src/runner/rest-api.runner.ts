import _ from 'lodash';
import Serverless from 'serverless';
import fs from 'fs';
import yaml from 'js-yaml';
import {TemplateHelper} from '../helper/template-helper';

export interface Option {
  configKey: string;
  templateFile: string;
}

export class RestApiRunner {
  helper: TemplateHelper;

  constructor(
    private readonly serverless: Serverless,
    private readonly slsOptions: Serverless.Options,
    private readonly option: Option,
  ) {
    this.helper = new TemplateHelper(serverless, {
      configKey: option.configKey,
    });
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

  // -------- private --------
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

  prepareDomain(distributionConfig: any) {
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
    distributionConfig.Origins[0].OriginPath = `/${this.slsOptions.stage}`;
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

  prepareViewerProtocolPolicy(distributionConfig: any) {
    const viewerProtocolPolicy = this.getConfig(
      'viewerProtocolPolicy',
      'https-only',
    );
    distributionConfig.DefaultCacheBehavior.ViewerProtocolPolicy =
      viewerProtocolPolicy;
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

  private getConfig(field: string, defaultValue: any = null) {
    return this.helper.getConfig(field, defaultValue);
  }
}
