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
以下の用語データを、定義を踏まえて日本語に訳し、最適なカテゴリを全て割り当てよ。

## カテゴリ
- req: 要求・要件（例: 要求分析, 要件仕様策定, 要求追跡）
- design: 設計・アーキテクチャ（例: アーキテクチャ設計, データモデル設計）
- dev: 開発・実装（例: コーディング, コードレビュー, 単体テスト）
- qa: 品質保証（例: システムテスト, 受け入れテスト, 品質測定）
- ops: 運用・保守（例: デプロイ, 監視, 障害対応, インシデント管理）
- pm: プロジェクト管理（例: スケジュール管理, リスク管理, リソース管理）
- biz: ビジネス（例: 予算策定, ROI, 顧客折衝, ビジネス要求）
- sec: セキュリティ（例: 認証/認可, 暗号化, 脆弱性診断, 攻撃対策）
- ux: ユーザー体験（例: UXリサーチ, ユーザビリティテスト, プロトタイピング）
- infra: インフラ（例: サーバ構築, ネットワーク設計, クラウド設定）
- data: データ管理・分析（例: データモデリング, 分析基盤, ETL, レポート）

## 出力形式（厳守）
{
  "number": "用語番号",
  "name_ja": "日本語訳",
  "categories": ["分類コード1", "分類コード2", ...]
}

## 注意事項
- 定義を反映した簡潔な訳にすること
- 複数のカテゴリに当てはまる場合は全て列挙
- 上記フォーマット以外の出力をしない

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
