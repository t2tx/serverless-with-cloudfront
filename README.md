# serverless-with-cloudfront

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/t2tx/serverless-with-cloudfront/tree/main.svg?style=shield)](https://dl.circleci.com/status-badge/redirect/gh/t2tx/serverless-with-cloudfront/tree/main)
[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-with-cloudfront.svg)](https://badge.fury.io/js/serverless-httpapi-cloudfront)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/serverless-httpapi-cloudfront/master/LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/serverless-with-cloudfront.svg?style=flat)](https://www.npmjs.com/package/serverless-httpapi-cloudfront)

> A try to extend the project: https://github.com/Droplr/serverless-api-cloudfront

Automatically properly configured AWS CloudFront distribution that routes traffic to follow resource.

- HTTP api gateway

Automatically config custom domain and create Route 53 records

# Installation

```bash
$ npm install --save-dev serverless-with-cloudfront
```

OR

```bash
$ yarn add -D serverless-with-cloudfront
```

# Usage

## A [sample](./sample/http-api/)

> Add to `plugins` section

```yaml
plugins:
  - serverless-with-cloudfront
```

> Add to `custom` section

```yaml
custom:
  withCloudFront:
    type: http # for HTTP Api Gateway
  ...
```

- The sample serverless yaml

```yaml
# The `service` block is the name of the service
service: sample

frameworkVersion: '3'

plugins:
  - serverless-with-cloudfront

# The `provider` block defines where your service will be deployed
provider:
  name: aws
  runtime: nodejs12.x
  region: ap-northeast-1

custom:
  withCloudFront:
    type: http # for HTTP Api Gateway
    # hostedZoneId: 11223344
    # domain: my-custom-domain.com
    # certificate: arn:aws:acm:us-east-1:000000000000:certificate/00000000-1111-2222-3333-444444444444
    headers:
      - Accept
      - Accept-Encoding
      - Accept-Language
      - Authorization
    # cookies: 'all'
    # querystring: 'all'
    # waf: 00000000-0000-0000-0000-000000000000
    # compress: true
    # minimumProtocolVersion: 'protocol version'
    # priceClass: 'PriceClass_All'
    # logging:
    #   bucket: my-bucket.s3.amazonaws.com
    #   prefix: my-prefix

# The `functions` block defines what code to deploy
functions:
  helloWorld:
    handler: handler.helloWorld
    # The `events` block defines how to trigger the handler.helloWorld code
    events:
      - httpApi: '*'
```

## Configuration

| field                  | must | default            | -                                                                                 |
| ---------------------- | ---- | ------------------ | --------------------------------------------------------------------------------- |
| type                   | \*   | -                  | Fixed value: _`http`_                                                             |
| hostedZoneId           |      |                    | The Route 53 Hosted zone ID                                                       |
| domain                 |      |                    | The custom domain name                                                            |
| certificate            |      |                    | The certificate of custom domain name                                             |
| headers                |      | _`[]`_             | The headers that include in the cache key                                         |
| cookies                |      | _`all`_            | The cookies that include in the cache key ( _`all`_, _`none`_ or a whitelist)     |
| queryString            |      | _`all`_            | The query strings that include in the cache key _`all`_, _`none`_ or a whitelist) |
| waf                    |      |                    | The id of WAF                                                                     |
| compress               |      | _`false`_          | The auto compress option: _`true`_ \| _`false`_                                   |
| minimumProtocolVersion |      | _`TLSv1`_          | _`TLSv1`_ \| _`TLSv1_2016`_ \| _`TLSv1.1_2016`_ \| _`TLSv1.2_2018`_ \| _`SSLv3`_  |
| priceClass             |      | _`PriceClass_All`_ | _`PriceClass_All`_ \| _`PriceClass_100`_ \| _`PriceClass_200`_                    |
| logging                |      |                    | Bucket and prefix settings for saving access logs                                 |

## Notes

- If `domain` is set, `certificate` also needs to be set

```yaml
domain: my-custom-domain.com
certificate: arn:aws:acm:us-east-1:000000000000:certificate/00000000-1111-2222-3333-444444444444
```

- If `hostedZoneId` is set, `domain` (and `certificate`) also needs to be set

```yaml
hostedZoneId: 11223344
domain: my-custom-domain.com
certificate: arn:aws:acm:us-east-1:000000000000:certificate/00000000-1111-2222-3333-444444444444
```

- [`headers`][headers-default-cache] can be _`[]`_ (default) or a list of headers ([see CloudFront custom behaviour][headers-list]):

```yaml
headers:
  - Accept
  - Accept-Encoding
  - Accept-Language
  - Authorization
```

[headers-default-cache]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-defaultcachebehavior.html#cfn-cloudfront-distribution-defaultcachebehavior-forwardedvalues
[headers-list]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html#request-custom-headers-behavior

## IAM Policy

In order to make this plugin work as expected a few additional IAM Policies might be needed on your AWS profile.

- cloudfront:...
- route53:...

You can read more about IAM profiles and policies in the [Serverless documentation](https://serverless.com/framework/docs/providers/aws/guide/credentials#creating-aws-access-keys).

## License

[MIT](LICENSE)
