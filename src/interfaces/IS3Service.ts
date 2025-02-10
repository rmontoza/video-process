export interface IS3Service {
  uploadFile(key: string, body: Buffer): Promise<AWS.S3.ManagedUpload.SendData>;
  moveFile(sourceKey: string, destinationKey: string): Promise<void>;
  listNewFiles(): Promise<AWS.S3.ObjectList>;
  fileExists(key: string): Promise<boolean>;
  downloadFile(key: string): Promise<Buffer>;
  createProcessingLock(key: string): Promise<boolean>;
  removeProcessingLock(key: string): Promise<void>;
  getFileMetadata(key: string): Promise<{ [key: string]: string }>;
  getFileDownloadUrl(key: string):  Promise<string>;
}