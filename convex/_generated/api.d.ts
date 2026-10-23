/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chess from "../chess.js";
import type * as connect from "../connect.js";
import type * as connectConstants from "../connectConstants.js";
import type * as connectDev from "../connectDev.js";
import type * as connectLib from "../connectLib.js";
import type * as connectPhotos from "../connectPhotos.js";
import type * as connectRangers from "../connectRangers.js";
import type * as connectSchema from "../connectSchema.js";
import type * as connectWords from "../connectWords.js";
import type * as http from "../http.js";
import type * as matches from "../matches.js";
import type * as registrations from "../registrations.js";
import type * as roomLib from "../roomLib.js";
import type * as rooms from "../rooms.js";
import type * as rounds from "../rounds.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chess: typeof chess;
  connect: typeof connect;
  connectConstants: typeof connectConstants;
  connectDev: typeof connectDev;
  connectLib: typeof connectLib;
  connectPhotos: typeof connectPhotos;
  connectRangers: typeof connectRangers;
  connectSchema: typeof connectSchema;
  connectWords: typeof connectWords;
  http: typeof http;
  matches: typeof matches;
  registrations: typeof registrations;
  roomLib: typeof roomLib;
  rooms: typeof rooms;
  rounds: typeof rounds;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
