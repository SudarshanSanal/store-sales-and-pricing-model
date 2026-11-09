import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const otpStr = crypto.randomInt(100000, 1000000).toString();
console.log('[OTP TEST] Generated OTP:', otpStr, '(length:', otpStr.length, ')');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
  <h2 style="color: #4f46e5; text-align: center;">SV Forecast AI</h2>
  <h3 style="text-align: center; color: #333;">Verify Your Email Address</h3>
  <p style="color: #666; font-size: 14px;">Your 6-digit OTP verification code:</p>
  <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
    <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #111827; font-family: monospace;">${otpStr}</span>
  </div>
  <p style="color: #4f46e5; font-size: 18px; text-align: center; font-weight: bold;">Code: ${otpStr}</p>
  <p style="color: #999; font-size: 12px; text-align: center;">Expires in 10 minutes. Do not share this code.</p>
</div>
`;

// Also provide a plain-text fallback with the OTP clearly visible
const textContent = `SV Forecast AI — Email Verification

Your 6-digit OTP code is: ${otpStr}

This code expires in 10 minutes.
Do not share this code with anyone.`;

console.log('[OTP TEST] Sending diagnostic email with OTP:', otpStr);

transporter.sendMail({
  from: `"SV Forecast AI" <${process.env.SMTP_USER}>`,
  to: process.env.SMTP_USER,
  subject: `SV Forecast AI — OTP Test (code is ${otpStr})`,
  text: textContent,
  html: htmlContent
}, (err, info) => {
  if (err) {
    console.error('[OTP TEST] ✗ Send FAILED:', err.message);
  } else {
    console.log('[OTP TEST] ✓ Email sent! messageId:', info.messageId);
    console.log('[OTP TEST] Subject includes OTP for easy verification.');
    console.log('[OTP TEST] Check both HTML and plain-text in your inbox.');
  }
  process.exit(0);
});
