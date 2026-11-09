require('dotenv').config();
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

async function main() {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: 'Say hello in one sentence.' }] }],
    inferenceConfig: { maxTokens: 100, temperature: 0.4 },
  });

  const response = await client.send(command);
  console.log(response.output.message.content[0].text);
}

main().catch((err) => {
  console.error('Bedrock test call failed:', err);
  process.exit(1);
});
