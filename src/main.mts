import OpenAI from "openai";

const client = new OpenAI();

async function classifyAndTranslateTerm(jsonl: string): Promise<any> {
  const promptTemplate = `
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

  try {
    const response = await client.responses.create({
      model: "o3-mini",
      input: [
        {
          role: "system",
          content:
            "あなたはシステム開発用語の専門家です。定義の文脈を考慮し、適切な日本語訳と分類を行ってください。出力は指定された形式のみを含め、余計な説明は省いてください。",
        },
        {
          role: "user",
          content: promptTemplate,
        },
      ],
    });

    console.log("Response:", response);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

const termData = [
  {
    number: "3.34",
    name: "acceptance testing",
    definitions: [
      {
        text: "testing conducted to determine whether a system satisfies its acceptance criteria and to enable the customer to determine whether to accept the system",
      },
      {
        text: "formal testing conducted to enable a user, customer, or other authorized entity to determine whether to accept a system or component",
        reference: "IEEE 1012-2012 IEEE Standard for System and Software Verification and Validation, 3.1",
      },
    ],
    confer: ["acceptance test", "validation test"],
  },
  {
    number: "3.35",
    name: "accepted deliverables",
    definitions: [
      {
        text: "products, results, or capabilities produced by a project and validated by the project customer or sponsors as meeting their specified acceptance criteria",
        reference: "A Guide to the Project Management Body of Knowledge (PMBOK® Guide) — Fifth Edition",
      },
    ],
  },
  {
    number: "3.4209",
    name: "test bed",
    definitions: [
      {
        text: "environment containing the hardware, instrumentation, simulators, software tools, and other support elements needed to conduct a test",
      },
    ],
  },
  {
    number: "3.4210",
    name: "test case",
    definitions: [
      {
        text: "set of test inputs, execution conditions, and expected results developed for a particular objective, such as to exercise a particular program path or to verify compliance with a specific requirement",
        reference: "IEEE 1012-2012 IEEE Standard for System and Software Verification and Validation, 3.3.31",
      },
      {
        text: "documentation specifying inputs, predicted results, and a set of execution conditions for a test item",
        reference: "IEEE 1012-2012 IEEE Standard for System and Software Verification and Validation, 3.1.31",
      },
      {
        text: "set of test case preconditions, inputs (including actions, where applicable), and expected results, developed to drive the execution of a test item to meet test objectives, including correct implementation, error identification, checking quality, and other valued information",
        reference:
          "ISO/IEC/IEEE 29119-1:2013 Software and systems engineering — Software testing — Part 1: Concepts and definitions, 4.48",
      },
    ],
    note: "A test case is the lowest level of test input (i.e. test cases are not made up of test cases) for the test subprocess for which it is intended",
  },
];

function convertTermData(term: (typeof termData)[number]) {
  return {
    number: term.number,
    name: term.name,
    definitions: term.definitions[0]!.text,
  };
}

function convertTermsToJSONL(terms: typeof termData) {
  return terms.map((term) => JSON.stringify(convertTermData(term))).join("\n");
}

export async function main() {
  classifyAndTranslateTerm(convertTermsToJSONL(termData))
    .then((result) => console.log("Result:", result))
    .catch((error) => console.error("Error:", error));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  main();
}
