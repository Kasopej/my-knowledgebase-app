import { InferUITools, tool, UIDataTypes, UIMessage } from "ai";
import z from "zod";
import { embedQuery } from "../rag/embedding";
import { StoredChunk, vectorStore } from "../rag/vector-store";

type ResultChunk = Omit<StoredChunk, "id" | "embedding" | "documentName"> & {
    similarity: number;
    source: string;
}

export const searchKnowledgeBase = tool({
    description: "Search the user's uploaded knowledge base for information relevant to their question. Use this whenever a question might be answered by documents the user has uploaded. Returns the most relevant chunks.",
    inputSchema: z.object({
        query: z.string().describe("The natural language query to search for in the knowledge base."),
    }),
    outputSchema: z.object({
        found: z.boolean().describe("Whether any relevant chunks were found in the knowledge base."),
        message: z.string().describe("A message describing the result of the search."),
        chunks: z.array(z.object({
            documentId: z.string().describe("The ID of the document the chunk belongs to."),
            source: z.string().describe("The name of the document the chunk belongs to."),
            chunkIndex: z.number().describe("The index of the chunk within the document."),
            content: z.string().describe("The content of the chunk."),
            similarity: z.number().describe("The similarity score of the chunk to the query."),
        })).describe("An array of relevant chunks found in the knowledge base, sorted by relevance.")
    }),
    execute: async ({ query }) => {
        const queryEmbedding = await embedQuery(query);
        const searchResults = await vectorStore.search(queryEmbedding, 4);
        if (!searchResults.length) {
            return {
                found: false,
                message: "No relevant document chunks found in the knowledge base.",
                chunks: []
            };
        }
        return {
            found: true,
            message: `Found ${searchResults.length} relevant document chunk(s) in the knowledge base.`,
            chunks: searchResults.map(result => ({
                documentId: result.chunk.documentId,
                source: result.chunk.documentName,
                chunkIndex: result.chunk.chunkIndex,
                content: result.chunk.content,
                similarity: result.similarity
            } as ResultChunk))
        };
    }
})

export const getWeatherTool = tool({
    description: 'Get live current weather for a city',
    inputSchema: z.object({
        location: z.string().describe('The city for which the weather is requested'),
    }),
    outputSchema: z.object({
        location: z.string().describe('The city for which the weather is requested'),
        temperature: z.number().describe('The temperature in Celsius'),
        condition: z.string().describe('The weather condition'),
        humidity: z.number().describe('The humidity in percentage'),
    }),
    execute: async ({ location }) => {
        const url = new URL('https://api.openweathermap.org/data/2.5/weather');
        url.search = new URLSearchParams({
            q: location,
            appid: process.env.OPEN_WEATHER_API_KEY || '',
            units: 'metric',
        }).toString();

        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            const reason = response.status === 401
                ? 'Check that OPEN_WEATHER_KEY is valid and activated.'
                : response.status === 404
                    ? `City not found: ${location}.`
                    : 'The weather service could not complete the request.';
            throw new Error(`OpenWeather request failed (${response.status}). ${reason}`);
        }

        const data = await response.json();
        return {
            location: data.name,
            temperature: data.main.temp,
            condition: data.weather[0].description,
            humidity: data.main.humidity,
        };
    },
});

export const sendMailTool = tool({
    description: 'Send an email to a recipient',
    inputSchema: z.object({
        address: z.string().email().describe('The email address of the recipient'),
        subject: z.string().describe('The subject of the email'),
        body: z.string().describe('The body content of the email'),
    }),
    outputSchema: z.object({
        success: z.boolean().describe('Indicates whether the email was sent successfully'),
        address: z.string().email().describe('The email address of the recipient'),
        subject: z.string().describe('The subject of the email'),
        timestamp: z.string().describe('The timestamp of when the email was sent'),
    }),
    execute: async ({ address, subject, body }) => {
        // Implement your email sending logic here
        // For example, using a third-party email service API
        console.log(`Sending email to ${address} with subject "${subject}" and body "${body}"`);
        return { success: true, address, subject, timestamp: new Date().toISOString() };
    },
});

export const tools = {
    searchKnowledgeBase,
    getWeather: getWeatherTool,
    sendEmail: sendMailTool,}
export type ChatTools = InferUITools<typeof tools>;
export type ChatUIMessage = UIMessage<never, UIDataTypes, ChatTools>;