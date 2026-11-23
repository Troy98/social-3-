import { EmailSubjectEnum } from "../../enum/email.enum.js";

export const templates = {
  [EmailSubjectEnum.CONFIRM_EMAIL]: ({ data, subject }: { data: any; subject: string }) => {
    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f3f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f2f3f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06); padding: 40px 30px;">

          <!-- Icon -->
          <tr>
            <td align="center" style="padding-bottom: 25px;">
              <img src="https://cdn-icons-png.flaticon.com/512/9437/9437533.png" alt="Icon" width="48" height="48" style="display: block; border: 0; outline: none; text-decoration: none;">
            </td>
          </tr>

          <!-- Main Heading -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 500; color: #0B1F44; letter-spacing: -0.5px;">${subject}</h1>
            </td>
          </tr>

          <!-- Greeting and Instructions -->
          <tr>
            <td align="center" style="padding-bottom: 30px; color: #4a5568; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 8px; font-size: 16px;">Hello ${data.userName},</p>
              <p style="margin: 0;">Please confirm your email address by clicking the button below to sign in on this device.</p>
            </td>
          </tr>

          <!-- Confirmation Button -->
          <tr>
            <td align="center" style="padding-bottom: 35px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #0B1F44;">
                    <a href="{{CONFIRMATION_URL}}" target="_blank" style="display: inline-block; padding: 14px 44px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">${subject}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Manual Code Instructions -->
          <tr>
            <td align="center" style="padding-bottom: 20px; color: #4a5568; font-size: 14px;">
              Or you can copy and paste this code into the application:
            </td>
          </tr>

          <!-- OTP Code -->
          <tr>
            <td align="center" style="padding-bottom: 35px;">
              <span style="font-size: 26px; font-weight: 700; letter-spacing: 12px; color: #0B1F44; font-family: Consolas, Monaco, monospace; display: inline-block; padding-right: 12px;">${data.code}</span>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td align="center" style="color: #718096; font-size: 13px; line-height: 1.5; border-top: 1px solid #edf2f7; padding-top: 25px;">
              If you did not request this verification, you can safely ignore this email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  [EmailSubjectEnum.FORGET_PASSWORD]: ({ data, subject }: { data: any; subject: string }) => {
    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f3f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f2f3f5; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06); padding: 40px 30px;">

          <!-- Icon -->
          <tr>
            <td align="center" style="padding-bottom: 25px;">
              <img src="https://cdn-icons-png.flaticon.com/512/9437/9437533.png" alt="Icon" width="48" height="48" style="display: block; border: 0; outline: none; text-decoration: none;">
            </td>
          </tr>

          <!-- Main Heading -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 500; color: #0B1F44; letter-spacing: -0.5px;">${subject}</h1>
            </td>
          </tr>

          <!-- Greeting and Instructions -->
          <tr>
            <td align="center" style="padding-bottom: 30px; color: #4a5568; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 8px; font-size: 16px;">Hello ${data.userName},</p>
              <p style="margin: 0;">Please confirm your email address by clicking the button below to sign in on this device.</p>
            </td>
          </tr>

          <!-- Confirmation Button -->
          <tr>
            <td align="center" style="padding-bottom: 35px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #0B1F44;">
                    <a href="{{CONFIRMATION_URL}}" target="_blank" style="display: inline-block; padding: 14px 44px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">${subject}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Manual Code Instructions -->
          <tr>
            <td align="center" style="padding-bottom: 20px; color: #4a5568; font-size: 14px;">
              Or you can copy and paste this code into the application:
            </td>
          </tr>

          <!-- OTP Code -->
          <tr>
            <td align="center" style="padding-bottom: 35px;">
              <span style="font-size: 26px; font-weight: 700; letter-spacing: 12px; color: #0B1F44; font-family: Consolas, Monaco, monospace; display: inline-block; padding-right: 12px;">${data.code}</span>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td align="center" style="color: #718096; font-size: 13px; line-height: 1.5; border-top: 1px solid #edf2f7; padding-top: 25px;">
              If you did not request this verification, you can safely ignore this email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },
};
export const verifyEmailTemplate = ({ data, subject }: { data: any; subject: EmailSubjectEnum }) => {
  const template = templates[subject as keyof typeof templates];

  if (!template) {
    throw new Error(`Email template not found for subject: ${subject}`);
  }

  return template({ data, subject });
};
