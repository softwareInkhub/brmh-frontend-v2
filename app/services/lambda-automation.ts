import { logger } from '@/app/utils/logger';

export interface LambdaAutomationConfig {
  functionName: string;
  runtime: string;
  handler: string;
  code: string;
  memorySize: number;
  timeout: number;
  environment: Record<string, string>;
}

export interface LambdaAutomationResult {
  success: boolean;
  functionArn?: string;
  functionUrl?: string;
  error?: string;
}

export class LambdaAutomationService {
  private static instance: LambdaAutomationService;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_AWS_URL || 'http://localhost:3000';
  }

  static getInstance(): LambdaAutomationService {
    if (!LambdaAutomationService.instance) {
      LambdaAutomationService.instance = new LambdaAutomationService();
    }
    return LambdaAutomationService.instance;
  }

  /**
   * Create a Lambda function with the provided configuration
   */
  async createLambdaFunction(config: LambdaAutomationConfig): Promise<LambdaAutomationResult> {
    logger.info('Creating Lambda function', {
      component: 'LambdaAutomationService',
      data: { functionName: config.functionName }
    });

    try {
      // Step 1: Create the Lambda function
      const createResponse = await fetch(`${this.baseUrl}/api/aws/lambda`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: config.functionName,
          runtime: config.runtime,
          handler: config.handler,
          memorySize: config.memorySize,
          timeout: config.timeout,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        logger.error('Failed to create Lambda function', {
          component: 'LambdaAutomationService',
          data: {
            status: createResponse.status,
            error: errorData
          }
        });
        throw new Error(errorData.message || 'Failed to create Lambda function');
      }

      const createData = await createResponse.json();
      const functionArn = createData.functionArn;

      // Step 2: Wait for function to be ready
      await this.waitForFunctionReady(config.functionName);

      // Step 3: Update function code
      await this.updateFunctionCode(config.functionName, config.code);

      // Step 4: Create function URL
      const urlResponse = await fetch(`${this.baseUrl}/api/lambda/${config.functionName}/function-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let functionUrl = null;
      if (urlResponse.ok) {
        const urlData = await urlResponse.json();
        functionUrl = urlData.functionUrlConfig?.FunctionUrl;
      }

      logger.info('Lambda function created successfully', {
        component: 'LambdaAutomationService',
        data: {
          functionName: config.functionName,
          functionArn,
          functionUrl
        }
      });

      return {
        success: true,
        functionArn,
        functionUrl
      };
    } catch (error) {
      logger.error('Error creating Lambda function', {
        component: 'LambdaAutomationService',
        data: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Wait for Lambda function to be ready
   */
  private async waitForFunctionReady(functionName: string, maxAttempts: number = 30): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/lambda/${functionName}`);
        if (response.ok) {
          const data = await response.json();
          if (data.function?.Configuration?.State === 'Active') {
            return;
          }
        }
      } catch (error) {
        // Ignore errors during polling
      }
      
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Function ${functionName} did not become ready within ${maxAttempts * 2} seconds`);
  }

  /**
   * Update Lambda function code
   */
  private async updateFunctionCode(functionName: string, code: string): Promise<void> {
    try {
      // Create a ZIP file with the code
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      zip.file('index.js', code);
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const formData = new FormData();
      formData.append('file', new File([zipBlob], 'lambda.zip', { type: 'application/zip' }));

      const response = await fetch(`${this.baseUrl}/api/lambda/${functionName}/code`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update function code');
      }
    } catch (error) {
      logger.error('Error updating function code', {
        component: 'LambdaAutomationService',
        data: {
          functionName,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Generate a unique function name based on namespace and method
   */
  generateFunctionName(namespaceName: string, methodName: string): string {
    const timestamp = Date.now();
    const sanitizedNamespace = namespaceName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const sanitizedMethod = methodName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `${sanitizedNamespace}-${sanitizedMethod}-${timestamp}`;
  }

  /**
   * Generate default Lambda configuration
   */
  generateDefaultConfig(
    functionName: string, 
    code: string, 
    namespaceName: string, 
    methodName: string
  ): LambdaAutomationConfig {
    return {
      functionName,
      runtime: 'nodejs18.x',
      handler: 'index.handler',
      code,
      memorySize: 128,
      timeout: 30,
      environment: {
        NAMESPACE: namespaceName,
        METHOD: methodName,
        REGION: process.env.AWS_REGION || 'us-east-1'
      }
    };
  }

  /**
   * Complete automation workflow: Create Lambda function and return URL
   */
  async automateLambdaCreation(
    schemaData: any, 
    namespaceName: string, 
    methodName: string
  ): Promise<LambdaAutomationResult> {
    try {
      // Generate function name
      const functionName = this.generateFunctionName(namespaceName, methodName);
      
      // Extract Lambda handler code from schema data
      const lambdaCode = schemaData.lambdaHandler || this.generateDefaultHandler(functionName);
      
      // Generate configuration
      const config = this.generateDefaultConfig(functionName, lambdaCode, namespaceName, methodName);
      
      // Create the function
      return await this.createLambdaFunction(config);
    } catch (error) {
      logger.error('Error in Lambda automation workflow', {
        component: 'LambdaAutomationService',
        data: {
          namespaceName,
          methodName,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate default Lambda handler code
   */
  private generateDefaultHandler(functionName: string): string {
    return `exports.handler = async (event) => {
  try {
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Hello from ${functionName}',
        timestamp: new Date().toISOString(),
        event: event,
        environment: {
          NAMESPACE: process.env.NAMESPACE,
          METHOD: process.env.METHOD,
          REGION: process.env.REGION
        }
      })
    };
    return response;
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};`;
  }
}

export default LambdaAutomationService.getInstance(); 