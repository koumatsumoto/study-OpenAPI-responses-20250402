import { readFileSync, writeFileSync } from 'fs'

interface BatchOutputLine {
  response: {
    body: {
      output: Array<{
        type: string
        content?: Array<{
          type: string
          text: string
        }>
      }>
    }
  }
}

interface Term {
  number: string
  name_ja: string
  categories: string[]
}

// JSONLファイルを読み込み、各行をパースする
const jsonlContent = readFileSync('data/batch_output.jsonl', 'utf-8')
const lines = jsonlContent.trim().split('\n')

// 各行から必要なデータを抽出し、マージする
const allTerms: Term[] = lines.flatMap(line => {
  const parsedLine = JSON.parse(line) as BatchOutputLine
  const messageOutput = parsedLine.response.body.output[1]
  if (messageOutput?.type !== 'message' || !messageOutput.content || !messageOutput.content[0]?.text) {
    return []
  }
  
  try {
    const terms = JSON.parse(messageOutput.content[0].text) as Term[]
    return terms
  } catch (error) {
    console.error('Failed to parse JSON content:', error)
    return []
  }
})

// 結果をファイルに保存
writeFileSync('data/batch_result.json', JSON.stringify(allTerms, null, 2), 'utf-8')

console.log(`Processed ${lines.length} lines`)
console.log(`Extracted ${allTerms.length} terms`)
console.log('Results saved to data/batch_result.json')
