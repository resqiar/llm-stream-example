# Migrating from Normal REST API to Streaming API with Express + Langchain

## Overview

This repository demonstrates how to transition a LangChain-powered backend and its corresponding frontend from a traditional REST API to a streaming API using Server-Sent Events (SSE).

### Why Migrate?

Migrating to streaming API offers BLAZINGLY-FAST performance improvements, particularly in latency for large language model (LLM) responses. Key benefits include:

- **15x Faster Response Time**: With streaming, the first chunk of data is sent to the client as soon as it is available, drastically reducing perceived latency.
- **Improved User Experience**: Users see partial results in real-time, making interactions feel more dynamic and responsive.
- **Resource Efficiency**: Reduces server-side processing bottlenecks by chunking the response.

### What is Server-Sent Events (SSE)?

SSE is a lightweight protocol for streaming updates from the server to the client over HTTP. Unlike WebSockets, SSE is unidirectional (one-way) and uses simple HTTP semantics.

---

## Migration Guide

This guide will walk you through migrating both the backend and frontend code from a normal REST API implementation to a streaming API.

## START THE REPO FIRST
1. Clone this repo if you haven't.
2. Run `npm install`.
3. Run `npm run start` to start the server.
4. Open `localhost:5000` to see the web implementation.

### 1. Backend Migration

#### Current Normal Endpoint

The `/normal` endpoint simulate the full LLM response in a single HTTP request (using `llm.invoke()`).

```javascript
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
});
```

#### New Streaming Endpoint
Replace the `/normal` endpoint implementation with the `\stream` implementation to enable real-time response streaming (using `llm.stream`).

```javascript
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

        // Set response headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of stream) {
            const content = chunk.content;
            if (!content) continue;

            res.write(`data: ${JSON.stringify(content)}\n\n`);
        }

        res.end();
    } catch (error) {
        console.error("Streaming error:", error);
        res.write("data: an error occurred while streaming response.");
        res.end();
    }
});
```

**IMPORTANTT!!!:**
- Use `res.setHeader()` to define the appropriate headers for SSE.
- Each chunk must be prefixed with `data: ` to comply with SSE formatting.
- Always call `res.end()` to close the connection gracefully.

---

### 2. Frontend Migration

#### Current Normal Form
The normal form makes a single GET request and waits for the complete response.

```javascript
document.getElementById('normal-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = document.getElementById('normal-query').value;

    try {
        const response = await fetch(`/normal?query=${encodeURIComponent(query)}`);
        const result = await response.text();
        container.innerHTML = result;
    } catch (error) {
        console.error("Error fetching normal response:", error);
    }
});
```

#### New Streaming Form
Update the form handler to use `EventSource` for streaming responses.

```javascript
document.getElementById('stream-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const query = document.getElementById('stream-query').value;
    const eventSource = new EventSource(`/stream?query=${encodeURIComponent(query)}`);

    let accumulatedText = "";

    eventSource.onmessage = (event) => {
        accumulatedText += event.data;
        const cleanedText = cleanText(accumulatedText);
        container.innerHTML = cleanedText;
    };

    eventSource.onerror = () => {
        eventSource.close();
        console.error("Stream connection error");
    };
});
```

**Key Differences:**
- Use `EventSource` to handle SSE.
- Accumulate and render text chunks progressively for real-time updates.
- Handle `onmessage` and `onerror` events for streaming.

---

### 3. Caveats and Best Practices

#### Backend:
- **Ensure Headers Are Set**: SSE requires specific headers (`Content-Type`, `Cache-Control`, `Connection`).
- **Graceful Error Handling**: Always close the stream (`res.end`) in case of errors.

#### Frontend:
- **EventSource Limitations**: Only supports GET requests. For POST requests, consider alternatives like Fetch API combined with SSE.
- **Error Resilience**: Implement reconnection logic for `EventSource` in production environments.

---

# Try it!

Try the difference in `localhost:5000`, between normal llm.invoke() and llm.stream(), time perspective difference is crazy! sometimes it can touch up to 15x faster first response. Well, the reason llm.invoke() looks slow is that it waits for the response to be finished then send to the client, where llm.stream, basically just send the response as a chunk as soon as it arrives.
