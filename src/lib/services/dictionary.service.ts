import type { SupabaseClient } from "../../db/supabase.client";
import type { DictionaryLabelDto } from "../../types";
import { DatabaseError } from "../utils/api-errors";

/**
 * Get dictionary labels, optionally filtered by domain
 * @param supabase - Supabase client
 * @param domain - Optional domain filter
 * @returns Array of dictionary labels
 */
export async function getDictionaryLabels(
  supabase: SupabaseClient,
  domain?: string,
): Promise<DictionaryLabelDto[]> {
  let query = supabase
    .from("dic_lookup_labels")
    .select("*")
    .order("domain", { ascending: true })
    .order("order_in_list", { ascending: true });

  // Apply domain filter if provided
  if (domain) {
    query = query.eq("domain", domain);
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError();
  }

  return data || [];
}
