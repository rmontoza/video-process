import dotenv from 'dotenv';
dotenv.config();

import { S3Service } from '../core/services/S3Service';
import { ProcessingService } from '../core/services/ProcessingService';
import { S3Listener } from '../adapters/listeners/S3Listener';
import { SQSService } from '../core/services/SQSService';
import { CacheService } from '../core/services/CacheService';
import { CognitoService } from '../core/services/CognitoService';

// 🔹 Inicializando serviços
const s3Service = new S3Service();
const sqsService = new SQSService();
const cacheService = new CacheService();
const cognitoService = new CognitoService();
const processingService = new ProcessingService(s3Service, sqsService, cacheService, cognitoService);
const s3Listener = new S3Listener(s3Service, processingService);

(async () => {
  console.log('🚀 Serviço de Processamento iniciado...');
  await s3Listener.monitorBucket();
})();
