import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MetroAPI } from './metro.js';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MetroAPI', () => {
  const API_KEY = 'test-api-key';
  let metroApi: MetroAPI;

  beforeEach(() => {
    metroApi = new MetroAPI(API_KEY);
    vi.clearAllMocks();
  });

  describe('getLines', () => {
    const mockLinesResponse = {
      data: {
        Lines: [
          {
            DisplayName: "Red",
            EndStationCode: "B11",
            InternalDestination1: "A11",
            InternalDestination2: "B08",
            LineCode: "RD",
            StartStationCode: "A15"
          },
          {
            DisplayName: "Blue",
            EndStationCode: "G05",
            InternalDestination1: "",
            InternalDestination2: "",
            LineCode: "BL",
            StartStationCode: "J03"
          }
        ]
      }
    };

    it('should fetch lines successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockLinesResponse);

      const lines = await metroApi.getLines();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.wmata.com/Rail.svc/json/jLines',
        { headers: { 'api_key': API_KEY } }
      );
      expect(lines).toEqual(mockLinesResponse.data.Lines);
      expect(lines).toHaveLength(2);
      expect(lines[0].DisplayName).toBe('Red');
      expect(lines[1].LineCode).toBe('BL');
    });

    it('should use HTTP when specified', async () => {
      const httpMetroApi = new MetroAPI(API_KEY, false);
      mockedAxios.get.mockResolvedValueOnce(mockLinesResponse);

      await httpMetroApi.getLines();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://api.wmata.com/Rail.svc/json/jLines',
        { headers: { 'api_key': API_KEY } }
      );
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Network Error';
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));
      mockedAxios.isAxiosError.mockReturnValueOnce(true);

      await expect(metroApi.getLines()).rejects.toThrow(`Failed to fetch Metro lines: ${errorMessage}`);
    });

    it('should handle non-axios errors', async () => {
      const error = new Error('Unknown error');
      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValueOnce(false);

      await expect(metroApi.getLines()).rejects.toThrow(error);
    });
  });
});