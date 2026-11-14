const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

const client = new SESv2Client({ region: process.env.AWS_REGION || 'us-east-1' });
const FROM_ADDRESS = process.env.MAIL_FROM || 'Pennyroom <noreply@thapa.dev>';

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const command = new SendEmailCommand({
    FromEmailAddress: FROM_ADDRESS,
    Destination: { ToAddresses: [toEmail] },
    Content: {
      Simple: {
        Subject: { Data: 'Reset your Pennyroom password' },
        Body: {
          Text: {
            Data: `We got a request to reset your Pennyroom password.\n\nReset it here (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
          },
        },
      },
    },
  });

  await client.send(command);
}

async function sendVerificationEmail(toEmail, verifyUrl) {
  const command = new SendEmailCommand({
    FromEmailAddress: FROM_ADDRESS,
    Destination: { ToAddresses: [toEmail] },
    Content: {
      Simple: {
        Subject: { Data: 'Verify your Pennyroom email' },
        Body: {
          Text: {
            Data: `Welcome to Pennyroom! Confirm this is your email address to activate your account.\n\nVerify it here (expires in 24 hours):\n${verifyUrl}\n\nIf you didn't create a Pennyroom account, you can ignore this email.`,
          },
        },
      },
    },
  });

  await client.send(command);
}

module.exports = { sendPasswordResetEmail, sendVerificationEmail };
