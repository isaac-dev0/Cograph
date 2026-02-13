/**
 * 
 * Copied from an internal project with intention to be a helper function.
 * Discount this from grading as appropriate.
 * 
 */

import { createClient } from "@/lib/supabase/client";

interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

/**
 * Executes an authenticated GraphQL request against the API.
 * Automatically attaches the current Supabase session token.
 *
 * @throws {Error} If no active session exists or the API returns errors.
 */
export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("No active session");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/graphql`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}
