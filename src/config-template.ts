import _ from "lodash";
import Serverless from "serverless";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

export interface Option {
  templateRoot: string;
  configKey: string;
}

const Templates: Record<string, string> = {
  http: "http-api.yml",
};

export class ConfigTemplate {
  constructor(
    private readonly serverless: Serverless,
    private readonly option: Option
  ) {}

  prepareResources() {
    const templateType = this.getConfig("type");
    if (!(templateType && Templates[templateType])) {
      throw new (this.serverless as any).classes.Error("Invalid type");
    }
    const filename = path.resolve(
      this.option.templateRoot,
      Templates[templateType]
    );
    const content = fs.readFileSync(filename, "utf-8");
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

    const cnameDomain = this.getConfig("domain", "-");

    return [resources, cnameDomain];
  }

  // ----------- private -------------
  private prepareLogging(distributionConfig: any) {
    const loggingBucket = this.getConfig("logging.bucket", null);

    if (loggingBucket !== null) {
      distributionConfig.Logging.Bucket = loggingBucket;
      distributionConfig.Logging.Prefix = this.getConfig("logging.prefix", "");
    } else {
      delete distributionConfig.Logging;
    }
  }

  private prepareDomain(distributionConfig: any) {
    const domain = this.getConfig("domain", null);

    if (domain !== null) {
      distributionConfig.Aliases = Array.isArray(domain) ? domain : [domain];
    } else {
      delete distributionConfig.Aliases;
    }
  }

  private preparePriceClass(distributionConfig: any) {
    const priceClass = this.getConfig("priceClass", "PriceClass_All");
    distributionConfig.PriceClass = priceClass;
  }

  private prepareOrigins(distributionConfig: any) {}

  private prepareCookies(distributionConfig: any) {
    const forwardCookies = this.getConfig("cookies", "all");
    distributionConfig.DefaultCacheBehavior.ForwardedValues.Cookies.Forward =
      Array.isArray(forwardCookies) ? "whitelist" : forwardCookies;
    if (Array.isArray(forwardCookies)) {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.Cookies.WhitelistedNames =
        forwardCookies;
    }
  }

  private prepareHeaders(distributionConfig: any) {
    const forwardHeaders = this.getConfig("headers", "none");

    if (Array.isArray(forwardHeaders)) {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.Headers =
        forwardHeaders;
    } else {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.Headers =
        forwardHeaders === "none" ? [] : ["*"];
    }
  }

  private prepareQueryString(distributionConfig: any) {
    const forwardQueryString = this.getConfig("querystring", "all");

    if (Array.isArray(forwardQueryString)) {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryString =
        true;
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryStringCacheKeys =
        forwardQueryString;
    } else {
      distributionConfig.DefaultCacheBehavior.ForwardedValues.QueryString =
        forwardQueryString === "all" ? true : false;
    }
  }

  private prepareComment(distributionConfig: any) {
    const name = this.serverless.getProvider("aws").naming.getApiGatewayName();
    distributionConfig.Comment = `Serverless Managed ${name}`;
  }

  private prepareCertificate(distributionConfig: any) {
    const certificate = this.getConfig("certificate", null);

    if (certificate !== null) {
      distributionConfig.ViewerCertificate.AcmCertificateArn = certificate;
    } else {
      delete distributionConfig.ViewerCertificate;
    }
  }

  private prepareWaf(distributionConfig: any) {
    const waf = this.getConfig("waf", null);

    if (waf !== null) {
      distributionConfig.WebACLId = waf;
    } else {
      delete distributionConfig.WebACLId;
    }
  }

  private prepareCompress(distributionConfig: any) {
    distributionConfig.DefaultCacheBehavior.Compress =
      this.getConfig("compress", false) === true ? true : false;
  }

  private prepareMinimumProtocolVersion(distributionConfig: any) {
    const minimumProtocolVersion = this.getConfig(
      "minimumProtocolVersion",
      undefined
    );

    if (minimumProtocolVersion) {
      distributionConfig.ViewerCertificate.MinimumProtocolVersion =
        minimumProtocolVersion;
    }
  }

  private getConfig(field: string, defaultValue: any = null) {
    return _.get(
      this.serverless,
      `${this.option.configKey}.${field}`,
      defaultValue
    );
  }
}
