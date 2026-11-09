const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { TOOLS, executeTool } = require('./pennyTools');

const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Guards against a runaway tool-call loop driving up cost.
const MAX_TOOL_ROUNDS = 5;

function systemPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  return `You are Penny, a friendly assistant inside the Pennyroom expense tracker app.
Today's date is ${today}.

Rules:
- You help the user understand their own spending, balances, and recurring expenses.
- Always use the provided tools to fetch real data before answering any question involving numbers. Never calculate or guess a figure yourself.
- Resolve relative dates ("this month", "last week", "in July") into actual start_date/end_date before calling a tool.
- Keep answers conversational and concise - 2-4 sentences, unless the user explicitly asks for a list.
- If a question needs data the tools can't provide, say so honestly instead of guessing.
- Do not give financial advice.`;
}

function toConverseMessages(history, userMessage) {
  const messages = history.map((m) => ({ role: m.role, content: [{ text: m.content }] }));
  messages.push({ role: 'user', content: [{ text: userMessage }] });
  return messages;
}

async function askPenny(userId, history, userMessage) {
  const messages = toConverseMessages(history, userMessage);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const command = new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: systemPrompt() }],
      messages,
      toolConfig: { tools: TOOLS },
      inferenceConfig: { maxTokens: 500, temperature: 0.3 },
    });

    const response = await client.send(command);
    const assistantMessage = response.output.message;
    messages.push(assistantMessage);

    if (response.stopReason !== 'tool_use') {
      const textBlock = assistantMessage.content.find((b) => b.text);
      return textBlock ? textBlock.text.trim() : "Sorry, I couldn't come up with an answer.";
    }

    const toolUseBlocks = assistantMessage.content.filter((b) => b.toolUse);
    const toolResults = [];
    for (const block of toolUseBlocks) {
      const { toolUseId, name, input } = block.toolUse;
      let result;
      try {
        result = await executeTool(userId, name, input || {});
      } catch (err) {
        result = { error: err.message };
      }
      toolResults.push({ toolResult: { toolUseId, content: [{ json: result }] } });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return 'Sorry, that question took too many steps for me to answer right now - try rephrasing it.';
}

module.exports = { askPenny };
