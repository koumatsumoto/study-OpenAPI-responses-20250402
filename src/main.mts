import fs from "fs/promises";
import path from "path";
import * as R from "remeda";

const CHUNK_SIZE = 500;

interface Term {
  number: string;
  name: string;
  definitions: {
    text: string;
    reference?: string;
  }[];
  confer?: string[];
  note?: string;
}

interface ApiRequest {
  custom_id: string;
  method: string;
  url: string;
  body: {
    model: string;
    input: {
      role: string;
      content: string;
    }[];
  };
}

export function createPromptTemplate(jsonl: string): string {
  return `
以下のシステム開発用語を、定義に基づいて最適な日本語訳と全該当の分類に変換せよ。

## 分類カテゴリ
- req: 要求管理
- dev: 開発
- qa: テスト
- ops: 運用
- biz: ビジネス
- pm: プロジェクト管理
- ux: ユーザー体験
- sec: セキュリティ
- frontend
- backend
- infra: インフラ
- data: データ管理

## 出力形式（厳守）
{
  "number": "用語番号",
  "name_ja": "日本語訳",
  "categories": ["分類コード1", "分類コード2", ...]
}

## 注意事項
- 定義を十分に反映した、簡潔な日本語訳を作成すること
- 該当する分類を過不足なく選択し、指定の形式以外の出力をしないこと

## 処理する用語データ
${jsonl}
`;
}

export function convertTermData(term: Term) {
  return {
    number: term.number,
    name: term.name,
    definitions: term.definitions[0]!.text,
  };
}

export function convertTermsToJSONL(terms: Term[]) {
  return terms.map((term) => JSON.stringify(convertTermData(term))).join("\n");
}

export function splitTermsIntoChunks(terms: Term[]): Term[][] {
  return R.chunk(terms, CHUNK_SIZE);
}

export function generateApiRequests(chunks: Term[][]): ApiRequest[] {
  return chunks.map((chunk, index) => {
    const jsonl = convertTermsToJSONL(chunk);
    return {
      custom_id: `req-${index + 1}`,
      method: "POST",
      url: "/v1/responses",
      body: {
        model: "o3-mini",
        input: [
          {
            role: "system",
            content:
              "あなたはシステム開発用語の専門家です。定義の文脈を考慮し、適切な日本語訳と分類を行ってください。出力は指定された形式のみを含め、余計な説明は省いてください。",
          },
          {
            role: "user",
            content: createPromptTemplate(jsonl),
          },
        ],
      },
    };
  });
}

export async function main() {
  try {
    // Read input file
    const inputData = await fs.readFile(path.join("data", "input.json"), "utf-8");
    const terms: Term[] = JSON.parse(inputData);

    // Split terms into chunks
    const chunks = splitTermsIntoChunks(terms);

    // Generate API requests
    const requests = generateApiRequests(chunks);

    // Write output file
    const outputPath = path.join("data", "output.jsonl");
    await fs.writeFile(outputPath, requests.map((req) => JSON.stringify(req)).join("\n"), "utf-8");

    console.log(`Successfully wrote ${requests.length} requests to ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  main();
}
