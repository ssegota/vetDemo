import { Construct } from 'constructs';
import { defineFunction } from '@aws-amplify/backend';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateReport = defineFunction(
  (scope: Construct) => {
    const fn = new Function(scope, 'GenerateReportPython', {
      runtime: Runtime.PYTHON_3_12,
      handler: 'orchestrator.lambda_handler',
      code: Code.fromAsset(path.resolve(__dirname)),
      timeout: Duration.seconds(60),
      environment: {
        BEDROCK_REGION: 'us-east-1',
        HAIKU_MODEL_ID: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        SONNET_MODEL_ID: 'us.anthropic.claude-sonnet-4-6-20250514-v1:0',
      },
    });

    fn.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    }));

    return fn;
  }
);
