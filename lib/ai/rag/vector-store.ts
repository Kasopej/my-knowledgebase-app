import { neon } from "@neondatabase/serverless";


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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
const sql = neon(process.env.DATABASE_URL);
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

class VectorStore {

  async addDocument(params: {
    name: string;
    chunks: string[];
    embeddings: number[][];
  }): Promise<StoredDocument> {
    if (params.chunks.length !== params.embeddings.length) {
      throw new Error("chunks and embeddings length mismatch");
    }

    const [doc] = (await sql`
      INSERT INTO documents (name, chunk_count)
      VALUES (${params.name}, ${params.chunks.length})
      RETURNING id, name, chunk_count, created_at
    `) as { id: string; name: string; chunk_count: number; created_at: string }[];

    const valuesSql: string[] = [];
    const queryParams: unknown[] = [];
    for (let i = 0; i < params.chunks.length; i++) {
      const content = params.chunks[i];
      const base = i * 5;
      valuesSql.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::vector)`
      );
      queryParams.push(
        doc.id,
        doc.name,
        i,
        content,
        toVectorLiteral(params.embeddings[i])
      );
    }
    if (valuesSql.length > 0) {
      await sql.query(
        `INSERT INTO chunks (document_id, document_name, chunk_index, content, embedding)
         VALUES ${valuesSql.join(", ")}`,
        queryParams
      );
    }

    const document = {
      id: doc.id,
      name: doc.name,
      chunkCount: doc.chunk_count,
      createdAt: doc.created_at,
    };
    return document;
  }

  async search(
    queryEmbedding: number[],
    topK = 4
  ): Promise<SearchResult[]> {
    const literal = toVectorLiteral(queryEmbedding);

    // `<=>` is cosine distance (0 = identical). similarity = 1 - distance.
    const rows = (await sql`
      SELECT
        c.id,
        c.document_id,
        c.document_name,
        c.chunk_index,
        c.content,
        1 - (c.embedding <=> ${literal}::vector) AS similarity
      FROM chunks AS c
      ORDER BY c.embedding <=> ${literal}::vector
      LIMIT ${topK}
    `) as Array<{
      id: string;
      document_id: string;
      document_name: string;
      chunk_index: number;
      content: string;
      similarity: number;
    }>;

    return rows.map((r) => ({
      similarity: Number(r.similarity),
      chunk: {
        id: r.id,
        documentId: r.document_id,
        documentName: r.document_name,
        chunkIndex: r.chunk_index,
        content: r.content,
      },
    }));
  }

  async listDocuments(): Promise<StoredDocument[]> {
    const rows = (await sql`
      SELECT id, name, chunk_count, created_at
      FROM documents
      ORDER BY created_at DESC
    `) as Array<{
      id: string;
      name: string;
      chunk_count: number;
      created_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      chunkCount: r.chunk_count,
      createdAt: r.created_at,
    }));
  }

  async deleteDocument(documentId: string): Promise<void> {
    await sql`DELETE FROM documents WHERE id = ${documentId}`;
  }
}

export const vectorStore = new VectorStore();
