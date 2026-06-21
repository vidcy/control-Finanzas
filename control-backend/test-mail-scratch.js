const fetch = require('node-fetch');

const SENDGRID_API_KEY = ""
const SENDGRID_MAIL = 'noreply@em8.finanzas.ccoplex.com';
const to = 'test@example.com';

async function run() {
  console.log('Sending test mail via SendGrid...');
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: SENDGRID_MAIL,
        name: 'Think - Global Ccoplex',
      },
      subject: 'Test SendGrid key',
      content: [{ type: 'text/html', value: '<p>Hello from Think</p>' }],
    }),
  });

  console.log('Status:', response.status, response.statusText);
  const text = await response.text();
  console.log('Response body:', text);
}

run().catch(console.error);
