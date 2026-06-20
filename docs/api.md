# Backend API

## `GET /api/health`

Returns backend status.

## `GET /api/projects`

Lists assessed projects stored in memory.

## `GET /api/projects/:id`

Returns one assessed project.

## `GET /api/leaderboard`

Returns sellers ranked by trust score.

## `POST /api/projects/assess`

Assess a seller-submitted carbon project.

Example payload:

```json
{
  "sellerName": "Siam Green Energy",
  "projectName": "Surat Mangrove Restoration",
  "province": "SuratThani",
  "landAreaRai": 250,
  "projectType": "mangrove",
  "requestedCredits": 900,
  "selfReportedReduction": 820,
  "vintageYear": 2026
}
```
