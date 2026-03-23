import { defineFunction } from '@aws-amplify/backend';

export const generateReport = defineFunction({
  name: 'generate-report',
  entry: './handler.ts'
});
