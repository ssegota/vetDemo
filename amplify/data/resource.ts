import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { generateReport } from '../functions/generate-report/resource';

const schema = a.schema({
  generateReport: a
    .mutation()
    .arguments({
      keywords: a.string().array(),
    })
    .returns(a.string())
    .handler(a.handler.function(generateReport))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
