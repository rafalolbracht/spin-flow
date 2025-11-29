# REST API Plan - Spin Flow

## 1. Resources

### Core Resources

- **matches** - Main resource for table tennis matches (maps to `matches` table)
- **sets** - Match sets, nested under matches (maps to `sets` table)
- **points** - Individual points scored in sets, nested under sets (maps to `points` table)
- **tags** - Global tags for categorizing points (maps to `tags` table)
- **ai-reports** - AI-generated match summaries and recommendations (maps to `matches_ai_reports` table)
- **shares** - Public sharing links for matches (maps to `matches_public_share` table)
- **analytics** - Analytics events (admin-only, maps to `analytics_events` table)
- **dictionary** - UI label lookups (maps to `dic_lookup_labels` table)

---

## 2. Endpoints

### 2.1. Matches

#### GET /api/matches

Retrieve a paginated list of matches for the authenticated user.

**Query Parameters:**

- `page` (integer, optional, default: 1) - Page number
- `limit` (integer, optional, default: 20, max: 100) - Items per page
- `player_name` (string, optional) - Filter by player name (partial match)
- `opponent_name` (string, optional) - Filter by opponent name (partial match)
- `status` (string, optional) - Filter by status: `in_progress` or `finished`
- `sort` (string, optional, default: `-started_at`) - Sort field (prefix with `-` for descending)

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": 123,
      "player_name": "Jan Kowalski",
      "opponent_name": "Adam Nowak",
      "max_sets": 5,
      "golden_set_enabled": false,
      "first_server_first_set": "player",
      "generate_ai_summary": true,
      "sets_won_player": 2,
      "sets_won_opponent": 1,
      "status": "in_progress",
      "coach_notes": null,
      "started_at": "2024-01-15T14:30:00Z",
      "ended_at": null,
      "created_at": "2024-01-15T14:25:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `400 Bad Request` - Invalid query parameters

---

#### POST /api/matches

Create a new match with initial configuration. Automatically creates and starts the first set.

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "player_name": "Jan Kowalski",
  "opponent_name": "Adam Nowak",
  "max_sets": 5,
  "golden_set_enabled": false,
  "first_server_first_set": "player",
  "generate_ai_summary": true
}
```

**Validation Rules:**

- `player_name` (required, string, max 200 chars)
- `opponent_name` (required, string, max 200 chars)
- `max_sets` (required, integer, > 0, max 7)
- `golden_set_enabled` (required, boolean)
- `first_server_first_set` (required, enum: `player` or `opponent`)
- `generate_ai_summary` (required, boolean)

**Response Body (201 Created):**

```json
{
  "data": {
    "id": 124,
    "player_name": "Jan Kowalski",
    "opponent_name": "Adam Nowak",
    "max_sets": 5,
    "golden_set_enabled": false,
    "first_server_first_set": "player",
    "generate_ai_summary": true,
    "sets_won_player": 0,
    "sets_won_opponent": 0,
    "status": "in_progress",
    "coach_notes": null,
    "started_at": "2024-01-15T14:30:00Z",
    "ended_at": null,
    "created_at": "2024-01-15T14:30:00Z",
    "current_set": {
      "id": 456,
      "sequence_in_match": 1,
      "is_golden": false,
      "set_score_player": 0,
      "set_score_opponent": 0,
      "is_finished": false,
      "current_server": "player"
    }
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `400 Bad Request` - Invalid request body
- `422 Unprocessable Entity` - Validation failed (with detailed error messages)

---

#### GET /api/matches/{id}

Retrieve detailed information about a specific match.

**Path Parameters:**

- `id` (integer, required) - Match ID

**Query Parameters:**

- `include` (string, optional) - Comma-separated list of related resources to include: `sets`, `points`, `tags`, `ai_report`
  - `sets` - Include all sets with their details
  - `points` - Include all points (requires `sets` to be included)
  - `tags` - Include tags associated with points (requires `points` to be included)
  - `ai_report` - Include AI-generated report (only for finished matches)
  - Example: `?include=sets,points,tags,ai_report`

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Response Body (200 OK) - Basic (no includes):**

```json
{
  "data": {
    "id": 124,
    "player_name": "Jan Kowalski",
    "opponent_name": "Adam Nowak",
    "max_sets": 5,
    "golden_set_enabled": false,
    "first_server_first_set": "player",
    "generate_ai_summary": true,
    "sets_won_player": 2,
    "sets_won_opponent": 1,
    "status": "in_progress",
    "coach_notes": null,
    "started_at": "2024-01-15T14:30:00Z",
    "ended_at": null,
    "created_at": "2024-01-15T14:30:00Z",
    "current_set": {
      "id": 458,
      "sequence_in_match": 4,
      "is_golden": false,
      "set_score_player": 7,
      "set_score_opponent": 5,
      "is_finished": false,
      "current_server": "opponent"
    }
  }
}
```

**Response Body (200 OK) - With all includes (`?include=sets,points,tags,ai_report`):**

```json
{
  "data": {
    "id": 124,
    "player_name": "Jan Kowalski",
    "opponent_name": "Adam Nowak",
    "max_sets": 5,
    "golden_set_enabled": false,
    "first_server_first_set": "player",
    "generate_ai_summary": true,
    "sets_won_player": 3,
    "sets_won_opponent": 1,
    "status": "finished",
    "coach_notes": "Mecz pokazał postęp w ataku forehandem",
    "started_at": "2024-01-15T14:30:00Z",
    "ended_at": "2024-01-15T16:00:00Z",
    "created_at": "2024-01-15T14:30:00Z",
    "current_set": null,
    "sets": [
      {
        "id": 456,
        "match_id": 124,
        "sequence_in_match": 1,
        "is_golden": false,
        "set_score_player": 11,
        "set_score_opponent": 8,
        "winner": "player",
        "is_finished": true,
        "coach_notes": "Dobry początek, agresywna gra",
        "finished_at": "2024-01-15T14:45:00Z",
        "created_at": "2024-01-15T14:30:00Z",
        "points": [
          {
            "id": 1001,
            "set_id": 456,
            "sequence_in_set": 1,
            "scored_by": "player",
            "served_by": "player",
            "created_at": "2024-01-15T14:31:00Z",
            "tags": ["Dobry atak"]
          },
          {
            "id": 1002,
            "set_id": 456,
            "sequence_in_set": 2,
            "scored_by": "player",
            "served_by": "player",
            "created_at": "2024-01-15T14:31:15Z",
            "tags": []
          },
          {
            "id": 1003,
            "set_id": 456,
            "sequence_in_set": 3,
            "scored_by": "opponent",
            "served_by": "opponent",
            "created_at": "2024-01-15T14:31:30Z",
            "tags": ["Błąd serwisu"]
          },
          {
            "id": 1004,
            "set_id": 456,
            "sequence_in_set": 4,
            "scored_by": "player",
            "served_by": "opponent",
            "created_at": "2024-01-15T14:31:45Z",
            "tags": ["Błąd odbioru"]
          }
        ]
      },
      {
        "id": 457,
        "match_id": 124,
        "sequence_in_match": 2,
        "is_golden": false,
        "set_score_player": 9,
        "set_score_opponent": 11,
        "winner": "opponent",
        "is_finished": true,
        "coach_notes": "Problemy z odbiorami rotowanych serwisów",
        "finished_at": "2024-01-15T15:00:00Z",
        "created_at": "2024-01-15T14:45:00Z",
        "points": [
          {
            "id": 1020,
            "set_id": 457,
            "sequence_in_set": 1,
            "scored_by": "opponent",
            "served_by": "opponent",
            "created_at": "2024-01-15T14:46:00Z",
            "tags": ["Błąd odbioru", "Rotowany serwis"]
          },
          {
            "id": 1021,
            "set_id": 457,
            "sequence_in_set": 2,
            "scored_by": "player",
            "served_by": "opponent",
            "created_at": "2024-01-15T14:46:15Z",
            "tags": []
          }
        ]
      },
      {
        "id": 458,
        "match_id": 124,
        "sequence_in_match": 3,
        "is_golden": false,
        "set_score_player": 11,
        "set_score_opponent": 7,
        "winner": "player",
        "is_finished": true,
        "coach_notes": "Lepsza koncentracja",
        "finished_at": "2024-01-15T15:20:00Z",
        "created_at": "2024-01-15T15:00:00Z",
        "points": [
          {
            "id": 1040,
            "set_id": 458,
            "sequence_in_set": 1,
            "scored_by": "player",
            "served_by": "player",
            "created_at": "2024-01-15T15:01:00Z",
            "tags": ["Dobry atak"]
          }
        ]
      },
      {
        "id": 459,
        "match_id": 124,
        "sequence_in_match": 4,
        "is_golden": false,
        "set_score_player": 11,
        "set_score_opponent": 5,
        "winner": "player",
        "is_finished": true,
        "coach_notes": "Dominacja w całym secie",
        "finished_at": "2024-01-15T15:35:00Z",
        "created_at": "2024-01-15T15:20:00Z",
        "points": [
          {
            "id": 1060,
            "set_id": 459,
            "sequence_in_set": 1,
            "scored_by": "opponent",
            "served_by": "opponent",
            "created_at": "2024-01-15T15:21:00Z",
            "tags": []
          },
          {
            "id": 1061,
            "set_id": 459,
            "sequence_in_set": 2,
            "scored_by": "player",
            "served_by": "opponent",
            "created_at": "2024-01-15T15:21:15Z",
            "tags": ["Zła praca nóg"]
          }
        ]
      }
    ],
    "ai_report": {
      "id": 789,
      "match_id": 124,
      "ai_status": "success",
      "ai_summary": "Mecz rozpoczął się bardzo dobrze dla Jana Kowalskiego, który wygrał pierwszego seta pewnie 11:8 dzięki agresywnemu atakowi forehandem. W drugim secie pojawiły się problemy z odbiorami rotowanych serwisów przeciwnika, co przełożyło się na przegraną 9:11. Trzeci set pokazał poprawę w koncentracji i powrót do skutecznej gry ofensywnej. Czwarty set był zdecydowaną dominacją zawodnika, który kontrolował przebieg wymiany od pierwszego do ostatniego punktu. Łącznie zawodnik wygrał mecz 3:1, pokazując dobrą formę i umiejętność adaptacji do gry przeciwnika.",
      "ai_recommendations": "1. Intensywnie trenować odbiór rotowanych serwisów, szczególnie tych kierowanych na backhand. 2. Pracować nad utrzymaniem wysokiej koncentracji przez cały mecz, nie tylko w setach wygranych. 3. Kontynuować rozwój agresywnego ataku forehandem, który był kluczem do sukcesu. 4. Poprawić pracę nóg przy szybkich wymianach, co pozwoli na lepsze pozycjonowanie się do piłki. 5. Zwiększyć pewność siebie przy serwisie - mniej błędów serwisowych przełoży się na lepszą kontrolę nad meczem.",
      "ai_error": null,
      "ai_generated_at": "2024-01-15T16:01:30Z",
      "created_at": "2024-01-15T16:00:00Z"
    }
  }
}
```

**Notes:**

- When `include=sets` is specified without `points`, sets will be returned without the `points` array
- When `include=points` is specified, it automatically includes `sets` (dependency)
- When `include=tags` is specified, it automatically includes `points` and `sets` (dependency chain)
- Tags are returned as an array of strings (tag names only) for simplicity. Full tag information can be retrieved from `GET /api/tags`
- When `ai_report` is included but not available (match not finished or `generate_ai_summary=false`), the field will be `null`
- For matches with `status=in_progress`, the `current_set` object contains information about the active set and current server
- For matches with `status=finished`, the `current_set` is `null`

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this match
- `404 Not Found` - Match not found
- `400 Bad Request` - Invalid include parameter

---

#### PATCH /api/matches/{id}

Update match metadata (limited fields only). Cannot modify sets, points, or match status.

**Path Parameters:**

- `id` (integer, required) - Match ID

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

**Request Body (partial update):**

```json
{
  "player_name": "Jan Kowalski",
  "opponent_name": "Adam Nowak",
  "coach_notes": "Uwagi trenera do całego meczu"
}
```

**Allowed Fields:**

- `player_name` (string, max 200 chars)
- `opponent_name` (string, max 200 chars)
- `coach_notes` (string, nullable)

**Response Body (200 OK):**

```json
{
  "data": {
    "id": 124,
    "player_name": "Jan Kowalski",
    "opponent_name": "Adam Nowak",
    "coach_notes": "Uwagi trenera do całego meczu",
    "updated_at": "2024-01-15T15:00:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this match
- `404 Not Found` - Match not found
- `422 Unprocessable Entity` - Validation failed

---

#### POST /api/matches/{id}/finish

Finish a match. Validates that current set score is not tied and overall set score is not tied. Triggers AI generation if enabled.

**Path Parameters:**

- `id` (integer, required) - Match ID

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "coach_notes": "Optional coach notes for the match"
}
```

**Business Logic:**

- Validates that match status is `in_progress` (cannot finish already finished match)
- Validates that current set score is not tied
- Validates that overall set score (including current set) is not tied
- Marks current set as finished with appropriate winner
- Updates match status to `finished`
- Records `ended_at` timestamp
- If `generate_ai_summary` is true, triggers asynchronous AI report generation
- Creates analytics event (match_finished)

**Response Body (200 OK):**

```json
{
  "data": {
    "id": 124,
    "status": "finished",
    "sets_won_player": 3,
    "sets_won_opponent": 1,
    "ended_at": "2024-01-15T16:00:00Z",
    "ai_report_status": "pending"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this match
- `404 Not Found` - Match not found
- `422 Unprocessable Entity` - Cannot finish match: match is already finished, current set score is tied, or overall score is tied

---

#### DELETE /api/matches/{id}

Permanently delete a match and all associated data (sets, points, point_tags, ai_reports, public_share).

**Path Parameters:**

- `id` (integer, required) - Match ID

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Business Logic:**

- Deletes in order: point_tags → points → sets → matches_ai_reports → matches_public_share → matches
- Cascading delete handled by backend logic (not DB cascade due to schema design)
- Sets analytics events match_id to NULL (if they exist)

**Response Body (204 No Content):**
(Empty body)

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this match
- `404 Not Found` - Match not found

---

### 2.2. Sets

#### GET /api/matches/{matchId}/sets

Retrieve all sets for a specific match.

**Path Parameters:**

- `matchId` (integer, required) - Match ID

**Query Parameters:**

- `include` (string, optional) - Comma-separated list: `points`, `tags`

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": 456,
      "match_id": 124,
      "sequence_in_match": 1,
      "is_golden": false,
      "set_score_player": 11,
      "set_score_opponent": 8,
      "winner": "player",
      "is_finished": true,
      "coach_notes": "Dobry początek",
      "finished_at": "2024-01-15T14:45:00Z",
      "created_at": "2024-01-15T14:30:00Z"
    },
    {
      "id": 457,
      "match_id": 124,
      "sequence_in_match": 2,
      "is_golden": false,
      "set_score_player": 9,
      "set_score_opponent": 11,
      "winner": "opponent",
      "is_finished": true,
      "coach_notes": null,
      "finished_at": "2024-01-15T15:00:00Z",
      "created_at": "2024-01-15T14:45:00Z"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this match
- `404 Not Found` - Match not found

---

#### GET /api/sets/{id}

Retrieve detailed information about a specific set.

**Path Parameters:**

- `id` (integer, required) - Set ID

**Query Parameters:**

- `include` (string, optional) - Comma-separated list: `points`, `tags`

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Response Body (200 OK):**

```json
{
  "data": {
    "id": 456,
    "match_id": 124,
    "sequence_in_match": 1,
    "is_golden": false,
    "set_score_player": 11,
    "set_score_opponent": 8,
    "winner": "player",
    "is_finished": true,
    "coach_notes": "Dobry początek",
    "finished_at": "2024-01-15T14:45:00Z",
    "created_at": "2024-01-15T14:30:00Z",
    "current_server": null,
    "points": [
      {
        "id": 1001,
        "sequence_in_set": 1,
        "scored_by": "player",
        "served_by": "player",
        "created_at": "2024-01-15T14:31:00Z",
        "tags": ["Dobry atak"]
      }
    ]
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this set
- `404 Not Found` - Set not found

---

#### POST /api/sets/{id}/finish

Finish a set. Validates that the set score is not tied. Automatically creates a new set if match is not finished.

**Path Parameters:**

- `id` (integer, required) - Set ID

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "coach_notes": "Optional coach notes for this set"
}
```

**Business Logic:**

- Validates that parent match status is `in_progress` (cannot finish set in finished match)
- Validates that set score is not tied
- Validates that this is not the last possible set (if it is, user must use finish match endpoint)
- Marks set as finished
- Determines winner based on score
- Records `finished_at` timestamp
- Updates match `sets_won_player` or `sets_won_opponent`
- Automatically creates next set with:
  - Incremented `sequence_in_match`
  - Score 0:0
  - Determined first server (alternating from first_server_first_set)
  - `is_golden` flag if applicable (last set when golden_set_enabled)

**Response Body (200 OK):**

```json
{
  "data": {
    "finished_set": {
      "id": 456,
      "is_finished": true,
      "winner": "player",
      "set_score_player": 11,
      "set_score_opponent": 8,
      "finished_at": "2024-01-15T14:45:00Z"
    },
    "next_set": {
      "id": 457,
      "sequence_in_match": 2,
      "is_golden": false,
      "set_score_player": 0,
      "set_score_opponent": 0,
      "is_finished": false,
      "current_server": "opponent"
    }
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this set
- `404 Not Found` - Set not found
- `422 Unprocessable Entity` - Cannot finish set: match is already finished, score is tied, or this is the last set (use finish match endpoint)

---

### 2.3. Points

#### GET /api/sets/{setId}/points

Retrieve all points for a specific set.

**Path Parameters:**

- `setId` (integer, required) - Set ID

**Query Parameters:**

- `include` (string, optional) - Include: `tags`

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": 1001,
      "set_id": 456,
      "sequence_in_set": 1,
      "scored_by": "player",
      "served_by": "player",
      "created_at": "2024-01-15T14:31:00Z",
      "tags": ["Dobry atak"]
    },
    {
      "id": 1002,
      "set_id": 456,
      "sequence_in_set": 2,
      "scored_by": "opponent",
      "served_by": "player",
      "created_at": "2024-01-15T14:31:30Z",
      "tags": ["Błąd serwisu"]
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this set
- `404 Not Found` - Set not found

---

#### POST /api/sets/{setId}/points

Add a point to a set. Automatically calculates and records the server, updates set score.

**Path Parameters:**

- `setId` (integer, required) - Set ID

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "scored_by": "player",
  "tag_ids": [5, 12]
}
```

**Validation Rules:**

- `scored_by` (required, enum: `player` or `opponent`)
- `tag_ids` (optional, array of integers) - Tag IDs to associate with this point

**Business Logic:**

- Validates that parent match status is `in_progress` (cannot add points to finished match)
- Validates that set is not finished
- Calculates `sequence_in_set` (last sequence + 1)
- Determines `served_by` based on serving rules:
  - First server determined by match/set configuration
  - Normal: alternates every 2 points
  - At 10:10: alternates every 1 point
  - Golden set: alternates every 1 point throughout
- Creates point record
- Creates point_tags associations
- Updates set score (`set_score_player` or `set_score_opponent`)
- Persists all changes transactionally

**Response Body (201 Created):**

```json
{
  "data": {
    "id": 1003,
    "set_id": 456,
    "sequence_in_set": 3,
    "scored_by": "player",
    "served_by": "player",
    "created_at": "2024-01-15T14:32:00Z",
    "tags": ["Dobry atak"],
    "set_state": {
      "set_score_player": 8,
      "set_score_opponent": 5,
      "current_server": "opponent"
    }
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this set
- `404 Not Found` - Set not found
- `422 Unprocessable Entity` - Match is already finished, set is already finished, or invalid tag IDs

---

#### DELETE /api/sets/{setId}/points/last

Undo the last point scored in a set. Removes the point and its tag associations, recalculates set score and server.

**Path Parameters:**

- `setId` (integer, required) - Set ID

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Business Logic:**

- Validates that parent match status is `in_progress` (cannot undo points in finished match)
- Validates that set has at least one point
- Validates that set is not finished
- Finds last point by `sequence_in_set` (highest number)
- Stores `served_by` from the point being deleted (this becomes the current server after deletion)
- Deletes point_tags associations
- Deletes point record
- Recalculates set score
- Sets current server to the stored `served_by` value (no need to recalculate from remaining points)
- Returns updated set state

**Response Body (200 OK):**

```json
{
  "data": {
    "deleted_point_id": 1003,
    "set_state": {
      "id": 456,
      "set_score_player": 7,
      "set_score_opponent": 5,
      "current_server": "player"
    }
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this set
- `404 Not Found` - Set not found
- `422 Unprocessable Entity` - Match is already finished, set has no points to undo, or set is already finished

---

### 2.4. Tags

#### GET /api/tags

Retrieve all available tags (global, shared across all users).

**Query Parameters:**

- `is_system` (boolean, optional) - Filter by system tags
- `sort` (string, optional, default: `order_in_list`) - Sort field

**Request Headers:**
(Authentication optional - tags are public)

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Błąd serwisu",
      "is_system": true,
      "order_in_list": 1,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Błąd odbioru",
      "is_system": true,
      "order_in_list": 2,
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": 3,
      "name": "Zła praca nóg",
      "is_system": true,
      "order_in_list": 3,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters

---

### 2.5. AI Reports

#### GET /api/matches/{matchId}/ai-report

Retrieve AI-generated report for a finished match.

**Path Parameters:**

- `matchId` (integer, required) - Match ID

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Response Body (200 OK):**

```json
{
  "data": {
    "id": 789,
    "match_id": 124,
    "ai_status": "success",
    "ai_summary": "Mecz był wyrównany w pierwszych dwóch setach. Zawodnik pokazał dobrą technikę w atakach forehandem, jednak miał problemy z odbiorami rotowanych serwisów. Trzeci i czwarty set wygrał dzięki lepszej pracy nóg i konsekwencji w grze.",
    "ai_recommendations": "1. Trenować odbiór rotowanych serwisów, szczególnie z prawej strony. 2. Pracować nad stabilnością w grze obronnej. 3. Zwiększyć agresywność w ataku backhandem. 4. Poprawić koncentrację przy wyniku 8:8 i wyższym.",
    "ai_error": null,
    "ai_generated_at": "2024-01-15T16:01:30Z",
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

**Response Body (200 OK - when AI generation pending):**

```json
{
  "data": {
    "id": 789,
    "match_id": 124,
    "ai_status": "pending",
    "ai_summary": null,
    "ai_recommendations": null,
    "ai_error": null,
    "ai_generated_at": null,
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

**Response Body (200 OK - when AI generation failed):**

```json
{
  "data": {
    "id": 789,
    "match_id": 124,
    "ai_status": "error",
    "ai_summary": null,
    "ai_recommendations": null,
    "ai_error": "OpenRouter API timeout",
    "ai_generated_at": null,
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this match
- `404 Not Found` - Match not found or AI report not available (match.generate_ai_summary was false)

---

### 2.6. Public Sharing

#### POST /api/matches/{matchId}/share

Generate or retrieve a public sharing link for a finished match.

**Path Parameters:**

- `matchId` (integer, required) - Match ID

**Request Headers:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Business Logic:**

- Validates that match is finished
- If public share already exists for this match, returns existing token
- If not exists, generates cryptographically random token (32 bytes, base64url encoded)
- Stores SHA-256 hash of token in database
- Returns full public URL

**Response Body (200 OK or 201 Created):**

```json
{
  "data": {
    "id": 345,
    "match_id": 124,
    "public_url": "https://spinflow.app/public/matches/a7b3c9d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "token": "a7b3c9d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "created_at": "2024-01-15T16:05:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this match
- `404 Not Found` - Match not found
- `422 Unprocessable Entity` - Match is not finished yet

---

#### GET /api/public/matches/{token}

Retrieve public view of a match (no authentication required).

**Path Parameters:**

- `token` (string, required) - Public share token

**Request Headers:**
(No authentication required)

**Response Body (200 OK):**

```json
{
  "data": {
    "match": {
      "id": 124,
      "player_name": "Jan Kowalski",
      "opponent_name": "Adam Nowak",
      "max_sets": 5,
      "golden_set_enabled": false,
      "sets_won_player": 3,
      "sets_won_opponent": 1,
      "status": "finished",
      "coach_notes": "Dobry mecz, widoczny postęp",
      "started_at": "2024-01-15T14:30:00Z",
      "ended_at": "2024-01-15T16:00:00Z"
    },
    "sets": [
      {
        "id": 456,
        "sequence_in_match": 1,
        "is_golden": false,
        "set_score_player": 11,
        "set_score_opponent": 8,
        "winner": "player",
        "coach_notes": "Dobry początek, agresywna gra",
        "finished_at": "2024-01-15T14:45:00Z",
        "points": [
          {
            "id": 1001,
            "sequence_in_set": 1,
            "scored_by": "player",
            "served_by": "player",
            "created_at": "2024-01-15T14:31:00Z",
            "tags": ["Dobry atak"]
          },
          {
            "id": 1002,
            "sequence_in_set": 2,
            "scored_by": "player",
            "served_by": "player",
            "created_at": "2024-01-15T14:31:15Z",
            "tags": []
          },
          {
            "id": 1003,
            "sequence_in_set": 3,
            "scored_by": "opponent",
            "served_by": "opponent",
            "created_at": "2024-01-15T14:31:30Z",
            "tags": ["Błąd serwisu"]
          }
        ]
      },
      {
        "id": 457,
        "sequence_in_match": 2,
        "is_golden": false,
        "set_score_player": 9,
        "set_score_opponent": 11,
        "winner": "opponent",
        "coach_notes": "Problemy z odbiorami rotowanych serwisów",
        "finished_at": "2024-01-15T15:00:00Z",
        "points": [
          {
            "id": 1020,
            "sequence_in_set": 1,
            "scored_by": "opponent",
            "served_by": "opponent",
            "created_at": "2024-01-15T14:46:00Z",
            "tags": ["Błąd odbioru", "Rotowany serwis"]
          },
          {
            "id": 1021,
            "sequence_in_set": 2,
            "scored_by": "player",
            "served_by": "opponent",
            "created_at": "2024-01-15T14:46:15Z",
            "tags": []
          }
        ]
      },
      {
        "id": 458,
        "sequence_in_match": 3,
        "is_golden": false,
        "set_score_player": 11,
        "set_score_opponent": 7,
        "winner": "player",
        "coach_notes": "Lepsza koncentracja",
        "finished_at": "2024-01-15T15:20:00Z",
        "points": [
          {
            "id": 1040,
            "sequence_in_set": 1,
            "scored_by": "player",
            "served_by": "player",
            "created_at": "2024-01-15T15:01:00Z",
            "tags": ["Dobry atak"]
          }
        ]
      },
      {
        "id": 459,
        "sequence_in_match": 4,
        "is_golden": false,
        "set_score_player": 11,
        "set_score_opponent": 5,
        "winner": "player",
        "coach_notes": "Dominacja w całym secie",
        "finished_at": "2024-01-15T15:35:00Z",
        "points": [
          {
            "id": 1060,
            "sequence_in_set": 1,
            "scored_by": "opponent",
            "served_by": "opponent",
            "created_at": "2024-01-15T15:21:00Z",
            "tags": []
          },
          {
            "id": 1061,
            "sequence_in_set": 2,
            "scored_by": "player",
            "served_by": "opponent",
            "created_at": "2024-01-15T15:21:15Z",
            "tags": ["Zła praca nóg"]
          }
        ]
      }
    ],
    "ai_report": {
      "ai_status": "success",
      "ai_summary": "Mecz rozpoczął się bardzo dobrze dla Jana Kowalskiego, który wygrał pierwszego seta pewnie 11:8 dzięki agresywnemu atakowi forehandem. W drugim secie pojawiły się problemy z odbiorami rotowanych serwisów przeciwnika, co przełożyło się na przegraną 9:11. Trzeci set pokazał poprawę w koncentracji i powrót do skutecznej gry ofensywnej. Czwarty set był zdecydowaną dominacją zawodnika, który kontrolował przebieg wymiany od pierwszego do ostatniego punktu. Łącznie zawodnik wygrał mecz 3:1, pokazując dobrą formę i umiejętność adaptacji do gry przeciwnika.",
      "ai_recommendations": "1. Intensywnie trenować odbiór rotowanych serwisów, szczególnie tych kierowanych na backhand. 2. Pracować nad utrzymaniem wysokiej koncentracji przez cały mecz, nie tylko w setach wygranych. 3. Kontynuować rozwój agresywnego ataku forehandem, który był kluczem do sukcesu. 4. Poprawić pracę nóg przy szybkich wymianach, co pozwoli na lepsze pozycjonowanie się do piłki. 5. Zwiększyć pewność siebie przy serwisie - mniej błędów serwisowych przełoży się na lepszą kontrolę nad meczem."
    }
  }
}
```

**Notes:**

- This endpoint always returns complete match data including all sets, points, and tags (no optional includes)
- Tags are returned as an array of strings (tag names only)
- AI report is included if available (status: success, pending, or error)
- No authentication required - access controlled by token validation only

**Error Responses:**

- `404 Not Found` - Invalid token or match has been deleted
- `410 Gone` - Match was deleted after sharing link was created

---

### 2.7. Dictionary

#### GET /api/dictionary/labels

Retrieve UI labels for enums and lookups.

**Query Parameters:**

- `domain` (string, optional) - Filter by domain (e.g., `side_enum`, `match_status_enum`)

**Request Headers:**
(Authentication optional - dictionary is public)

**Response Body (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "domain": "side_enum",
      "code": "player",
      "label": "Zawodnik"
    },
    {
      "id": 2,
      "domain": "side_enum",
      "code": "opponent",
      "label": "Rywal"
    },
    {
      "id": 3,
      "domain": "match_status_enum",
      "code": "in_progress",
      "label": "W toku"
    },
    {
      "id": 4,
      "domain": "match_status_enum",
      "code": "finished",
      "label": "Zakończony"
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters

---

### 2.8. Analytics

#### POST /api/analytics/events

Create an analytics event (internal API, called by backend logic).

**Request Headers:**

```
Authorization: Bearer {supabase_service_role_key}
Content-Type: application/json
```

**Request Body:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "match_finished",
  "match_id": 124
}
```

**Validation Rules:**

- `user_id` (required, uuid)
- `type` (required, enum: `login`, `match_created`, `match_finished`)
- `match_id` (optional, integer, required when type is `match_created` or `match_finished`)

**Response Body (201 Created):**

```json
{
  "data": {
    "id": 5003,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "match_finished",
    "match_id": 124,
    "created_at": "2024-01-15T16:00:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid service role key
- `403 Forbidden` - Not authorized (requires service role)
- `422 Unprocessable Entity` - Validation failed

---

## 3. Authentication and Authorization

### 3.1. Authentication Mechanism

**Provider:** Supabase Auth with Google OAuth

**Flow:**

1. User initiates login via Google on frontend
2. Frontend redirects to Supabase Auth endpoint
3. User authenticates with Google
4. Supabase returns JWT token
5. Frontend stores JWT token (httpOnly cookie or localStorage)
6. All subsequent API requests include JWT token in Authorization header

**Token Format:**

```
Authorization: Bearer {supabase_jwt_token}
```

**Token Validation:**

- All protected endpoints validate JWT token using Supabase Auth
- Token contains `user_id` (UUID) used for RLS and authorization
- Expired or invalid tokens return `401 Unauthorized`

### 3.2. Authorization Levels

**Level 1: Authenticated User**

- Access to own matches, sets, points
- Can create, read, update (limited), delete own resources
- Enforced by RLS policies in Supabase
- Backend validates `user_id` from JWT matches `user_id` in database

**Level 2: Public Access (No Auth)**

- Read-only access to shared matches via token
- Endpoints: `GET /api/public/matches/{token}`
- No user_id validation
- Token validation via `matches_public_share` table

**Level 3: Admin/Service Role**

- Write access to analytics events
- Endpoints: `POST /api/analytics/events`
- Uses Supabase service role key
- Bypasses RLS policies
- Analytics data analysis performed via direct SQL queries in Supabase (not through API)

### 3.3. Row-Level Security (RLS)

**Enabled on tables:**

- `matches`
- `sets`
- `points`
- `point_tags`
- `matches_ai_reports`
- `matches_public_share`

**RLS Policies (example for matches):**

```sql
-- SELECT
CREATE POLICY matches_select_own
  ON matches FOR SELECT
  USING (user_id = auth.uid());

-- INSERT
CREATE POLICY matches_insert_own
  ON matches FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE
CREATE POLICY matches_update_own
  ON matches FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE
CREATE POLICY matches_delete_own
  ON matches FOR DELETE
  USING (user_id = auth.uid());
```

**Tables without RLS:**

- `tags` (global, shared)
- `dic_lookup_labels` (global dictionary)
- `analytics_events` (admin-only, no policies for public/auth roles)

### 3.4. Security Considerations

**API Keys:**

- Supabase anon key: Used on frontend for authenticated requests
- Supabase service role key: Used on backend only, never exposed to frontend
- OpenRouter API key: Used on backend only for AI generation

**CORS:**

- Configure allowed origins for production domain
- Restrict to specific domains in production

**Rate Limiting:**

- Implement rate limiting on all endpoints
- Suggested limits:
  - Authenticated users: 100 requests/minute
  - Public endpoints: 20 requests/minute per IP
  - Analytics endpoint (POST only): 1000 requests/minute (service role only, internal use)

**Input Sanitization:**

- Validate and sanitize all user inputs
- Prevent SQL injection (using parameterized queries)
- Prevent XSS attacks (escape HTML in user-generated content)

**Token Security:**

- Public share tokens: 32 bytes, cryptographically random, base64url encoded
- Store SHA-256 hash in database (not plain token)
- No predictable patterns or incremental IDs

---

## 4. Validation and Business Logic

### 4.1. Validation Rules by Resource

#### Matches

- `player_name`: required, string, max 200 chars, not empty after trim
- `opponent_name`: required, string, max 200 chars, not empty after trim
- `max_sets`: required, integer, > 0, ≤ 7
- `golden_set_enabled`: required, boolean
- `first_server_first_set`: required, enum (`player`, `opponent`)
- `generate_ai_summary`: required, boolean
- `coach_notes`: optional, string, max 5000 chars

**Business Rules:**

- Cannot delete match with `status = in_progress` without confirmation
- Cannot change `max_sets`, `golden_set_enabled`, `first_server_first_set` after match created
- Cannot finish match if status is already `finished`
- Cannot finish match if current set score is tied
- Cannot finish match if overall set score is tied

#### Sets

- `coach_notes`: optional, string, max 5000 chars

**Business Rules:**

- Cannot manually create sets (created automatically by system)
- Cannot finish set if parent match is already finished
- Cannot finish set if score is tied
- Cannot finish set if it's the last possible set in match (must use finish match endpoint)
- Cannot add points to finished set
- Cannot delete set (cascade delete only via match deletion)

#### Points

- `scored_by`: required, enum (`player`, `opponent`)
- `tag_ids`: optional, array of integers, must reference existing tags

**Business Rules:**

- Cannot add point to finished match
- Cannot add point to finished set
- Cannot undo point in finished match
- Cannot delete arbitrary point (only last point in set)
- Server is calculated automatically based on serving rules
- Sequence in set is calculated automatically

#### Tags

- `name`: required, string, max 30 chars, unique
- `is_system`: required, boolean
- `order_in_list`: required, integer

**Business Rules:**

- Tags are global and shared across all users
- System tags cannot be modified or deleted
- MVP: no custom tags per user (all tags are system tags)

#### Public Shares

- `token`: required, string, 64 chars, unique, cryptographically random

**Business Rules:**

- Can only create share for finished match
- One share per match (idempotent operation)
- Share is valid until match is deleted
- No revocation mechanism in MVP

### 4.2. Business Logic Implementation

#### Server Calculation Algorithm

**Input:**

- Current set points history
- First server for the set
- Is golden set flag
- Current score

**Algorithm:**

```
1. Get total points scored in set (player + opponent)
2. Get first server for this set

IF is_golden_set:
  // Alternate every point
  IF total_points is even:
    RETURN first_server
  ELSE:
    RETURN opposite of first_server

ELSE:
  IF score is 10:10 or higher on both sides:
    // Alternate every point (deuce mode)
    IF total_points is even:
      RETURN first_server
    ELSE:
      RETURN opposite of first_server
  ELSE:
    // Alternate every 2 points
    serves_count = floor(total_points / 2)
    IF serves_count is even:
      RETURN first_server
    ELSE:
      RETURN opposite of first_server
```

**First Server for Set Determination:**

```
1. Get first_server_first_set from match
2. Get set sequence_in_match

IF sequence_in_match is odd:
  RETURN first_server_first_set
ELSE:
  RETURN opposite of first_server_first_set
```

#### AI Report Generation

**Trigger:** When `POST /api/matches/{id}/finish` is called with `generate_ai_summary = true`

**Process:**

1. Match is marked as finished
2. Backend creates `matches_ai_reports` record with `ai_status = pending`
3. Backend initiates asynchronous job (queue or background task)
4. Job prepares data payload:
   - Match metadata
   - All sets with scores and winners
   - All points with sequences, scored_by, served_by
   - All tags associated with points
   - Coach notes for match and sets
5. Job calls OpenRouter API with prepared prompt
6. On success:
   - Updates `ai_status = success`
   - Stores `ai_summary` and `ai_recommendations`
   - Records `ai_generated_at` timestamp
7. On error:
   - Updates `ai_status = error`
   - Stores `ai_error` message
   - No retry in MVP

**Timeout:** 30 seconds for AI API call

**Data Format for AI:**

```json
{
  "match": {
    "player_name": "Jan Kowalski",
    "opponent_name": "Adam Nowak",
    "max_sets": 5,
    "golden_set_enabled": false,
    "sets_won_player": 3,
    "sets_won_opponent": 1,
    "coach_notes": "Dobry mecz, widoczny postęp"
  },
  "sets": [
    {
      "sequence": 1,
      "score_player": 11,
      "score_opponent": 8,
      "winner": "player",
      "coach_notes": "Dobry początek"
    }
  ],
  "points": [
    {
      "set_sequence": 1,
      "point_sequence": 1,
      "scored_by": "player",
      "served_by": "player",
      "tags": ["Dobry atak"]
    }
  ]
}
```

#### Match Deletion Cascade

**Order of deletion:**

```
1. DELETE FROM point_tags WHERE point_id IN (SELECT id FROM points WHERE set_id IN (SELECT id FROM sets WHERE match_id = ?))
2. DELETE FROM points WHERE set_id IN (SELECT id FROM sets WHERE match_id = ?)
3. DELETE FROM sets WHERE match_id = ?
4. DELETE FROM matches_ai_reports WHERE match_id = ?
5. DELETE FROM matches_public_share WHERE match_id = ?
6. UPDATE analytics_events SET match_id = NULL WHERE match_id = ?
7. DELETE FROM matches WHERE id = ?
```

**Implementation:** All within a database transaction to ensure atomicity

#### Analytics Event Recording

**Events:**

1. `login` - Created when user successfully authenticates
2. `match_created` - Created when new match is created
3. `match_finished` - Created when match is finished

**Implementation:**

- Backend automatically records events
- Uses internal API with service role key
- Failures in analytics recording do not block user operations (fire-and-forget pattern)

### 4.3. Error Handling

#### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "player_name",
        "message": "Player name is required"
      },
      {
        "field": "max_sets",
        "message": "Max sets must be greater than 0"
      }
    ]
  }
}
```

#### Error Codes

**Authentication Errors (401):**

- `UNAUTHORIZED` - Missing or invalid authentication token
- `TOKEN_EXPIRED` - JWT token has expired

**Authorization Errors (403):**

- `FORBIDDEN` - User does not have access to this resource
- `INSUFFICIENT_PERMISSIONS` - Operation requires higher permissions

**Not Found Errors (404):**

- `NOT_FOUND` - Resource not found
- `MATCH_NOT_FOUND` - Match not found
- `SET_NOT_FOUND` - Set not found

**Validation Errors (422):**

- `VALIDATION_ERROR` - Input validation failed
- `BUSINESS_RULE_VIOLATION` - Business logic constraint violated
- `CANNOT_FINISH_SET_TIED` - Cannot finish set with tied score
- `CANNOT_FINISH_SET_MATCH_FINISHED` - Cannot finish set when match is already finished
- `CANNOT_FINISH_MATCH_TIED` - Cannot finish match with tied score
- `MATCH_ALREADY_FINISHED` - Cannot finish match that is already finished
- `CANNOT_MODIFY_FINISHED_MATCH` - Cannot add or remove points in finished match
- `SET_ALREADY_FINISHED` - Cannot modify finished set
- `NO_POINTS_TO_UNDO` - Set has no points to undo

**Server Errors (500):**

- `INTERNAL_SERVER_ERROR` - Unexpected server error
- `DATABASE_ERROR` - Database operation failed
- `AI_GENERATION_ERROR` - AI report generation failed (user-facing, when async job completes)

### 4.4. Data Consistency

**Transactional Operations:**

- Creating match with first set
- Adding point (point + point_tags + update set score)
- Finishing set (mark finished + determine set winner + update match score (sets_won_player/sets_won_opponent) + create new set)
- Finishing match (determine current set winner + mark current set finished + update match score + mark match finished + trigger AI)
- Deleting match (cascade delete all related records)
- Undoing last point (delete point + point_tags + recalculate current set score)

**Denormalized Data:**

- `matches.sets_won_player` and `matches.sets_won_opponent` updated when set or match finishes
- `sets.set_score_player` and `sets.set_score_opponent` updated when point is added/removed
- Denormalization improves read performance for lists and summaries
- Update logic must be atomic within transactions

**Eventual Consistency:**

- AI report generation is asynchronous
- `ai_status` field indicates current state: `pending`, `success`, `error`

---

## 5. Performance Considerations

### 5.1. Pagination

- Default page size: 20 items
- Maximum page size: 100 items
- Use offset-based pagination for MVP

### 5.2. Filtering and Sorting

- Indexes on foreign keys (match_id, set_id, user_id)
- Partial text search on player/opponent names (case-insensitive)

### 5.3. Nested Resource Loading

- Use `include` query parameter for optional nested resources
- Default responses contain minimal data
- Avoid N+1 queries by using JOINs or batch loading

### 5.4. Caching

- Tags and dictionary data can be cached aggressively (rarely change)

### 5.5. Rate Limiting

- Implement per-user rate limiting
- Separate limits for authenticated vs. public endpoints
- Return `429 Too Many Requests` with `Retry-After` header

---

## 6. Versioning

### 6.1. API Version Strategy - MVP

- No versioning in URL paths for MVP (e.g., `/api/matches` not `/api/v1/matches`)
- Single frontend client - no need for backward compatibility
- Breaking changes can be deployed simultaneously with frontend updates
- Version information available in response headers: `X-API-Version: 1.0.0`

### 6.2. Post-MVP Considerations

- If external integrations or mobile apps are added, consider introducing versioning in URL paths
- For future public API, implement semantic versioning strategy
- Current simplified approach reduces complexity for MVP development

---

## Appendix A: HTTP Status Codes Reference

| Status Code               | Meaning                 | Usage                                      |
| ------------------------- | ----------------------- | ------------------------------------------ |
| 200 OK                    | Success                 | Successful GET, PATCH, POST (non-creation) |
| 201 Created               | Resource created        | Successful POST creating new resource      |
| 204 No Content            | Success, no body        | Successful DELETE                          |
| 400 Bad Request           | Invalid request         | Malformed JSON, invalid query params       |
| 401 Unauthorized          | Authentication required | Missing or invalid token                   |
| 403 Forbidden             | Access denied           | User doesn't own resource                  |
| 404 Not Found             | Resource not found      | Invalid ID or deleted resource             |
| 422 Unprocessable Entity  | Validation failed       | Business rule violation                    |
| 429 Too Many Requests     | Rate limit exceeded     | Too many requests                          |
| 500 Internal Server Error | Server error            | Unexpected backend error                   |
| 503 Service Unavailable   | Service down            | Database or external service unavailable   |

---

## Appendix B: Enum Values Reference

### side_enum

- `player` - The evaluated player (zawodnik oceniany)
- `opponent` - The opponent (rywal)

### match_status_enum

- `in_progress` - Match is ongoing
- `finished` - Match is completed

### analytics_event_type_enum

- `login` - User login event
- `match_created` - Match creation event
- `match_finished` - Match completion event

### ai_status_enum

- `pending` - AI generation in progress
- `success` - AI generation completed successfully
- `error` - AI generation failed

---

## Appendix C: Business Logic Summary

1. **Match Creation:** Automatically creates first set with determined first server
2. **Point Addition:** Automatically calculates server, updates score, persists tags
3. **Point Undo:** Only last point in current set, recalculates score and server
4. **Set Finish:** Validates non-tied score, determines winner, auto-creates next set
5. **Match Finish:** Validates non-tied scores, finishes current set, triggers AI if enabled
6. **Server Algorithm:** Follows serving rules (2-2, 1-1 at 10:10, 1-1 for golden set)
7. **AI Generation:** Asynchronous, timeout 30s, no retry in MVP
8. **Public Sharing:** Cryptographic token, valid until match deleted, idempotent
9. **Analytics:** Fire-and-forget events, no blocking of user operations
10. **Cascade Delete:** Ordered deletion of related records in transaction
