"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  kind: string;
  id: string;
  title: string;
  snippet: string;
  rank: number;
  updated_at: string;
};

export type LinkedObject = { kind: string; id: string; title: string; link_source: string };

export async function searchOntology(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_ontology", { p_query: q });
  if (error || !data) return [];
  return data;
}

export async function getLinkedObjects(kind: string, id: string): Promise<LinkedObject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_linked_objects", { p_kind: kind, p_id: id });
  if (error || !data) return [];
  return data;
}
