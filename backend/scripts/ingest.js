import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
import { LocalEmbeddings } from '../services/localEmbeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEXTBOOKS_DIR = path.join(__dirname, '../../Medical textbooks personally available ');
const VECTOR_STORE_PATH = path.join(__dirname, '../vectorstore.json');

async function ingestPdf(filename) {
  const filePath = path.join(TEXTBOOKS_DIR, filename);
  console.log(`Reading PDF: ${filePath}`);
  console.log("pdfParse type:", typeof pdfParse, Object.keys(pdfParse));
  
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  console.log(`Parsed ${data.numpages} pages.`);
  console.log("Splitting text into chunks...");
  
  const text = data.text;
  const chunkSize = 1000;
  const overlap = 200;
  const chunks = [];
  
  for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  console.log(`Created ${chunks.length} document chunks.`);
  
  console.log("Generating embeddings and building vector store...");
  const embeddings = new LocalEmbeddings();
  const vectorStore = [];
  
  for (let i = 0; i < chunks.length; i++) {
    if (i % 100 === 0) console.log(`Processed ${i}/${chunks.length} chunks...`);
    const embedding = await embeddings.embedQuery(chunks[i]);
    vectorStore.push({ text: chunks[i], embedding });
  }
  
  console.log(`Saving vector store to ${VECTOR_STORE_PATH}...`);
  fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(vectorStore));
  
  console.log("Ingestion complete! You can now use the RAG pipeline.");
}

ingestPdf('ecg detailed files.pdf').catch(console.error);
