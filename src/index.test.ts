import { describe, it, expect } from "vitest";
import { greet } from "./index.js";

describe("greet", () => {
  it("should return greeting with name", () => {
    const result = greet("TypeScript");
    expect(result).toBe("Hello, TypeScript!");
  });
});