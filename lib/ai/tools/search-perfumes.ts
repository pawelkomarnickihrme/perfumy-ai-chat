import { tool } from "ai";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { z } from "zod";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "perfumes";
const EMBEDDING_MODEL = "text-embedding-3-small";

interface PerfumeResult {
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

async function searchPerfumesInPinecone(
  query: string,
  filters?: {
    gender?: string;
    brand?: string;
    primary_season?: string;
    olfactory_family?: string;
    min_rating?: number;
    price_perception?: string;
  },
  topK: number = 5
): Promise<PerfumeResult[]> {
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
  if (filters?.primary_season)
    filter.primary_season = { $eq: filters.primary_season };
  if (filters?.olfactory_family)
    filter.olfactory_family = { $eq: filters.olfactory_family };
  if (filters?.min_rating) filter.rating_score = { $gte: filters.min_rating };
  if (filters?.price_perception)
    filter.price_perception = { $eq: filters.price_perception };

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

export const searchPerfumes = tool({
  description: `Search for perfumes based on user preferences, mood, occasion, or specific characteristics.
Use this tool whenever the user asks for perfume recommendations, wants to find a fragrance,
or describes what kind of scent they're looking for. You can filter by gender (male/female/unisex),
brand, season (spring/summer/fall/winter), olfactory family (e.g., floral, woody, oriental, fresh),
minimum rating, or price perception (budget/moderate/luxury).`,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Natural language description of the desired perfume (e.g., 'fresh citrus summer fragrance', 'romantic evening scent', 'woody masculine cologne')"
      ),
    gender: z
      .enum(["male", "female", "unisex"])
      .optional()
      .describe("Filter by target gender"),
    brand: z.string().optional().describe("Filter by specific brand name"),
    primary_season: z
      .enum(["spring", "summer", "fall", "winter"])
      .optional()
      .describe("Filter by recommended season"),
    olfactory_family: z
      .string()
      .optional()
      .describe(
        "Filter by olfactory family (e.g., floral, woody, oriental, fresh, citrus)"
      ),
    min_rating: z
      .number()
      .min(0)
      .max(5)
      .optional()
      .describe("Minimum rating score (0-5)"),
    price_perception: z
      .enum(["budget", "moderate", "luxury"])
      .optional()
      .describe("Filter by price category"),
    topK: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Number of results to return (1-10, default 5)"),
  }),
  execute: async (input) => {
    const topK = input.topK ?? 5;

    try {
      const results = await searchPerfumesInPinecone(
        input.query,
        {
          gender: input.gender,
          brand: input.brand,
          primary_season: input.primary_season,
          olfactory_family: input.olfactory_family,
          min_rating: input.min_rating,
          price_perception: input.price_perception,
        },
        topK
      );

      if (results.length === 0) {
        return {
          success: false,
          message:
            "No perfumes found matching your criteria. Try adjusting your filters or describing your preferences differently.",
          perfumes: [],
        };
      }

      return {
        success: true,
        message: `Found ${results.length} perfume(s) matching your preferences.`,
        perfumes: results.map((p) => ({
          name: p.name,
          brand: p.brand,
          gender: p.gender,
          rating: p.rating_score,
          olfactoryFamily: p.olfactory_family,
          notes: p.notes,
          imageUrl: p.image_url,
          matchScore: Math.round(p.score * 100),
        })),
      };
    } catch (error) {
      console.error("Error searching perfumes:", error);
      return {
        success: false,
        message:
          "An error occurred while searching for perfumes. Please try again.",
        perfumes: [],
      };
    }
  },
});
