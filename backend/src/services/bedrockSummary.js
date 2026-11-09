const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Inference-profile ID, not the bare model ID - this model can't be invoked
// on-demand without one (confirmed via ValidationException during testing).
const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const SYSTEM_PROMPT = `You write short, friendly weekly spending summaries for a personal finance app.

Rules:
- Use ONLY the numbers in the JSON you are given. Never calculate, estimate, or invent any figure.
- Write exactly 3-4 sentences in a warm, plain-English tone.
- Mention the week-over-week comparison, the top spending category, and any amounts owed or owing (if the lists are non-empty).
- Do not give financial advice, budgeting tips, or recommendations.
- Do not repeat the raw JSON back to the user, and do not mention that you were given JSON.`;

async function generateSummaryText(facts) {
  const command = new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: SYSTEM_PROMPT }],
    messages: [{ role: 'user', content: [{ text: JSON.stringify(facts) }] }],
    inferenceConfig: { maxTokens: 300, temperature: 0.4 },
  });

  const response = await client.send(command);
  return response.output.message.content[0].text.trim();
}

// Used when Bedrock fails or times out - the dashboard should never break
// just because the AI call didn't go through.
function buildFallbackSummary(facts) {
  const sentences = [];

  let totalSentence = `You spent $${facts.this_week_total.toFixed(2)} this week`;
  if (facts.percent_change !== null) {
    const direction = facts.percent_change >= 0 ? 'more' : 'less';
    totalSentence += `, ${Math.abs(facts.percent_change).toFixed(0)}% ${direction} than last week`;
  }
  sentences.push(`${totalSentence}.`);

  if (facts.top_category) {
    sentences.push(
      `${facts.top_category.name} was your biggest category at $${facts.top_category.this_week_total.toFixed(2)}.`
    );
  }

  if (facts.owed_to_me.length > 0) {
    const names = facts.owed_to_me.map((o) => `${o.name} ($${o.amount.toFixed(2)})`).join(', ');
    sentences.push(`You're owed money by ${names}.`);
  }

  if (facts.i_owe.length > 0) {
    const names = facts.i_owe.map((o) => `${o.name} ($${o.amount.toFixed(2)})`).join(', ');
    sentences.push(`You owe ${names}.`);
  }

  return sentences.join(' ');
}

module.exports = { generateSummaryText, buildFallbackSummary, MODEL_ID };
