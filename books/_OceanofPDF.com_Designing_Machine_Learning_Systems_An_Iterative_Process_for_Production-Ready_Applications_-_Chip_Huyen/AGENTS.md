# AI Agent Ingestion Manifest:  OceanofPDF.com Designing Machine Learning Systems An Iterative Process for Production Ready Applications   Chip Huyen

This manifest is optimized for autonomous coding agents, LLM RAG pipelines, and vector indexers.

## System Prompt & Usage Instructions for Agents

```markdown
You are navigating a structured, chapter-split technical knowledge base.
- Retrieve content from individual chapter files listed below.
- Each file begins with structured YAML frontmatter containing precise metadata.
- When citing technical instructions, reference the chapter number and section headings.
```

## Structured JSON Manifest (Machine-Readable)

```json
{
  "chapters": [
    {
      "chapter_index": 1,
      "title": "Introduction \u0026 Overview",
      "file_path": "01_introduction_and_overview.md",
      "start_page": 1,
      "word_count": 724,
      "estimated_tokens": 1266
    },
    {
      "chapter_index": 2,
      "title": "Preface",
      "file_path": "02_preface.md",
      "start_page": 7,
      "word_count": 2651,
      "estimated_tokens": 4392
    },
    {
      "chapter_index": 3,
      "title": "Chapter 1: Overview of Machine Learning Systems",
      "file_path": "03_chapter_1_overview_of_machine_learning_systems.md",
      "start_page": 18,
      "word_count": 8672,
      "estimated_tokens": 14235
    },
    {
      "chapter_index": 4,
      "title": "Chapter 2: Introduction to Machine Learning Systems",
      "file_path": "04_chapter_2_introduction_to_machine_learning_systems.md",
      "start_page": 50,
      "word_count": 7291,
      "estimated_tokens": 12004
    },
    {
      "chapter_index": 5,
      "title": "Chapter 3: Data Engineering Fundamentals",
      "file_path": "05_chapter_3_data_engineering_fundamentals.md",
      "start_page": 79,
      "word_count": 11174,
      "estimated_tokens": 18269
    },
    {
      "chapter_index": 6,
      "title": "Chapter 4: Training Data",
      "file_path": "06_chapter_4_training_data.md",
      "start_page": 114,
      "word_count": 13813,
      "estimated_tokens": 22306
    },
    {
      "chapter_index": 7,
      "title": "Chapter 5: Feature Engineering",
      "file_path": "07_chapter_5_feature_engineering.md",
      "start_page": 157,
      "word_count": 9397,
      "estimated_tokens": 15170
    },
    {
      "chapter_index": 8,
      "title": "Chapter 6: Model Development and Offline Evaluation",
      "file_path": "08_chapter_6_model_development_and_offline_evaluation.md",
      "start_page": 180,
      "word_count": 14697,
      "estimated_tokens": 24376
    },
    {
      "chapter_index": 9,
      "title": "Chapter 7: Model Deployment and Prediction Service",
      "file_path": "09_chapter_7_model_deployment_and_prediction_service.md",
      "start_page": 217,
      "word_count": 10363,
      "estimated_tokens": 17382
    },
    {
      "chapter_index": 10,
      "title": "Chapter 8: Data Distribution Shifts and Monitoring",
      "file_path": "10_chapter_8_data_distribution_shifts_and_monitoring.md",
      "start_page": 264,
      "word_count": 14677,
      "estimated_tokens": 24351
    },
    {
      "chapter_index": 11,
      "title": "Chapter 9: Continual Learning and Test in Production",
      "file_path": "11_chapter_9_continual_learning_and_test_in_production.md",
      "start_page": 290,
      "word_count": 11321,
      "estimated_tokens": 18637
    },
    {
      "chapter_index": 12,
      "title": "Chapter 10: Infrastructure and Tooling for MLOps",
      "file_path": "12_chapter_10_infrastructure_and_tooling_for_mlops.md",
      "start_page": 329,
      "word_count": 13541,
      "estimated_tokens": 22293
    },
    {
      "chapter_index": 13,
      "title": "Chapter 11: The Human Side of Machine Learning",
      "file_path": "13_chapter_11_the_human_side_of_machine_learning.md",
      "start_page": 379,
      "word_count": 8344,
      "estimated_tokens": 14165
    }
  ],
  "document_title": " OceanofPDF.com Designing Machine Learning Systems An Iterative Process for Production Ready Applications   Chip Huyen",
  "estimated_tokens": 208846,
  "total_chapters": 13,
  "total_pages": 461,
  "total_words": 126665
}
```

## Sequential Chapter Navigation Map

| Index | File | Start Page | Est. Tokens | Scope |
| :--- | :--- | :--- | :--- | :--- |
| `01` | [`01_introduction_and_overview.md`](./01_introduction_and_overview.md) | Page 1 | ~1266 | Introduction & Overview |
| `02` | [`02_preface.md`](./02_preface.md) | Page 7 | ~4392 | Preface |
| `03` | [`03_chapter_1_overview_of_machine_learning_systems.md`](./03_chapter_1_overview_of_machine_learning_systems.md) | Page 18 | ~14235 | Chapter 1: Overview of Machine Learning Systems |
| `04` | [`04_chapter_2_introduction_to_machine_learning_systems.md`](./04_chapter_2_introduction_to_machine_learning_systems.md) | Page 50 | ~12004 | Chapter 2: Introduction to Machine Learning Systems |
| `05` | [`05_chapter_3_data_engineering_fundamentals.md`](./05_chapter_3_data_engineering_fundamentals.md) | Page 79 | ~18269 | Chapter 3: Data Engineering Fundamentals |
| `06` | [`06_chapter_4_training_data.md`](./06_chapter_4_training_data.md) | Page 114 | ~22306 | Chapter 4: Training Data |
| `07` | [`07_chapter_5_feature_engineering.md`](./07_chapter_5_feature_engineering.md) | Page 157 | ~15170 | Chapter 5: Feature Engineering |
| `08` | [`08_chapter_6_model_development_and_offline_evaluation.md`](./08_chapter_6_model_development_and_offline_evaluation.md) | Page 180 | ~24376 | Chapter 6: Model Development and Offline Evaluation |
| `09` | [`09_chapter_7_model_deployment_and_prediction_service.md`](./09_chapter_7_model_deployment_and_prediction_service.md) | Page 217 | ~17382 | Chapter 7: Model Deployment and Prediction Service |
| `10` | [`10_chapter_8_data_distribution_shifts_and_monitoring.md`](./10_chapter_8_data_distribution_shifts_and_monitoring.md) | Page 264 | ~24351 | Chapter 8: Data Distribution Shifts and Monitoring |
| `11` | [`11_chapter_9_continual_learning_and_test_in_production.md`](./11_chapter_9_continual_learning_and_test_in_production.md) | Page 290 | ~18637 | Chapter 9: Continual Learning and Test in Production |
| `12` | [`12_chapter_10_infrastructure_and_tooling_for_mlops.md`](./12_chapter_10_infrastructure_and_tooling_for_mlops.md) | Page 329 | ~22293 | Chapter 10: Infrastructure and Tooling for MLOps |
| `13` | [`13_chapter_11_the_human_side_of_machine_learning.md`](./13_chapter_11_the_human_side_of_machine_learning.md) | Page 379 | ~14165 | Chapter 11: The Human Side of Machine Learning |
