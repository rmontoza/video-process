import { IProcessingService } from '../../interfaces/IProcessingService';
import { IS3Service } from '../../interfaces/IS3Service';
import { EmailService } from './EmailService';
import { SQSService } from './SQSService';
import { CacheService } from './CacheService';
import { CognitoService } from './CognitoService';
import ffmpeg from 'fluent-ffmpeg';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { tmpdir } from 'os';
import { writeFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

export class ProcessingService implements IProcessingService {
  private s3Service: IS3Service;
  private emailService: EmailService;
  private sqsService: SQSService;
  private cacheService: CacheService;
  private cognitoService: CognitoService;

  constructor(s3Service: IS3Service, sqsService: SQSService, cacheService: CacheService, cognitoService: CognitoService) {
    this.s3Service = s3Service;
    this.emailService = new EmailService();
    this.sqsService = sqsService;
    this.cacheService = cacheService;
    this.cognitoService = cognitoService;
  }

  public async processFile(fileKey: string): Promise<void> {
    console.log(`🎥 Iniciando processamento do arquivo: ${fileKey}`);

    try {
      // 🔹 Recuperar userId do Redis
      const userId = await this.cacheService.getUserId(fileKey);
      if (!userId) {
        console.warn(`⚠️ userId não encontrado no cache para ${fileKey}, usando 'unknown'`);
      }

      const videoBuffer = await this.s3Service.downloadFile(fileKey);
      const extractedImages: Buffer[] = await this.extractFrames(videoBuffer);
      const zipBuffer = await this.createZip(extractedImages);

      const zipKey = `zip/${fileKey.split('.')[0].replace('video/', '')}.zip`;
      await this.s3Service.uploadFile(zipKey, zipBuffer);

      const processedKey = `process/${fileKey.replace('video/', '')}`;
      await this.s3Service.moveFile(fileKey, processedKey);
      console.log(`✅ Arquivo ${fileKey} movido para a pasta 'process' e ZIP salvo em 'zip/'`);

      // 🔹 Buscar e-mail do usuário no Cognito
      const userEmail = await this.cognitoService.getUserEmail(userId || 'unknown');

      // 🔹 Enviar mensagem para a fila SQS informando que o processamento foi finalizado
      await this.sqsService.sendMessage(userId || 'unknown', fileKey, 'FINALIZADO');

      // 🔔 Enviar e-mail de notificação
      if (userEmail) {
        console.log(`📩 Enviando e-mail para ${userEmail}...`);
        const downloadUrl = await this.s3Service.getFileDownloadUrl(zipKey);
        await this.emailService.sendEmail(
          userEmail,
          'Processamento Concluído',
          `O processamento do seu vídeo (${fileKey}) foi concluído. Você pode baixar o arquivo processado em: ${downloadUrl}`
        );
        console.log(`✅ E-mail enviado para ${userEmail}`);
      } else {
        console.warn(`⚠️ Nenhum e-mail encontrado para ${fileKey}, notificação por e-mail não enviada.`);
      }

      // 🔹 Remover userId do cache após processamento
      await this.cacheService.removeUserId(fileKey);
    } catch (error) {
      console.error(`❌ Erro no processamento do arquivo ${fileKey}:`, error);
    }
  }
  private async extractFrames(videoBuffer: Buffer): Promise<Buffer[]> {
    const tempDir = join(tmpdir(), `frames_${Date.now()}`);
    mkdirSync(tempDir);
    const tempFilePath = join(tmpdir(), `temp_video_${Date.now()}.mp4`);

    // Salvar o buffer como um arquivo temporário
    writeFileSync(tempFilePath, videoBuffer);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(tempFilePath)
        .output(join(tempDir, '%d.png'))
        .outputOptions('-vf', 'fps=1')
        .on('end', () => {
          const frameFiles = readdirSync(tempDir).map((file) => readFileSync(join(tempDir, file)));
          rmSync(tempDir, { recursive: true, force: true });
          resolve(frameFiles);
        })
        .on('error', (err: Error) => {
          rmSync(tempDir, { recursive: true, force: true });
          reject(err);
        });

      command.run();
    });
  }

  private async createZip(files: Buffer[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip');
      const zipBuffer: Buffer[] = [];
      const stream = new PassThrough();

      stream.on('data', (chunk) => zipBuffer.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(zipBuffer)));
      stream.on('error', (err: Error) => reject(err));

      archive.pipe(stream);
      files.forEach((file, index) => archive.append(file, { name: `${index}.png` }));
      archive.finalize();
    });
  }
}
