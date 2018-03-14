/* @flow */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type Episode =
  "EMPIRE" |
  "JEDI" |
  "NEWHOPE";


export type ReviewInput = {|
  stars: number,
  commentary?: ?string,
  favorite_color?: ?ColorInput,
|};

export type ColorInput = {|
  red: number,
  green: number,
  blue: number,
|};

export type HeroQuery = {|
  hero: ?( {
      __typename: "Human",
      name: string,
    } | {
      __typename: "Droid",
      name: string,
    }
  ),
|};

export type CreateReviewMutationVariables = {|
  episode?: ?Episode,
  review: ReviewInput,
|};

export type CreateReviewMutation = {|
  createReview: ? {|
    __typename: "Review",
    stars: number,
    commentary: ?string,
  |},
|};