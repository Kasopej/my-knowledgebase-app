import { vectorStore } from "@/lib/ai/rag/vector-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const documents = await vectorStore.listDocuments();
    return NextResponse.json(documents, { status: 200 })
}

export async function POST(request: Request) {
    const { name, chunks, embeddings } = await request.json();
    await vectorStore.addDocument({ name, chunks, embeddings });
    return NextResponse.json({success: true}, { status: 204 })
}