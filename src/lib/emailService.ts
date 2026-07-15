/**
 * Service for sending emails using Gmail API
 */
export async function sendAdminPinEmail(accessToken: string, email: string, pin: string): Promise<void> {
  const subject = 'Admin PIN Reminder - Staff Retreat Booking System';
  const body = `
สวัสดีครับ,

รหัสผ่านแอดมินของคุณคือ: ${pin}

โปรดเก็บรักษาเป็นความลับครับ

ขอบคุณครับ
  `.trim();

  // Construct raw RFC 2822 message
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const message = [
    `To: ${email}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body
  ].join('\r\n');

  // Base64Url encode the message
  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedMessage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to send email');
  }
}
