import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, code: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: "Dabba <onboarding@resend.dev>", // You can use your own domain later
      to: [email],
      subject: "Verify your Dabba account",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #FF3C00; text-align: center;">Welcome to Dabba!</h2>
          <p>The warmth of ghar ka khana is just one step away.</p>
          <p>Please use the following 6-digit code to verify your email address:</p>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #FF3C00; border-radius: 8px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666; text-align: center;">
            &copy; ${new Date().getFullYear()} Dabba. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Resend execution error:", err);
    return { success: false, error: err };
  }
}
