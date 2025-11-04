import axios from 'axios';

/**
 * Represents a single Metro line
 */
interface MetroLine {
  /** Full name of line color (e.g., "Red", "Blue") */
  DisplayName: string;
  /** End station code (e.g., "E10" for Greenbelt) */
  EndStationCode: string;
  /** Optional intermediate terminal station code */
  InternalDestination1: string;
  /** Optional second intermediate terminal station code */
  InternalDestination2: string;
  /** Two-letter abbreviation for the line (e.g., "RD", "BL", "YL", "OR", "GR", "SV") */
  LineCode: string;
  /** Start station code (e.g., "F11" for Branch Avenue) */
  StartStationCode: string;
}

/**
 * Response from the Lines API endpoint
 */
interface LinesResponse {
  Lines: MetroLine[];
}

/**
 * Information about a predicted train arrival
 */
interface TrainPrediction {
  /** Number of cars in the train (usually 6 or 8) */
  Car: string;
  /** Abbreviated destination (as shown on station signs) */
  Destination: string;
  /** Station code for the train's destination */
  DestinationCode: string | null;
  /** Full name of the destination station */
  DestinationName: string;
  /** Track number identifier */
  Group: string;
  /** Two-letter line code (RD, BL, YL, OR, GR, SV) */
  Line: string;
  /** Station code where train is arriving */
  LocationCode: string;
  /** Full name of arrival station */
  LocationName: string;
  /** Minutes until arrival ("ARR" = arriving, "BRD" = boarding) */
  Min: string;
}

/**
 * Response from the Predictions API endpoint
 */
interface PredictionsResponse {
  Trains: TrainPrediction[];
}

export class MetroAPI {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  private readonly predictionsBaseUrl: string;

  constructor(apiKey: string, useHttps = true) {
    this.baseUrl = `${useHttps ? 'https' : 'http'}://api.wmata.com/Rail.svc`;
    this.predictionsBaseUrl = `${useHttps ? 'https' : 'http'}://api.wmata.com/StationPrediction.svc`;
    this.apiKey = apiKey;
  }

  /**
   * Get real-time train predictions for one or more stations
   * @param stationCodes Single station code or comma-separated list of codes. Use "All" for all stations.
   * @returns Promise containing array of train predictions
   * @throws Error if the API request fails
   */
  async getPredictions(stationCodes: string): Promise<TrainPrediction[]> {
    try {
      const response = await axios.get<PredictionsResponse>(
        `${this.predictionsBaseUrl}/json/GetPrediction/${stationCodes}`,
        {
          headers: {
            'api_key': this.apiKey
          }
        }
      );
      
      return response.data.Trains;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch train predictions: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get information about all Metro rail lines
   * @returns Promise containing array of Metro lines
   * @throws Error if the API request fails
   */
  async getLines(): Promise<MetroLine[]> {
    try {
      const response = await axios.get<LinesResponse>(`${this.baseUrl}/json/jLines`, {
        headers: {
          'api_key': this.apiKey
        }
      });
      
      return response.data.Lines;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch Metro lines: ${error.message}`);
      }
      throw error;
    }
  }
}

// Example usage:
// const metro = new MetroAPI('your-api-key-here');
// const lines = await metro.getLines();
// console.log(lines);