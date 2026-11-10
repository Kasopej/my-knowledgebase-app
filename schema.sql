BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    -- Maintain this count in the same transaction as chunk inserts/deletes.
    chunk_count INTEGER NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    content TEXT NOT NULL,
    -- Matches the app's text-embedding-3-small default output dimensions.
    embedding VECTOR(1536) NOT NULL,
    -- Also indexes document_id for document lookups and cascading deletes.
    UNIQUE (document_id, chunk_index)
);

-- Upgrade an existing chunks table and backfill names before requiring them.
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS document_name TEXT;

UPDATE chunks AS c
SET document_name = d.name
FROM documents AS d
WHERE c.document_id = d.id AND c.document_name IS NULL;

ALTER TABLE chunks ALTER COLUMN document_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING hnsw (embedding vector_cosine_ops);

COMMIT;

-- For cosine search, bind $1 to a 1536-dimensional query vector and $2 to topK:
-- SELECT c.id, c.document_id, c.document_name, c.chunk_index, c.content,
--        1 - (c.embedding <=> $1::vector) AS similarity
-- FROM chunks AS c
-- ORDER BY c.embedding <=> $1::vector
-- LIMIT $2;
