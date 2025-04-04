import fs from "fs/promises";
import path from "path";

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

interface BatchResult {
  number: string;
  name_ja: string;
  categories: string[];
}

async function main() {
  try {
    // Read input files
    const inputData = await fs.readFile(path.join("data", "input.json"), "utf-8");
    const batchData = await fs.readFile(path.join("data", "batch_result.json"), "utf-8");

    const terms: Term[] = JSON.parse(inputData);
    const batchResults: BatchResult[] = JSON.parse(batchData);

    // Check for missing or invalid data
    const errors: Term[] = terms.filter(term => {
      const result = batchResults.find(r => r.number === term.number);
      if (!result) return true;
      if (result.name_ja === "") return true;
      if (result.categories.length === 0) return true;
      return false;
    });

    // Write errors to file
    const outputPath = "errors.json";
    await fs.writeFile(outputPath, JSON.stringify(errors, null, 2), "utf-8");

    console.log(`Found ${errors.length} errors. Written to ${outputPath}`);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  main();
}
