import { tools } from "@/lib/ai/tools";
import { convertToModelMessages, createUIMessageStreamResponse, stepCountIs, streamText, toUIMessageStream, UIMessage } from "ai";

const systemPrompt = `You are a helpful AI assistant with three tools:

1. searchKnowledgeBase — search the user's uploaded documents. When a question
   might be answerable from their files, ALWAYS call this first, then answer
   using the returned chunks. Cite the source filename inline.

2. getCurrentWeather — get the weather for a city. Use only when the user
   asks about weather.

3. sendEmail — draft and send an email on the user's behalf. This requires
   the user's explicit approval, which the UI will surface — you do not
   need to ask for approval in text yourself, just call the tool.

Be concise. Stream your final answer in plain text or markdown.`;

export async function POST(request: Request) {
    const {messages}: {messages: UIMessage[]} = await request.json();
    const response = streamText({
        model: 'openai/gpt-4.1-mini',
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
        tools,
        toolApproval: {
            sendEmail: {
                type: 'user-approval',
                reason: 'You are about to send an email.',
            }
        },
        stopWhen: stepCountIs(10),
        onError: (err) => {
            throw new Error(`${err.error}`)
        }
    })

    return createUIMessageStreamResponse({stream: toUIMessageStream({stream: response.stream, onError(error) {
        console.error(error)
        if(error instanceof Error) return error.message
        return 'An error occurred'
    },})})
}