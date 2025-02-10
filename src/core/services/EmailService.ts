import AWS from 'aws-sdk';

export class EmailService {
  private ses: AWS.SES;
  private senderEmail: string;

  constructor() {
    this.ses = new AWS.SES({
      region: process.env.AWS_REGION, // Defina a região do SES
    });

    this.senderEmail = process.env.SENDER_EMAIL!; // E-mail autorizado no SES
  }

  public async sendEmail(toEmail: string, subject: string, body: string): Promise<void> {
    try {
      const params = {
        Source: this.senderEmail,
        Destination: {
          ToAddresses: [toEmail],
        },
        Message: {
          Subject: {
            Data: subject,
          },
          Body: {
            Text: {
              Data: body,
            },
          },
        },
      };

      await this.ses.sendEmail(params).promise();
      console.log(`E-mail enviado para ${toEmail}`);
    } catch (error) {
      console.error(`Erro ao enviar e-mail para ${toEmail}:`, error);
    }
  }
}
