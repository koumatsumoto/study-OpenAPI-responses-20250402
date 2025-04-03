# study-OpenAPI-responses-20250402

## Updating data/input.json

To update the input.json file with the latest system vocabulary data, run:

```bash
curl -o data/input.json https://raw.githubusercontent.com/koumatsumoto/system-vocabulary-parser/refs/heads/main/data/output-translated.json
```

## Test Data Preparation

To prepare test data by keeping only the first line of output.jsonl:

```bash
head -n 1 data/output.jsonl > data/output.jsonl.temp && mv data/output.jsonl.temp data/output.jsonl
```
