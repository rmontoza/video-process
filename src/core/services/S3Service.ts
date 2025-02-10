import AWS from 'aws-sdk';
import { IS3Service } from '../../interfaces/IS3Service';

export class S3Service implements IS3Service {
  private s3: AWS.S3;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
  }

  public async uploadFile(key: string, body: Buffer): Promise<AWS.S3.ManagedUpload.SendData> {
    try {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: body,
      };

      return await this.s3.upload(params).promise();
    } catch (error) {
      console.error(`Erro ao fazer upload do arquivo ${key}:`, error);
      throw error;
    }
  }

  public async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.s3.copyObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        CopySource: `${process.env.AWS_S3_BUCKET_NAME!}/${sourceKey}`,
        Key: destinationKey,
      }).promise();

      await this.s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: sourceKey,
      }).promise();

      console.log(`Arquivo movido de ${sourceKey} para ${destinationKey}`);
    } catch (error) {
      console.error(`Erro ao mover o arquivo ${sourceKey} para ${destinationKey}:`, error);
      throw error;
    }
  }

  public async listNewFiles(): Promise<AWS.S3.ObjectList> {
    try {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Prefix: 'video/' // Monitorar apenas a pasta "video"
      };

      const data = await this.s3.listObjectsV2(params).promise();
      const videoExtensions = ['.mp4', '.mkv', '.avi'];

      return (data.Contents || []).filter((file) => {
        if (!file.Key) return false;
        const lowerKey = file.Key.toLowerCase();
        return videoExtensions.some((ext) => lowerKey.endsWith(ext));
      });
    } catch (error) {
      console.error('Erro ao listar arquivos do S3:', error);
      return [];
    }
  }

  public async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
      }).promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  public async downloadFile(key: string): Promise<Buffer> {
    try {
      const exists = await this.fileExists(key);
      if (!exists) {
        throw new Error(`Arquivo não encontrado: ${key}`);
      }
      const params = { Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: key };
      const data = await this.s3.getObject(params).promise();
      return data.Body as Buffer;
    } catch (error) {
      console.error(`Erro ao baixar arquivo ${key}:`, error);
      throw error;
    }
  }

  public async createProcessingLock(key: string): Promise<boolean> {
    const lockKey = `processing/${key}.lock`;
    try {
      await this.s3.headObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: lockKey,
      }).promise();
      return false;
    } catch (error) {
      try {
        await this.s3.putObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: lockKey,
          Body: '',
        }).promise();
        return true;
      } catch (err) {
        console.error(`Erro ao criar lock para o arquivo ${key}:`, err);
        return false;
      }
    }
  }

  public async removeProcessingLock(key: string): Promise<void> {
    const lockKey = `processing/${key}.lock`;
    try {
      await this.s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: lockKey,
      }).promise();
    } catch (error) {
      console.error(`Erro ao remover lock para o arquivo ${key}:`, error);
    }
  }

  public async getFileMetadata(key: string): Promise<{ [key: string]: string }> {
    try {
      return { email: process.env.SENDER_EMAIL || '' };
    } catch (error) {
      console.error(`Erro ao obter metadados do arquivo ${key}:`, error);
      return {};
    }
  }

  public async getFileDownloadUrl(key: string): Promise<string> {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Expires: 300, // Link válido por 5 minutos
    };
    return this.s3.getSignedUrlPromise('getObject', params);
  }
}
