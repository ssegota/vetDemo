/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onCreateDummyModel = /* GraphQL */ `subscription OnCreateDummyModel(
  $filter: ModelSubscriptionDummyModelFilterInput
) {
  onCreateDummyModel(filter: $filter) {
    createdAt
    id
    name
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnCreateDummyModelSubscriptionVariables,
  APITypes.OnCreateDummyModelSubscription
>;
export const onDeleteDummyModel = /* GraphQL */ `subscription OnDeleteDummyModel(
  $filter: ModelSubscriptionDummyModelFilterInput
) {
  onDeleteDummyModel(filter: $filter) {
    createdAt
    id
    name
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnDeleteDummyModelSubscriptionVariables,
  APITypes.OnDeleteDummyModelSubscription
>;
export const onUpdateDummyModel = /* GraphQL */ `subscription OnUpdateDummyModel(
  $filter: ModelSubscriptionDummyModelFilterInput
) {
  onUpdateDummyModel(filter: $filter) {
    createdAt
    id
    name
    updatedAt
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateDummyModelSubscriptionVariables,
  APITypes.OnUpdateDummyModelSubscription
>;
