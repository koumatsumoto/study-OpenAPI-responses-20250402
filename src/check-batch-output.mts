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

interface ErrorEntry {
  term: Term;
  causes: string[];
}

export async function main() {
  try {
    // Read input files
    const inputData = await fs.readFile(path.join("data", "input.json"), "utf-8");
    const batchData = await fs.readFile(path.join("data", "batch_result.json"), "utf-8");

    const terms: Term[] = JSON.parse(inputData);
    const batchResults: BatchResult[] = JSON.parse(batchData);

    // Check for missing or invalid data
    const errors: ErrorEntry[] = terms
      .map((term): ErrorEntry | null => {
        const result = batchResults.find((r) => r.number === term.number);
        const causes: string[] = [];

        if (!result) {
          causes.push("No batch result found");
          return { term, causes };
        }

        if (result.name_ja === "") {
          causes.push("Missing Japanese name translation");
        }

        if (result.categories.length === 0) {
          causes.push("No categories assigned");
        }

        return causes.length > 0 ? { term, causes } : null;
      })
      .filter((entry): entry is ErrorEntry => entry !== null);

    // Write errors to file
    const outputPath = "data/errors.json";
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
