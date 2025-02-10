import AWS from 'aws-sdk';

export class CognitoService {
  private cognito: AWS.CognitoIdentityServiceProvider;
  private userPoolId: string;

  constructor() {
    this.cognito = new AWS.CognitoIdentityServiceProvider({ region: process.env.AWS_REGION });
    this.userPoolId = process.env.COGNITO_USER_POOL_ID || '';
  }

  public async getUserEmail(userId: string): Promise<string | null> {
    try {
      const params = {
        UserPoolId: this.userPoolId,
        Username: userId,
      };

      const response = await this.cognito.adminGetUser(params).promise();
      const emailAttribute = response.UserAttributes?.find(attr => attr.Name === 'email');
      return emailAttribute ? emailAttribute.Value || null : null;
    } catch (error) {
      console.error(`❌ Erro ao buscar e-mail no Cognito para userId ${userId}:`, error);
      return null;
    }
  }
}
