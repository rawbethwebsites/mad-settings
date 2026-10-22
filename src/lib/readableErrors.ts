import { ConvexError } from 'convex/values';
import type { ConvexReactClient } from 'convex/react';

// Production hides plain server errors, so the server throws ConvexError with a
// message written for campers. Re-shape it into the "Uncaught Error: …" text the
// game screens already know how to show.
export function readableErrors(client: ConvexReactClient) {
  const mutation = client.mutation.bind(client);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.mutation = (async (...args: any[]) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (mutation as (...a: any[]) => Promise<unknown>)(...args);
    } catch (e) {
      if (e instanceof ConvexError && typeof e.data === 'string') throw new Error(`Uncaught Error: ${e.data}`);
      throw e;
    }
  }) as typeof client.mutation;
  return client;
}
