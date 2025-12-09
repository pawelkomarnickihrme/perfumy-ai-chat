import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import "dotenv/config";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "perfumes";
const EMBEDDING_MODEL = "text-embedding-3-small";

interface SearchFilters {
  gender?: string;
  brand?: string;
  primary_season?: string;
  olfactory_family?: string;
  min_rating?: number;
  price_perception?: string;
}

interface SearchResult {
  id: string;
  score: number;
  name: string;
  brand: string;
  gender: string;
  rating_score: number;
  olfactory_family: string;
  notes: string;
  image_url: string;
}

async function searchPerfumes(
  query: string,
  filters?: SearchFilters,
  topK: number = 10
): Promise<SearchResult[]> {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const index = pc.index(INDEX_NAME);

  // Generate embedding for query using OpenAI
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });
  const queryEmbedding = response.data[0].embedding;

  // Build filter object
  const filter: Record<string, any> = {};
  if (filters?.gender) filter.gender = { $eq: filters.gender };
  if (filters?.brand) filter.brand = { $eq: filters.brand };
  if (filters?.primary_season) filter.primary_season = { $eq: filters.primary_season };
  if (filters?.olfactory_family) filter.olfactory_family = { $eq: filters.olfactory_family };
  if (filters?.min_rating) filter.rating_score = { $gte: filters.min_rating };
  if (filters?.price_perception) filter.price_perception = { $eq: filters.price_perception };

  // Query Pinecone
  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  return (results.matches || []).map((match) => ({
    id: match.id,
    score: match.score || 0,
    name: match.metadata?.name as string,
    brand: match.metadata?.brand as string,
    gender: match.metadata?.gender as string,
    rating_score: match.metadata?.rating_score as number,
    olfactory_family: match.metadata?.olfactory_family as string,
    notes: match.metadata?.notes as string,
    image_url: match.metadata?.image_url as string,
  }));
}

// Example usage
async function main() {
  const query = process.argv[2] || "fresh citrus summer fragrance for men";
  const gender = process.argv[3]; // optional: "male" or "female"

  console.log(`\nSearching for: "${query}"${gender ? ` (${gender})` : ""}\n`);

  const results = await searchPerfumes(
    query,
    gender ? { gender } : undefined,
    10
  );

  console.log("Top results:\n");
  results.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.name} by ${result.brand}`);
    console.log(`   Score: ${result.score.toFixed(4)} | Rating: ${result.rating_score}`);
    console.log(`   Family: ${result.olfactory_family} | Gender: ${result.gender}`);
    console.log(`   Notes: ${result.notes.slice(0, 80)}...`);
    console.log();
  });
}

main().catch(console.error);
