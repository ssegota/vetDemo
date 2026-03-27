/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const getDummyModel = /* GraphQL */ `query GetDummyModel($id: ID!) {
  getDummyModel(id: $id) {
    createdAt
    id
    name
    updatedAt
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GetDummyModelQueryVariables,
  APITypes.GetDummyModelQuery
>;
export const listDummyModels = /* GraphQL */ `query ListDummyModels(
  $filter: ModelDummyModelFilterInput
  $limit: Int
  $nextToken: String
) {
  listDummyModels(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      createdAt
      id
      name
      updatedAt
      __typename
    }
    nextToken
    __typename
  }
}
` as GeneratedQuery<
  APITypes.ListDummyModelsQueryVariables,
  APITypes.ListDummyModelsQuery
>;
