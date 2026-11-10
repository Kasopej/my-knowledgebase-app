import { embed, EmbeddingModel, embedMany } from "ai";

const defaultEmbeddingModel = "openai/text-embedding-3-small";

export const embedQuery = async (query: string, model: EmbeddingModel = defaultEmbeddingModel): Promise<number[]> => {
    const { embedding } = await embed({
        model: model,
        value: query
    });
    return embedding;
}

export const embedChunks = async (documents: string[], model: EmbeddingModel = defaultEmbeddingModel): Promise<number[][]> => {
    const { embeddings } = await embedMany({
        model: model,
        values: documents
    });
    return embeddings;
}