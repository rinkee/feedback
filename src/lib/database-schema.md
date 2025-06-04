# Database Schema Documentation

This document outlines the structure of the primary tables used in the FeedbackFlow application, based on the provided schema diagram.

## Tables

### `surveys`

Stores information about each survey created.

| Column        | Type          | Constraints                 | Description                                     |
| ------------- | ------------- | --------------------------- | ----------------------------------------------- |
| `id`          | `uuid`        | Primary Key                 | Unique identifier for the survey.               |
| `user_id`     | `uuid`        | Foreign Key (auth.users.id) | ID of the user who created the survey.          |
| `store_id`    | `uuid`        | Foreign Key (stores.id)     | ID of the store this survey is associated with. |
| `title`       | `text`        |                             | Title of the survey.                            |
| `description` | `text`        |                             | Optional description for the survey.            |
| `is_active`   | `boolean`     | Default false               | Whether the survey is currently active.         |
| `created_at`  | `timestamptz` |                             | Timestamp of when the survey was created.       |
| `updated_at`  | `timestamptz` |                             | Timestamp of when the survey was last updated.  |

### `questions`

Stores individual questions associated with a survey.

| Column                 | Type          | Constraints                         | Description                                                                                                       |
| ---------------------- | ------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `id`                   | `uuid`        | Primary Key                         | Unique identifier for the question.                                                                               |
| `survey_id`            | `uuid`        | Foreign Key (surveys.id)            | ID of the survey this question belongs to.                                                                        |
| `store_id`             | `uuid`        |                                     | (Likely denormalized) Store ID.                                                                                   |
| `user_id`              | `uuid`        |                                     | (Likely denormalized) User ID.                                                                                    |
| `question_text`        | `text`        |                                     | The actual text content of the question.                                                                          |
| `question_type`        | `text`        |                                     | Type of the question (e.g., 'rating', 'select', 'textarea').                                                      |
| `options`              | `jsonb`       |                                     | JSON object containing question-specific options (e.g., choices for select, maxRating for rating, required flag). |
| `order_num`            | `int4`        |                                     | Integer to determine the order of questions in a survey.                                                          |
| `is_required`          | `boolean`     | Default false                       | Whether this is a required question that cannot be deleted.                                                       |
| `required_question_id` | `uuid`        | Foreign Key (required_questions.id) | Reference to required question template if applicable.                                                            |
| `created_at`           | `timestamptz` |                                     | Timestamp of when the question was created.                                                                       |

### `required_questions`

Stores templates for required questions that appear in all surveys.

| Column          | Type          | Constraints      | Description                                             |
| --------------- | ------------- | ---------------- | ------------------------------------------------------- |
| `id`            | `uuid`        | Primary Key      | Unique identifier for the required question.            |
| `question_text` | `text`        | Not Null         | The text content of the required question.              |
| `question_type` | `text`        | Default 'rating' | Type of question (rating recommended for statistics).   |
| `options`       | `jsonb`       |                  | Default options for the question.                       |
| `category`      | `text`        |                  | Category (e.g., 'revisit_intention', 'recommendation'). |
| `description`   | `text`        |                  | Description of what this question measures.             |
| `is_active`     | `boolean`     | Default true     | Whether this required question is currently active.     |
| `order_num`     | `int4`        |                  | Order in which required questions appear.               |
| `created_at`    | `timestamptz` |                  | Timestamp of when the required question was created.    |
| `updated_at`    | `timestamptz` |                  | Timestamp of when it was last updated.                  |

### `user_required_questions`

Stores which required questions are enabled for each user.

| Column                 | Type          | Constraints                         | Description                                             |
| ---------------------- | ------------- | ----------------------------------- | ------------------------------------------------------- |
| `id`                   | `uuid`        | Primary Key                         | Unique identifier.                                      |
| `user_id`              | `uuid`        | Foreign Key (auth.users.id)         | ID of the user.                                         |
| `required_question_id` | `uuid`        | Foreign Key (required_questions.id) | ID of the required question.                            |
| `is_enabled`           | `boolean`     | Default true                        | Whether this required question is enabled for the user. |
| `created_at`           | `timestamptz` |                                     | Timestamp of when the setting was created.              |
| `updated_at`           | `timestamptz` |                                     | Timestamp of when it was last updated.                  |

### `stores`

Stores information about registered stores.

| Column                         | Type          | Constraints                 | Description                                   |
| ------------------------------ | ------------- | --------------------------- | --------------------------------------------- |
| `id`                           | `uuid`        | Primary Key                 | Unique identifier for the store.              |
| `user_id`                      | `uuid`        | Foreign Key (auth.users.id) | ID of the user who registered the store.      |
| `name`                         | `text`        |                             | Name of the store.                            |
| `business_registration_number` | `text`        |                             | Business registration number.                 |
| `owner_contact`                | `text`        |                             | Contact information for the store owner.      |
| `store_type_broad`             | `text`        |                             | Broad category of the store type.             |
| `created_at`                   | `timestamptz` |                             | Timestamp of when the store was registered.   |
| `updated_at`                   | `timestamptz` |                             | Timestamp of when the store was last updated. |

### `customer_info`

Stores customer information for survey responses.

| Column       | Type          | Constraints              | Description                                      |
| ------------ | ------------- | ------------------------ | ------------------------------------------------ |
| `id`         | `uuid`        | Primary Key              | Unique identifier for customer info.             |
| `survey_id`  | `uuid`        | Foreign Key (surveys.id) | ID of the survey this customer info belongs to.  |
| `name`       | `text`        |                          | Customer name.                                   |
| `age_group`  | `text`        |                          | Customer age group.                              |
| `gender`     | `text`        |                          | Customer gender.                                 |
| `created_at` | `timestamptz` |                          | Timestamp of when the customer info was created. |

### `responses`

Stores individual responses to survey questions.

| Column                       | Type          | Constraints                    | Description                                                              |
| ---------------------------- | ------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `id`                         | `uuid`        | Primary Key                    | Unique identifier for the response.                                      |
| `survey_id`                  | `uuid`        | Foreign Key (surveys.id)       | ID of the survey.                                                        |
| `question_id`                | `uuid`        | Foreign Key (questions.id)     | ID of the question being answered.                                       |
| `customer_info_id`           | `uuid`        | Foreign Key (customer_info.id) | ID of the customer info.                                                 |
| `response_text`              | `text`        |                                | Text response (for text/textarea questions).                             |
| `rating`                     | `int4`        |                                | Rating value (for rating questions).                                     |
| `selected_option`            | `text`        |                                | Selected option (for select questions).                                  |
| `required_question_category` | `text`        |                                | Category of required question if applicable (e.g., 'revisit_intention'). |
| `is_read`                    | `boolean`     | Default false                  | Whether the response has been read.                                      |
| `created_at`                 | `timestamptz` |                                | Timestamp of when the response was created.                              |

### `ai_statistics`

Stores AI-generated analysis of survey responses.

| Column                    | Type          | Constraints              | Description                                     |
| ------------------------- | ------------- | ------------------------ | ----------------------------------------------- |
| `id`                      | `uuid`        | Primary Key              | Unique identifier for the AI analysis.          |
| `survey_id`               | `uuid`        | Foreign Key (surveys.id) | ID of the survey analyzed.                      |
| `summary`                 | `text`        |                          | AI-generated summary of responses.              |
| `total_responses`         | `int4`        |                          | Total number of responses analyzed.             |
| `average_rating`          | `float8`      |                          | Average rating from rating questions.           |
| `main_customer_age_group` | `text`        |                          | Most common customer age group.                 |
| `main_customer_gender`    | `text`        |                          | Most common customer gender.                    |
| `top_pros`                | `text[]`      |                          | Array of top positive points.                   |
| `top_cons`                | `text[]`      |                          | Array of top negative points/improvement areas. |
| `analysis_date`           | `timestamptz` |                          | Timestamp of when the analysis was performed.   |

### `auth.users`

Standard Supabase table for user authentication.

(Refer to Supabase documentation for `auth.users` schema details)

## Relationships

- `surveys.user_id` references `auth.users.id`
- `surveys.store_id` references `stores.id`
- `questions.survey_id` references `surveys.id`
- `questions.required_question_id` references `required_questions.id`
- `stores.user_id` references `auth.users.id`
- `customer_info.survey_id` references `surveys.id`
- `responses.survey_id` references `surveys.id`
- `responses.question_id` references `questions.id`
- `responses.customer_info_id` references `customer_info.id`
- `ai_statistics.survey_id` references `surveys.id`
- `user_required_questions.user_id` references `auth.users.id`
- `user_required_questions.required_question_id` references `required_questions.id`

```

```
