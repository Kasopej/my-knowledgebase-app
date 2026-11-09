import { cosineSimilarity } from "ai";
import fs from "fs/promises";
import path from "path";


export type StoredChunk = {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
};

export type StoredDocument = {
  id: string;
  name: string;
  chunkCount: number;
  createdAt: string;
};

export type SearchResult = {
  chunk: Omit<StoredChunk, "embedding">;
  similarity: number;
};

type Snapshot = {
    documents: StoredDocument[];
    chunks: StoredChunk[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DAT_FILE_PATH = path.join(DATA_DIR, "vector-db.json");

function isSnapshot(obj: unknown): obj is Snapshot {
    return (
        !!obj &&
        Array.isArray((obj as Snapshot).documents) &&
        Array.isArray((obj as Snapshot).chunks) &&
        (obj as Snapshot).documents.every((doc: StoredDocument) => typeof doc.id === "string" && typeof doc.name === "string" && typeof doc.chunkCount === "number" && typeof doc.createdAt === "string") &&
        (obj as Snapshot).chunks.every((chunk: StoredChunk) => typeof chunk.id === "string" && typeof chunk.documentId === "string" && typeof chunk.documentName === "string" && typeof chunk.chunkIndex === "number" && typeof chunk.content === "string" && Array.isArray(chunk.embedding))
    );
}

class VectorStore {
    private loaded = false;
    private loadPromise: Promise<void> | null = null;
    private chunks: Map<string, StoredChunk> = new Map();
    private documents: Map<string, StoredDocument> = new Map();

    private async ensureLoaded() {
      if (this.loaded) return;
      if (this.loadPromise) {
        await this.loadPromise;
        return;
      }
      this.loadPromise = this.load();
      await this.loadPromise;
    }

    private parseFileData(data: string): Snapshot {
      try {
        const parsed = JSON.parse(data);
        if (!isSnapshot(parsed)) {
          throw new Error("Invalid snapshot format");
        }
        return parsed;
      } catch (err) {
        throw new Error(`Failed to parse snapshot data: ${(err as Error).message}`);
      }
    }

    private async load() {
      try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const data = await fs.readFile(DAT_FILE_PATH, "utf-8");
        const snap: Snapshot = this.parseFileData(data);
        this.documents = new Map(snap.documents.map((doc) => [doc.id, doc]));
        this.chunks = new Map(snap.chunks.map((chunk) => [chunk.id, chunk]));
        this.loaded = true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          // File doesn't exist, initialize empty store
          this.documents = new Map();
          this.chunks = new Map();
          this.loaded = true;
        } else {
          throw err;
        }
      }
    }

    private async persist() {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const snap: Snapshot = {
        documents: Array.from(this.documents.values()),
        chunks: Array.from(this.chunks.values())
      }
      await fs.writeFile(DAT_FILE_PATH, JSON.stringify(snap, null, 2), "utf-8");
    }

  async addDocument(params: {
    name: string;
    chunks: string[];
    embeddings: number[][];
  }): Promise<StoredDocument> {
    await this.ensureLoaded();
    if (params.chunks.length !== params.embeddings.length) {
      throw new Error("chunks and embeddings length mismatch");
    }

    const documentId = crypto.randomUUID();
    const document: StoredDocument = {
      id: documentId,
      name: params.name,
      chunkCount: params.chunks.length,
      createdAt: new Date().toISOString(),
    };
    this.documents.set(documentId, document);

    for (let i = 0; i < params.chunks.length; i++) {
      const chunk: StoredChunk = {
        id: crypto.randomUUID(),
        documentId: documentId,
        documentName: document.name,
        chunkIndex: i,
        content: params.chunks[i],
        embedding: params.embeddings[i],
      };
      this.chunks.set(chunk.id, chunk);
    }

    await this.persist();
    return document;
  }

  async search(
    queryEmbedding: number[],
    topK = 4
  ): Promise<SearchResult[]> {
    await this.ensureLoaded();
    if(!this.chunks.size) {
      return [];
    }

    const weighedChunks = Array.from(this.chunks.values()).map((chunk) => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      return { chunk, similarity };
    });

    return weighedChunks.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  async listDocuments(): Promise<StoredDocument[]> {
    return Array.from(this.documents.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.ensureLoaded();
    this.documents.delete(documentId);
    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.documentId === documentId) {
        this.chunks.delete(chunkId);
      }
    }
    await this.persist();
  }
}

export const vectorStore = new VectorStore();