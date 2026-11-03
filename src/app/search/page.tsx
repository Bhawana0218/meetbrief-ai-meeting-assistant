import { SearchResults } from "@/components/search-results";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return <SearchResults initialQuery={q} />;
}
