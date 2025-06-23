import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  try {
    // Create reusable transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        ciphers: 'SSLv3'
      },
      // Force IPv4
      family: 4
    });

    // Verify connection configuration
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      throw new Error('SMTP connection verification failed');
    }

    const mailOptions = {
      from: `"Motion Clinic" <${process.env.SMTP_MAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.message,
    };

    console.log("Attempting to send email to:", options.email);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}; 