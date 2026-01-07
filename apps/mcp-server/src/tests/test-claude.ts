// FILE IS AI GENERATED FOR THE SAKE OF TESTING.

import dotenv from 'dotenv';
dotenv.config();

import { ClaudeService } from '../services/claude.service.js';

const claudeService = new ClaudeService();

const sampleCode = `
function calculateSum(a: number, b: number): number {
  return a + b;
}

class Calculator {
  add(x: number, y: number): number {
    return x + y;
  }

  subtract(x: number, y: number): number {
    return x - y;
  }
}
`;

async function testTextAnalysis() {
  console.log('Testing analyseCode (text response)...\n');

  try {
    const result = await claudeService.analyseCode(
      'Analyse this TypeScript code and describe what it does:',
      sampleCode
    );

    console.log('✓ Text analysis successful');
    console.log('Response:', result.substring(0, 200) + '...\n');
  } catch (error) {
    console.error('✗ Text analysis failed:', error);
    throw error;
  }
}

async function testStructuredAnalysis() {
  console.log('Testing analyseCodeStructured (JSON response)...\n');

  const schema = {
    functions: [
      {
        name: 'string',
        parameters: ['string'],
        returnType: 'string',
      },
    ],
    classes: [
      {
        name: 'string',
        methods: [
          {
            name: 'string',
            parameters: ['string'],
            returnType: 'string',
          },
        ],
      },
    ],
  };

  try {
    const result = await claudeService.analyseCodeStructured<typeof schema>(
      'Extract all functions and classes from this code:',
      sampleCode,
      JSON.stringify(schema, null, 2)
    );

    console.log('✓ Structured analysis successful');
    console.log('Parsed JSON:', JSON.stringify(result, null, 2));
    console.log('\nValidation:');
    console.log('- Has functions array:', Array.isArray(result.functions));
    console.log('- Has classes array:', Array.isArray(result.classes));
  } catch (error) {
    console.error('✗ Structured analysis failed:', error);
    throw error;
  }
}

async function main() {
  console.log('=== Claude Service Test ===\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY not set in environment');
    process.exit(1);
  }

  try {
    await testTextAnalysis();
    await testStructuredAnalysis();

    console.log('\n=== All tests passed ✓ ===');
  } catch (error) {
    console.error('\n=== Tests failed ✗ ===');
    process.exit(1);
  }
}

main();
