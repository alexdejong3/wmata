import { MetroAPI } from './metro.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const API_KEY = process.env.WMATA_API_KEY;

if (!API_KEY) {
  console.error('Please set WMATA_API_KEY in your .env file');
  process.exit(1);
}

async function displayRealTimePredictions(stationCode: string) {
  const metro = new MetroAPI(API_KEY as string);
  
  try {
    console.log(`Fetching real-time predictions for station ${stationCode}...\n`);
    const predictions = await metro.getPredictions(stationCode);
    
    if (predictions.length === 0) {
      console.log('No trains currently predicted for this station.');
      return;
    }

    // Group predictions by line
    const byLine = predictions.reduce((acc, train) => {
      const line = train.Line || 'NO LINE';
      if (!acc[line]) acc[line] = [];
      acc[line].push(train);
      return acc;
    }, {} as Record<string, typeof predictions>);

    console.log('Real-time Train Predictions');
    console.log('=========================\n');

    // Display location info from first prediction
    console.log(`Station: ${predictions[0].LocationName}\n`);

    // Format helpers
    const formatCell = (text: string, width: number) => text.padEnd(width, ' ');
    const formatTime = (min: string) => {
      if (min === 'ARR') return 'Arriving';
      if (min === 'BRD') return 'Boarding';
      if (min === '') return '---';
      return `${min} min`;
    };

    // Print predictions grouped by line
    for (const [line, trains] of Object.entries(byLine)) {
      console.log(`${line} Line Trains:`);
      
      // Header
      console.log(
        formatCell('Time', 12) +
        formatCell('Destination', 25) +
        formatCell('Cars', 6) +
        'Track'
      );
      console.log('─'.repeat(50));

      // Sort trains by arrival time (handling special cases)
      const sortTrains = (a: string, b: string) => {
        if (a === 'ARR') return -1;
        if (b === 'ARR') return 1;
        if (a === 'BRD') return -1;
        if (b === 'BRD') return 1;
        return Number(a) - Number(b);
      };

      trains
        .sort((a, b) => sortTrains(a.Min, b.Min))
        .forEach(train => {
          console.log(
            formatCell(formatTime(train.Min), 12) +
            formatCell(train.DestinationName, 25) +
            formatCell(train.Car || '--', 6) +
            train.Group
          );
        });
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function displayMetroLines() {
  // We can safely assert API_KEY is string here since we checked above
  const metro = new MetroAPI(API_KEY as string);
  
  try {
    console.log('Fetching Metro lines...\n');
    const lines = await metro.getLines();
    
    // Display all lines in a formatted table
    console.log('Metro Lines Information:');
    console.log('======================\n');
    
    const formatLine = (line: string, length: number) => 
      line.padEnd(length, ' ');
    
    // Print header
    console.log(
      formatLine('Line Name', 15) +
      formatLine('Code', 8) +
      formatLine('Start Station', 15) +
      'End Station'
    );
    console.log('─'.repeat(55));

    // Print each line's information
    for (const line of lines) {
      console.log(
        formatLine(line.DisplayName, 15) +
        formatLine(line.LineCode, 8) +
        formatLine(line.StartStationCode, 15) +
        line.EndStationCode
      );
    }

    console.log('\nDetailed Line Information:');
    console.log('========================\n');

    // Print detailed information for each line
    for (const line of lines) {
      console.log(`${line.DisplayName} Line (${line.LineCode}):`);
      console.log(`  • Runs from station ${line.StartStationCode} to ${line.EndStationCode}`);
      
      if (line.InternalDestination1 || line.InternalDestination2) {
        console.log('  • Intermediate terminals:');
        if (line.InternalDestination1) {
          console.log(`    - ${line.InternalDestination1}`);
        }
        if (line.InternalDestination2) {
          console.log(`    - ${line.InternalDestination2}`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the examples
await displayMetroLines();
console.log('\n' + '='.repeat(60) + '\n');

// Show real-time predictions for Union Station (B03)
await displayRealTimePredictions('B03');