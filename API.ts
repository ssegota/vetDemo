/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type DummyModel = {
  __typename: "DummyModel",
  createdAt: string,
  id: string,
  name?: string | null,
  updatedAt: string,
};

export type ModelDummyModelFilterInput = {
  and?: Array< ModelDummyModelFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  id?: ModelIDInput | null,
  name?: ModelStringInput | null,
  not?: ModelDummyModelFilterInput | null,
  or?: Array< ModelDummyModelFilterInput | null > | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelDummyModelConnection = {
  __typename: "ModelDummyModelConnection",
  items:  Array<DummyModel | null >,
  nextToken?: string | null,
};

export type ModelDummyModelConditionInput = {
  and?: Array< ModelDummyModelConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  name?: ModelStringInput | null,
  not?: ModelDummyModelConditionInput | null,
  or?: Array< ModelDummyModelConditionInput | null > | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateDummyModelInput = {
  id?: string | null,
  name?: string | null,
};

export type DeleteDummyModelInput = {
  id: string,
};

export type UpdateDummyModelInput = {
  id: string,
  name?: string | null,
};

export type ModelSubscriptionDummyModelFilterInput = {
  and?: Array< ModelSubscriptionDummyModelFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionDummyModelFilterInput | null > | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type GetDummyModelQueryVariables = {
  id: string,
};

export type GetDummyModelQuery = {
  getDummyModel?:  {
    __typename: "DummyModel",
    createdAt: string,
    id: string,
    name?: string | null,
    updatedAt: string,
  } | null,
};

export type ListDummyModelsQueryVariables = {
  filter?: ModelDummyModelFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListDummyModelsQuery = {
  listDummyModels?:  {
    __typename: "ModelDummyModelConnection",
    items:  Array< {
      __typename: "DummyModel",
      createdAt: string,
      id: string,
      name?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type CreateDummyModelMutationVariables = {
  condition?: ModelDummyModelConditionInput | null,
  input: CreateDummyModelInput,
};

export type CreateDummyModelMutation = {
  createDummyModel?:  {
    __typename: "DummyModel",
    createdAt: string,
    id: string,
    name?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteDummyModelMutationVariables = {
  condition?: ModelDummyModelConditionInput | null,
  input: DeleteDummyModelInput,
};

export type DeleteDummyModelMutation = {
  deleteDummyModel?:  {
    __typename: "DummyModel",
    createdAt: string,
    id: string,
    name?: string | null,
    updatedAt: string,
  } | null,
};

export type GenerateReportMutationVariables = {
  keywords?: Array< string | null > | null,
};

export type GenerateReportMutation = {
  generateReport?: string | null,
};

export type UpdateDummyModelMutationVariables = {
  condition?: ModelDummyModelConditionInput | null,
  input: UpdateDummyModelInput,
};

export type UpdateDummyModelMutation = {
  updateDummyModel?:  {
    __typename: "DummyModel",
    createdAt: string,
    id: string,
    name?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateDummyModelSubscriptionVariables = {
  filter?: ModelSubscriptionDummyModelFilterInput | null,
};

export type OnCreateDummyModelSubscription = {
  onCreateDummyModel?:  {
    __typename: "DummyModel",
    createdAt: string,
    id: string,
    name?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteDummyModelSubscriptionVariables = {
  filter?: ModelSubscriptionDummyModelFilterInput | null,
};

export type OnDeleteDummyModelSubscription = {
  onDeleteDummyModel?:  {
    __typename: "DummyModel",
    createdAt: string,
    id: string,
    name?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateDummyModelSubscriptionVariables = {
  filter?: ModelSubscriptionDummyModelFilterInput | null,
};

export type OnUpdateDummyModelSubscription = {
  onUpdateDummyModel?:  {
    __typename: "DummyModel",
    createdAt: string,
    id: string,
    name?: string | null,
    updatedAt: string,
  } | null,
};
