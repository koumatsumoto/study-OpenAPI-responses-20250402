import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import * as mainModule from "../src/main.mts";

vi.mock("fs/promises");
vi.mock("path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
  },
}));

const mockTerm = {
  number: "1.1",
  name: "acceptance criteria",
  definitions: [
    {
      text: "A set of conditions that a product must satisfy to be accepted by a user, customer, or other stakeholder.",
    },
  ],
};

const mockTerms = [mockTerm];

describe("Term Data Processing", () => {
  it("should convert term data correctly", () => {
    const result = (mainModule as any).convertTermData(mockTerm);
    expect(result).toEqual({
      number: "1.1",
      name: "acceptance criteria",
      definitions:
        "A set of conditions that a product must satisfy to be accepted by a user, customer, or other stakeholder.",
    });
  });

  it("should convert terms to JSONL format", () => {
    const result = (mainModule as any).convertTermsToJSONL(mockTerms);
    const expectedJson = JSON.stringify({
      number: "1.1",
      name: "acceptance criteria",
      definitions:
        "A set of conditions that a product must satisfy to be accepted by a user, customer, or other stakeholder.",
    });
    expect(result).toBe(expectedJson);
  });

  it("should split terms into chunks", () => {
    const manyTerms = Array(150).fill(mockTerm);
    const result = (mainModule as any).splitTermsIntoChunks(manyTerms);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(100);
    expect(result[1]).toHaveLength(50);
  });

  it("should generate API requests correctly", () => {
    const chunks = [[mockTerm]];
    const result = (mainModule as any).generateApiRequests(chunks);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      custom_id: "req-1",
      method: "POST",
      url: "/v1/responses",
      body: {
        model: "o3-mini",
        input: [
          {
            role: "system",
            content: expect.any(String),
          },
          {
            role: "user",
            content: expect.stringContaining("acceptance criteria"),
          },
        ],
      },
    });
  });

  it("should create prompt template with correct format", () => {
    const jsonl = '{"test": "data"}';
    const result = (mainModule as any).createPromptTemplate(jsonl);

    expect(result).toContain("以下のシステム開発用語を");
    expect(result).toContain("## 分類カテゴリ");
    expect(result).toContain("## 出力形式（厳守）");
    expect(result).toContain("## 注意事項");
    expect(result).toContain(jsonl);
  });
});

describe("check-batch-output", () => {
  it("should identify and format errors correctly", async () => {
    const mockInput = [
      {
        number: "1.1",
        name: "test1",
        definitions: [{ text: "def1" }],
      },
      {
        number: "1.2",
        name: "test2",
        definitions: [{ text: "def2" }],
      },
      {
        number: "1.3",
        name: "test3",
        definitions: [{ text: "def3" }],
      },
    ];

    const mockBatchResult = [
      {
        number: "1.1",
        name_ja: "",
        categories: ["cat1"],
      },
      {
        number: "1.2",
        name_ja: "テスト2",
        categories: [],
      },
      // 1.3 is missing from batch results
    ];

    vi.spyOn(fs, "readFile")
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify(mockInput)))
      .mockImplementationOnce(() => Promise.resolve(JSON.stringify(mockBatchResult)));

    const mockWriteFile = vi.spyOn(fs, "writeFile").mockResolvedValue();

    const checkBatchModule = await import("../src/check-batch-output.mts");
    await checkBatchModule.main();

    expect(mockWriteFile).toHaveBeenCalledWith(
      "data/errors.json",
      expect.stringContaining("Missing Japanese name translation"),
      "utf-8",
    );

    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(writtenContent).toEqual([
      {
        term: mockInput[0],
        causes: ["Missing Japanese name translation"],
      },
      {
        term: mockInput[1],
        causes: ["No categories assigned"],
      },
      {
        term: mockInput[2],
        causes: ["No batch result found"],
      },
    ]);
  });
});

describe("main function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should process input file and generate output successfully", async () => {
    const mockReadFile = vi.spyOn(fs, "readFile").mockResolvedValue(JSON.stringify(mockTerms));
    const mockWriteFile = vi.spyOn(fs, "writeFile").mockResolvedValue();

    await mainModule.main();

    expect(mockReadFile).toHaveBeenCalledWith("data/input.json", "utf-8");
    expect(mockWriteFile).toHaveBeenCalledWith("data/output.jsonl", expect.stringContaining("req-1"), "utf-8");
  });

  it("should handle errors appropriately", async () => {
    const mockError = new Error("Test error");
    vi.spyOn(fs, "readFile").mockRejectedValue(mockError);

    await expect(mainModule.main()).rejects.toThrow("Test error");
  });
});
