import { vectorStore } from "@/lib/ai/rag/vector-store";
import { NextResponse } from "next/server";

export async function DELETE(request: Request, { params }: { params: Promise<{ docID: string }> }) {
    const { docID } = await params;
    await vectorStore.deleteDocument(docID);
    return NextResponse.json({success: true}, { status: 204 })
}