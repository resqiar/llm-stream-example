import express from 'express';
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from "@langchain/core/messages";
import path from 'path';

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/stream', async (req, res) => {
    const { query } = req.query;

    const llm = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
        openAIApiKey: process.env.OPEN_AI_KEY,
    });
    const messages = [new HumanMessage(query)];

    try {
        const stream = await llm.stream(messages);

        // IMPORTANT!!!
        // Set response headers for Server Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of stream) {
            const content = chunk.content;
            if (!content) continue;

            // Send chunk of content as a partial response
            //
            // IMPORTANT!!!
            // Always write the content starting with "data: " as it indicates
            // that this response is Server Sent Event (SSE).
            res.write(`data: ${JSON.stringify(content)}\n\n`);
        }

        res.end();
    } catch (error) {
        console.error("streaming error:", error);
        res.write("data: an error occurred while streaming response.");
        res.end();
    }
})

app.get('/normal', async (req, res) => {
    const { query } = req.query;

    const llm = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
        openAIApiKey: process.env.OPEN_AI_KEY,
    });
    const messages = [new HumanMessage(query)];

    try {
        const response = await llm.invoke(messages);
        const answer = "content" in response ? response.content : "No answer was generated.";

        res.send(answer);
    } catch (error) {
        console.error("Error invoking LLM:", error);
        res.send("An error occurred while generating the summary.");
    }
})

app.listen(PORT, () => console.log(`Listening on port :${PORT}`));
