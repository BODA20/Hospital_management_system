import nodemailer from 'nodemailer';

type UserEmail = {
  email: string;
  name?: string;
};

export class Email {
  private to: string;
  private firstName: string;
  private url: string;
  private from: string;

  constructor(user: UserEmail, url: string) {
    this.to = user.email;
    this.firstName = (user.name || '').split(' ')[0] || 'User';
    this.url = url;
    this.from = `Hospital System <${process.env.EMAIL_FROM}>`;
  }

  private newTransport() {
    // Production → SendGrid
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    }

    // Development → Mailtrap
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT) || 2525,
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  private buildHTML(subject: string, message: string) {
    return `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2>${subject}</h2>
        <p>Hello ${this.firstName},</p>

        <p>${message}</p>

        <p>
          <a href="${this.url}"
            style="
              display:inline-block;
              padding:10px 20px;
              background:#007bff;
              color:white;
              text-decoration:none;
              border-radius:6px
            ">
            Continue
          </a>
        </p>

        <p style="color:#666;font-size:12px">
          If you didn't request this action, please ignore this email.
        </p>

        <hr/>

        <p style="font-size:12px;color:#999">
          Hospital Management System
        </p>
      </div>
    `;
  }

  private async send(subject: string, message: string) {
    const transporter = this.newTransport();

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text: `${message}\n\n${this.url}`,
      html: this.buildHTML(subject, message),
    };

    await transporter.sendMail(mailOptions);
  }

  async sendVerification() {
    await this.send(
      'Verify your email',
      'Please click the button below to verify your email address. This link is valid for 24 hours.',
    );
  }

  async sendPasswordReset() {
    await this.send(
      'Reset your password',
      'Click the button below to reset your password. This link is valid for 10 minutes.',
    );
  }

  async sendEmailChangeVerification() {
    await this.send(
      'Confirm your new email',
      'Click the button below to confirm your new email address.',
    );
  }
}
