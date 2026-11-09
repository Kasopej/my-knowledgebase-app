export function chunkText(text: string, {chunkSize = 1000, chunkOverlap = 100}: {chunkSize?: number, chunkOverlap?: number}): string[] {
  const chunks: string[] = [];
  const cleanedText = text.replace(/\s+/g, ' ').replace(/\r\n/g, '\n').trim();
  const sentences = cleanedText.split(/(?<=[.!?])\s+|\n/).map(s => s.trim()).filter(Boolean);
  for (const sentence of sentences) {
    for (let i = 0; i < sentence.length; i += chunkSize - chunkOverlap) {
      chunks.push(sentence.substring(i, i + chunkSize));
    }
  }
  return chunks;
}