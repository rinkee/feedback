```markdown
# Database Schema Documentation

This document outlines the structure of the primary tables used in the FeedbackFlow application, based on the provided schema diagram.

## Tables

### `surveys`
Stores information about each survey created.

| Column        | Type        | Constraints                | Description                                  |
|---------------|-------------|----------------------------|----------------------------------------------|
| `id`          | `uuid`      | Primary Key                | Unique identifier for the survey.            |
| `user_id`     | `uuid`      | Foreign Key (auth.users.id)| ID of the user who created the survey.       |
| `store_id`    | `uuid`      | Foreign Key (stores.id)    | ID of the store this survey is associated with.|
| `title`       | `text`      |                            | Title of the survey.                         |
| `description` | `text`      |                            | Optional description for the survey.         |
| `created_at`  | `timestamptz`|                            | Timestamp of when the survey was created.    |
| `updated_at`  | `timestamptz`|                            | Timestamp of when the survey was last updated.|

### `questions`
Stores individual questions associated with a survey.

| Column          | Type        | Constraints              | Description                                       |
|-----------------|-------------|--------------------------|---------------------------------------------------|
| `id`            | `uuid`      | Primary Key              | Unique identifier for the question.               |
| `survey_id`     | `uuid`      | Foreign Key (surveys.id) | ID of the survey this question belongs to.        |
| `store_id`      | `uuid`      |                          | (Likely denormalized) Store ID.                   |
| `user_id`       | `uuid`      |                          | (Likely denormalized) User ID.                    |
| `question_text` | `text`      |                          | The actual text content of the question.          |
| `question_type` | `text`      |                          | Type of the question (e.g., 'rating', 'select', 'textarea'). |
| `options`       | `jsonb`     |                          | JSON object containing question-specific options (e.g., choices for select, maxRating for rating, required flag). |
| `order_num`     | `int4`      |                          | Integer to determine the order of questions in a survey. |
| `created_at`    | `timestamptz`|                          | Timestamp of when the question was created.       |

### `stores`
Stores information about registered stores.

| Column                  | Type        | Constraints                | Description                               |
|-------------------------|-------------|----------------------------|-------------------------------------------|
| `id`                    | `uuid`      | Primary Key                | Unique identifier for the store.          |
| `user_id`               | `uuid`      | Foreign Key (auth.users.id)| ID of the user who registered the store.  |
| `name`                  | `text`      |                            | Name of the store.                        |
| `business_registration_number` | `text` |                       | Business registration number.             |
| `owner_contact`         | `text`      |                            | Contact information for the store owner.  |
| `store_type_broad`      | `text`      |                            | Broad category of the store type.         |
| `created_at`            | `timestamptz`|                            | Timestamp of when the store was registered.|
| `updated_at`            | `timestamptz`|                            | Timestamp of when the store was last updated.|

### `auth.users`
Standard Supabase table for user authentication.

(Refer to Supabase documentation for `auth.users` schema details)

## Relationships

- `surveys.user_id` references `auth.users.id`
- `surveys.store_id` references `stores.id`
- `questions.survey_id` references `surveys.id`
- `stores.user_id` references `auth.users.id`

```
