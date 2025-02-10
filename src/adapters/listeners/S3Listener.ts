import { IS3Service } from '../../interfaces/IS3Service';
import { IProcessingService } from '../../interfaces/IProcessingService';

export class S3Listener {
  private s3Service: IS3Service;
  private processingService: IProcessingService;

  constructor(s3Service: IS3Service, processingService: IProcessingService) {
    this.s3Service = s3Service;
    this.processingService = processingService;
  }

  public async monitorBucket(): Promise<void> {
    while (true) {
      try {
        console.log('Consultando o bucket por novos arquivos na pasta "video"...');
        const files = await this.s3Service.listNewFiles();
        console.log(`Arquivos encontrados: ${files.map(file => file.Key).join(', ')}`);
  
        // Filtra apenas arquivos que ainda não foram bloqueados por outro pod
        const unlockedFiles: string[] = [];
  
        for (const file of files) {
          if (file.Key) {
            const locked = await this.s3Service.createProcessingLock(file.Key);
            if (locked) {
              unlockedFiles.push(file.Key);
              if (unlockedFiles.length >= 4) break; // Pega no máximo 4 arquivos para este pod
            }
          }
        }
  
        console.log(`Arquivos atribuídos a este pod: ${unlockedFiles.join(', ')}`);
  
        // Processamento concorrente de até 4 arquivos ao mesmo tempo
        await Promise.allSettled(
          unlockedFiles.map(async (fileKey) => {
            try {
              console.log(`Processando arquivo: ${fileKey}`);
              await this.processingService.processFile(fileKey);
              console.log(`Arquivo processado com sucesso: ${fileKey}`);
            } catch (error) {
              console.error(`Erro ao processar arquivo ${fileKey}:`, error);
            } finally {
              await this.s3Service.removeProcessingLock(fileKey);
            }
          })
        );
      } catch (error) {
        console.error('Erro ao consultar o bucket S3:', error);
      }
  
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Pausa de 5 segundos entre verificações
    }
  }
  
  
}