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
  apiGatewayUrl?: string;
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
      // Step 1: Create the Lambda function with code
      logger.info('Step 1: Creating Lambda function', {
        component: 'LambdaAutomationService',
        data: { functionName: config.functionName }
      });

      const createResponse = await fetch(`${this.baseUrl}/api/lambda/functions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName: config.functionName,
          runtime: config.runtime,
          handler: config.handler,
          code: config.code,
          memory: config.memorySize,
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

      logger.info('Lambda function created, waiting for ready state', {
        component: 'LambdaAutomationService',
        data: { functionName: config.functionName, functionArn }
      });

      // Step 2: Wait for function to be ready
      await this.waitForFunctionReady(config.functionName);

      logger.info('Lambda function is ready, creating function URL', {
        component: 'LambdaAutomationService',
        data: { functionName: config.functionName }
      });

      // Step 3: Create function URL
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
        logger.info('Function URL created successfully', {
          component: 'LambdaAutomationService',
          data: { functionName: config.functionName, functionUrl }
        });
      } else {
        logger.warn('Failed to create function URL', {
          component: 'LambdaAutomationService',
          data: { functionName: config.functionName, status: urlResponse.status }
        });
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
  private async waitForFunctionReady(functionName: string, maxAttempts: number = 15): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/lambda/${functionName}`);
        if (response.ok) {
          const data = await response.json();
          const state = data.function?.Configuration?.State;
          logger.info(`Function state check attempt ${attempt}`, {
            component: 'LambdaAutomationService',
            data: { functionName, state, attempt }
          });
          
          if (state === 'Active') {
            logger.info('Function is now active', {
              component: 'LambdaAutomationService',
              data: { functionName }
            });
            return;
          } else if (state === 'Failed') {
            throw new Error(`Function ${functionName} creation failed`);
          }
        } else {
          logger.warn(`Function not found on attempt ${attempt}`, {
            component: 'LambdaAutomationService',
            data: { functionName, attempt, status: response.status }
          });
        }
      } catch (error) {
        // Ignore errors during polling
        logger.warn(`Attempt ${attempt}: Function not ready yet`, {
          component: 'LambdaAutomationService',
          data: { functionName, attempt, error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
      
      // Wait 1 second before next attempt (reduced from 2 seconds)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Function ${functionName} did not become ready within ${maxAttempts} seconds`);
  }

  /**
   * Generate a unique function name based on namespace and method
   */
  generateFunctionName(namespaceName: string, methodName: string): string {
    const timestamp = Date.now();
    const sanitizedNamespace = namespaceName.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 20);
    const sanitizedMethod = methodName.toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 20);
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

  /**
   * Deploy an existing Lambda function with additional configuration
   */
  async deployLambdaFunction(config: {
    functionName: string;
    environment: string;
    region: string;
    enableFunctionUrl: boolean;
    enableApiGateway: boolean;
    corsEnabled: boolean;
  }): Promise<LambdaAutomationResult> {
    logger.info('Deploying Lambda function', {
      component: 'LambdaAutomationService',
      data: { functionName: config.functionName }
    });

    try {
      let functionUrl = null;
      let apiGatewayUrl = null;

      // Step 1: Create function URL if enabled
      if (config.enableFunctionUrl) {
        const urlResponse = await fetch(`${this.baseUrl}/api/lambda/${config.functionName}/function-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cors: config.corsEnabled ? {
              AllowCredentials: true,
              AllowHeaders: ['*'],
              AllowMethods: ['*'],
              AllowOrigins: ['*'],
              ExposeHeaders: ['*'],
              MaxAge: 86400
            } : undefined
          }),
        });

        if (urlResponse.ok) {
          const urlData = await urlResponse.json();
          functionUrl = urlData.functionUrlConfig?.FunctionUrl;
        }
      }

      // Step 2: Create API Gateway if enabled
      if (config.enableApiGateway) {
        const apiResponse = await fetch(`${this.baseUrl}/api/aws/apigateway`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${config.functionName}-api`,
            description: `API Gateway for ${config.functionName}`,
            lambdaFunctionName: config.functionName,
            corsEnabled: config.corsEnabled
          }),
        });

        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          apiGatewayUrl = apiData.apiUrl;
        }
      }

      // Step 3: Update function configuration for environment
      const updateResponse = await fetch(`${this.baseUrl}/api/lambda/${config.functionName}/configuration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environment: {
            Variables: {
              ENVIRONMENT: config.environment,
              REGION: config.region,
              DEPLOYED_AT: new Date().toISOString()
            }
          }
        }),
      });

      logger.info('Lambda function deployed successfully', {
        component: 'LambdaAutomationService',
        data: {
          functionName: config.functionName,
          functionUrl,
          apiGatewayUrl
        }
      });

      return {
        success: true,
        functionUrl,
        apiGatewayUrl
      };
    } catch (error) {
      logger.error('Error deploying Lambda function', {
        component: 'LambdaAutomationService',
        data: {
          functionName: config.functionName,
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
}

export default LambdaAutomationService.getInstance(); 