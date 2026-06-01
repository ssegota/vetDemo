import { Construct } from 'constructs';
import { defineFunction } from '@aws-amplify/backend';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateReport = defineFunction(
  (scope: Construct) => {
    // S3 bucket za semantički router bazu (baza.json)
    const bazaBucket = new Bucket(scope, 'SemanticRouterBaza', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: true,
    });

    const fn = new Function(scope, 'GenerateReportPython', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'orchestrator.lambda_handler',
      code: Code.fromAsset(path.resolve(__dirname)),
      timeout: Duration.seconds(60),
      environment: {
        BAZA_S3_BUCKET: bazaBucket.bucketName,
        BAZA_S3_KEY: 'semantic-router/baza.json',
        BEDROCK_REGION: 'us-east-1',
        ROUTER_MODEL_ID: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        GENERATOR_MODEL_ID: 'us.anthropic.claude-sonnet-4-6-20250514-v1:0',
      },
    });

    // Bedrock pristup (postojeći)
    fn.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));

    // S3 pristup za čitanje i pisanje baze
    fn.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [`${bazaBucket.bucketArn}/semantic-router/*`],
    }));

    return fn;
  }
);
