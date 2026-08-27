import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LocalEmbeddings } from './localEmbeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VECTOR_STORE_PATH = path.join(__dirname, '../vectorstore.json');

let vectorStore = null;

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getVectorStore() {
  if (vectorStore) return vectorStore;

  if (!fs.existsSync(VECTOR_STORE_PATH)) {
    console.warn("Vector store not found. Please run the ingestion script first.");
    return null;
  }

  vectorStore = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, 'utf-8'));
  return vectorStore;
}

export async function retrieveMedicalContext(query, topK = 3) {
  try {
    const store = await getVectorStore();
    if (!store) return "";

    console.log(`Searching medical textbooks for context related to: "${query.substring(0, 50)}..."`);
    const embeddings = new LocalEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(query);
    
    const results = store.map(item => ({
      text: item.text,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }));

    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, topK);
    
    if (topResults.length > 0) {
      console.log(`Found ${topResults.length} relevant textbook excerpts.`);
    }
    
    return topResults.map(res => res.text).join("\n\n---\n\n");
  } catch (error) {
    console.error("Error retrieving RAG context:", error);
    return "";
  }
}
