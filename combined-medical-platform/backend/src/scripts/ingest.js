import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import { LocalEmbeddings } from '../modules/scriber/services/localEmbeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we save vectorstore in the scriber/services directory where ragService.js expects it
const VECTOR_STORE_PATH = path.join(__dirname, '../modules/scriber/vectorstore.json');

function chunkText(text, maxChars = 1000) {
    const chunks = [];
    // Split by paragraphs to keep semantic meaning as much as possible
    const paragraphs = text.split(/\n\s*\n/);
    
    let currentChunk = "";
    for (const p of paragraphs) {
        if ((currentChunk.length + p.length) > maxChars && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
        }
        currentChunk += p + "\n\n";
    }
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

async function ingestPdf(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        process.exit(1);
    }

    console.log(`Parsing PDF: ${filePath}...`);
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    console.log(`Extracted ${pdfData.text.length} characters of text. Chunking...`);
    const chunks = chunkText(pdfData.text, 800); // 800 chars per chunk
    
    console.log(`Generated ${chunks.length} chunks. Generating embeddings...`);
    const embeddings = new LocalEmbeddings();
    
    const vectorStore = [];
    
    for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i];
        if (!text || text.trim().length === 0) continue;
        
        process.stdout.write(`\rEmbedding chunk ${i + 1}/${chunks.length}...`);
        const vector = await embeddings.embedQuery(text);
        
        vectorStore.push({
            id: `chunk_${i}`,
            text: text,
            embedding: vector
        });
    }
    
    console.log(`\nSaving vector store to ${VECTOR_STORE_PATH}...`);
    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(vectorStore, null, 2));
    
    console.log("✅ Ingestion complete! Knowledge base is ready for RAG.");
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log("Usage: node ingest.js <path-to-medical-book.pdf>");
    process.exit(1);
}

ingestPdf(args[0]).catch(err => {
    console.error("Ingestion failed:", err);
    process.exit(1);
});
