import { pipeline } from '@xenova/transformers';

export class LocalEmbeddings {
  constructor() {
    this.extractor = null;
  }

  async init() {
    if (!this.extractor) {
      console.log("Loading local embedding model (all-MiniLM-L6-v2)...");
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log("Model loaded successfully.");
    }
  }

  async embedDocuments(texts) {
    await this.init();
    const embeddings = [];
    for (const text of texts) {
        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data));
    }
    return embeddings;
  }

  async embedQuery(text) {
    await this.init();
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}
