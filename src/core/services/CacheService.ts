import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export class CacheService {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => console.error('❌ Erro no Redis:', err));
    this.client.connect().then(() => console.log('✅ Conectado ao Redis.'));
  }

  public async setUserId(fileKey: string, userId: string): Promise<void> {
    try {
      await this.client.set(fileKey, userId, {
        EX: 3600, // 🔹 Expira em 1 hora para evitar lixo no cache
      });
      console.log(`🔹 userId armazenado no cache para ${fileKey}: ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao armazenar userId no Redis:', error);
    }
  }

  public async getUserId(fileKey: string): Promise<string | null> {
    try {
      const userId = await this.client.get(fileKey);
      console.log(`🔹 userId recuperado do cache para ${fileKey}: ${userId}`);
      return userId;
    } catch (error) {
      console.error('❌ Erro ao recuperar userId do Redis:', error);
      return null;
    }
  }

  public async removeUserId(fileKey: string): Promise<void> {
    try {
      await this.client.del(fileKey);
      console.log(`🗑️ userId removido do cache para ${fileKey}`);
    } catch (error) {
      console.error('❌ Erro ao remover userId do Redis:', error);
    }
  }
}
