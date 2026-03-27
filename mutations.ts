/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createDummyModel = /* GraphQL */ `mutation CreateDummyModel(
  $condition: ModelDummyModelConditionInput
  $input: CreateDummyModelInput!
) {
  createDummyModel(condition: $condition, input: $input) {
    createdAt
    id
    name
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateDummyModelMutationVariables,
  APITypes.CreateDummyModelMutation
>;
export const deleteDummyModel = /* GraphQL */ `mutation DeleteDummyModel(
  $condition: ModelDummyModelConditionInput
  $input: DeleteDummyModelInput!
) {
  deleteDummyModel(condition: $condition, input: $input) {
    createdAt
    id
    name
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteDummyModelMutationVariables,
  APITypes.DeleteDummyModelMutation
>;
export const generateReport = /* GraphQL */ `mutation GenerateReport($keywords: [String]) {
  generateReport(keywords: $keywords)
}
` as GeneratedMutation<
  APITypes.GenerateReportMutationVariables,
  APITypes.GenerateReportMutation
>;
export const updateDummyModel = /* GraphQL */ `mutation UpdateDummyModel(
  $condition: ModelDummyModelConditionInput
  $input: UpdateDummyModelInput!
) {
  updateDummyModel(condition: $condition, input: $input) {
    createdAt
    id
    name
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateDummyModelMutationVariables,
  APITypes.UpdateDummyModelMutation
>;
