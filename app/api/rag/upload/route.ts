import { chunkText } from "@/lib/ai/rag/chunking";
import { embedChunks, embedQuery } from "@/lib/ai/rag/embedding";
import { vectorStore } from "@/lib/ai/rag/vector-store";
import { NextResponse } from "next/server";

const ACCEPTED_TYPES = ["text/plain",, "text/markdown"];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string || file.name || `file ${Date.now()}`;

    if(!file) {
        return NextResponse.json("No file uploaded", { status: 400 });
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
        return NextResponse.json("Invalid file type", { status: 400 });
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json("File too large", { status: 400 });
    }

    const text = await file.text();
    const chunks = chunkText(text);
    if(!chunks.length) {
        return NextResponse.json("File appears to be empty", { status: 400 });
    }
    await vectorStore.addDocument({ name, chunks, embeddings: await embedChunks(chunks) });
    return NextResponse.json({success: true}, { status: 200 })
    } catch (error) {
        console.error(error);
        return NextResponse.json("An error occurred", { status: 500 });
    }
}