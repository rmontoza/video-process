import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

export class SQSService {
  private sqs: AWS.SQS;
  private queueUrl: string;

  constructor() {
    this.sqs = new AWS.SQS({ region: process.env.AWS_REGION });
    this.queueUrl = process.env.SQS_VIDEO_UPDATE_URL || '';
  }

  public async sendMessage(userId: string, fileId: string, status: string): Promise<void> {
    try {
      const messageBody = JSON.stringify({ userId, fileId, status });

      const params: AWS.SQS.SendMessageRequest = {
        QueueUrl: this.queueUrl,
        MessageBody: messageBody,
      };

      await this.sqs.sendMessage(params).promise();
      console.log(`📩 Mensagem enviada para a fila SQS: ${messageBody}`);
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem para a fila SQS:', error);
    }
  }
}
