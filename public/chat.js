const container = document.getElementById("response-container");
const elapsedTimeText = document.getElementById("elapsed-time");

document.getElementById('normal-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    showLoading(true);
    cleanElapsedTime();
    const timeStart = performance.now();

    const query = document.getElementById('normal-query').value;

    try {
        // Make a GET request to the normal endpoint with the query as a URL parameter
        const response = await fetch(`/normal?query=${encodeURIComponent(query)}`);
        const result = await response.text();
        const timeEnd = performance.now();

        if (!result) {
            container.innerHTML = "No response generated, try again later"; // Handle empty response
            return;
        }

        showLoading(false);
        displayElapsedTime(timeStart, timeEnd);

        // Inject the result in the result container
        container.innerHTML = result;
    } catch (error) {
        console.error("Error fetching normal response:", error);
        container.innerHTML = "An error occurred. Please try again later.";
        showLoading(false);
    }
});

document.getElementById('stream-form').addEventListener('submit', (e) => {
    e.preventDefault();

    showLoading(true);
    cleanElapsedTime();
    const timeStart = performance.now();

    const query = document.getElementById('stream-query').value;

    // Initialize an EventSource to stream responses from the server
    //
    // IMPORTANT!!!
    // EventSource can only do GET request, this because the sole purpose of
    // EventSource is to only listen to SSE, so it designed to be that way.
    // If for any reason we need POST request for the stream, we can do that by
    // fetching it first using Fetch API, then build the event source.
    const eventSource = new EventSource(`/stream?query=${encodeURIComponent(query)}`);

    let accumulatedText = "";

    // Incoming messages from the server will be dealt and pushed here.
    eventSource.onmessage = (event) => {
        // Measure the time when the first chunk of data is received
        if (accumulatedText === "") {
            const timeEnd = performance.now();
            displayElapsedTime(timeStart, timeEnd);
            showLoading(false);
        }

        accumulatedText += event.data;
        const cleanedText = cleanText(accumulatedText);
        container.innerHTML = cleanedText;
    };

    eventSource.onerror = () => {
        eventSource.close();
        console.error("Stream connection error");
    };
});

/**
 * Show or hide a loading message in the container.
 * @param {boolean} loading - Whether to show the loading message.
 */
function showLoading(loading) {
    container.innerHTML = "";

    if (loading) {
        container.innerHTML = `<p class="text-sm animate-bounce">Generating response........`;
    }
}

/**
 * Clean up the streamed text by removing extra quotes and trimming whitespace.
 * @param {string} text - The text to be cleaned.
 * @returns {string} - The cleaned text.
 */
function cleanText(text) {
    return text
        .replace(/^"/, '') // Remove leading quote
        .replace(/""/g, '') // Remove excesive quote
        .replace(/"$/, '') // Remove trailing quote
        .trim();
}

function cleanElapsedTime() {
    elapsedTimeText.innerText = "";
}

/**
 * Show and display elapsed time taken for the first response coming from the server.
 * @param {number} startTime - Number returned from performance.now()
 * @param {number} endTime - Number returned from performance.now()
 */
function displayElapsedTime(startTime, endTime) {
    const elapsed = Math.floor(endTime - startTime);
    elapsedTimeText.innerText = `Time taken before first response is displayed: "${elapsed}ms"`;
}
