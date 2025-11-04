/**
 * Example TypeScript Node.js application entry point
 */

export function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Run if this file is executed directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  console.log(greet("world"));
}