export interface IProcessingService {
  processFile(fileKey: string): Promise<void>;
}
