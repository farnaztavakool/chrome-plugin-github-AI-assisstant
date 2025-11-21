"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const llmService_js_1 = require("./llmService.js");
const app = (0, express_1.default)();
const PORT = 3000;
// Default configuration
const DEFAULT_MODEL = "gpt-4o"; // Change to "gpt-4o" or "claude-3-sonnet-20240229" if keys are present
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json({ limit: '10mb' })); // Increase limit for large DOM snapshots
app.post('/chat', async (req, res) => {
    try {
        const clientRequest = req.body; // { user_chat, page_context }
        // Validate request
        if (!clientRequest.user_chat || !clientRequest.page_context) {
            return res.status(400).json({ error: "Missing user_chat or page_context" });
        }
        console.log(`[Request] Chat: "${clientRequest.user_chat}" | Context: ${clientRequest.page_context.url}`);
        // Construct the prompt
        // The system prompt expects us to pass the exact JSON schema in the user prompt?
        // "The server receives... req: { user_chat, page_context }"
        // "The entire prompt (system + user content) must be passed to the LLM without modification."
        // So we pass the JSON string of the request as the user message.
        const userPrompt = JSON.stringify(clientRequest, null, 2);
        // Call LLM
        const llmResponse = await (0, llmService_js_1.runLLM)({
            model: process.env.LLM_MODEL || DEFAULT_MODEL,
            systemPrompt: llmService_js_1.SYSTEM_PROMPT,
            userPrompt: userPrompt
        });
        // Parse LLM output
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(llmResponse.content);
        }
        catch (err) {
            console.error("Failed to parse LLM JSON:", llmResponse.content);
            // Fallback/Retry logic could go here
            return res.status(500).json({
                assistant_message: "I encountered an error processing the response.",
                actions: []
            });
        }
        // Return to client
        res.json(parsedResponse);
    }
    catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.listen(PORT, () => {
    console.log(`GitHub Navigator AI Backend running on http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.LLM_MODEL || DEFAULT_MODEL}`);
});
//# sourceMappingURL=server.js.map