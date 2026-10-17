import { describe, expect, it, vi } from "vitest";
import { opencodeGoProvider } from "../src/providers/opencode-go.ts";
import type { Model, ProviderStreams } from "../src/types.ts";
import { AssistantMessageEventStream } from "../src/utils/event-stream.ts";
import { normalizeContext } from "../src/utils/transcript.ts";

const googleApi = vi.hoisted(() => ({
	stream: vi.fn<ProviderStreams["stream"]>(),
	streamSimple: vi.fn<ProviderStreams["streamSimple"]>(),
}));

vi.mock("../src/api/google-generative-ai.lazy.ts", () => ({
	googleGenerativeAIApi: () => googleApi,
}));

const model: Model<"google-generative-ai"> = {
	id: "gemini-test",
	name: "Gemini Test",
	api: "google-generative-ai",
	provider: "opencode-go",
	baseUrl: "https://opencode.ai/zen/go/v1",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 1000,
	maxTokens: 100,
};

describe("OpenCode Go Gemini dispatch", () => {
	it.each(["stream", "streamSimple"] as const)("routes %s to Gemini with the session header", (method) => {
		const context = normalizeContext({ messages: [{ role: "user", content: "hi", timestamp: 0 }] });
		const stream = new AssistantMessageEventStream();
		googleApi[method].mockReturnValueOnce(stream);

		expect(opencodeGoProvider()[method](model, context, { sessionId: "test-session" })).toBe(stream);
		expect(googleApi[method]).toHaveBeenCalledWith(model, context, {
			sessionId: "test-session",
			headers: { "x-opencode-session": "test-session" },
		});
	});
});
