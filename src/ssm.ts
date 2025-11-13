import { SSMClient, GetParameterCommand, GetParametersCommand } from "@aws-sdk/client-ssm";

export class SSMUtils { 
  private client: SSMClient;

  constructor(region?: string) {
    this.client = new SSMClient({
      region: region || 'us-east-1',
    });
  }

  /**
   * Retrieve a parameter value from AWS SSM Parameter Store
   * @param paramName Name of the SSM parameter
   * @returns Promise resolving to the parameter value as a string
   * @throws Error if the parameter cannot be retrieved
   */
  async getParameter(paramName: string): Promise<string> {
    try {
      const command = new GetParameterCommand({
        Name: paramName,
        WithDecryption: true,
      });
      const response = await this.client.send(command);
      if (!response.Parameter || !response.Parameter.Value) {
        throw new Error(`Parameter ${paramName} not found or has no value`);
      }
      return response.Parameter.Value;
    } catch (error) {
      throw new Error(`Failed to retrieve parameter ${paramName}: ${error}`);
    }
  }

  /**
   * Get a set of paramaters from AWS SSM Parameter Store
   * @param paramNames Array of parameter names to retrieve
   * @returns Promise resolving to a map of parameter names to their values
   * @throws Error if any parameter cannot be retrieved
   */
  async getParameters(paramNames: string[]): Promise<Record<string, string>> {
    const params: Record<string, string> = {};
    try {
      const command = new GetParametersCommand({
        Names: paramNames,
        WithDecryption: true,
      });
      const response = await this.client.send(command);
      if (response.InvalidParameters && response.InvalidParameters.length > 0) {
        throw new Error(`Invalid parameters: ${response.InvalidParameters.join(", ")}`);
      }
      if (response.Parameters) {
        for (const parameter of response.Parameters) {
          if (parameter.Name && parameter.Value) {
            params[parameter.Name] = parameter.Value;
          }
        }
      }
      return params;
    } catch (error) {
      throw new Error(`Failed to retrieve parameters: ${error}`);
    }
  }
}