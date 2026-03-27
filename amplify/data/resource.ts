import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { generateReport } from '../functions/generate-report/resource';

const schema = a.schema({
  DummyModel: a
    .model({
      name: a.string(),
    })
    .authorization(allow => [allow.publicApiKey()]),

  Diagnosis: a
    .model({
      details: a.string(),
      keywords: a.string().array(),
      report: a.string(),
    })
    .authorization(allow => [allow.publicApiKey()]),

  generateReport: a
    .mutation()
    .arguments({
      keywords: a.string().array(),
    })
    .returns(a.string())
    .handler(a.handler.function(generateReport))
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
