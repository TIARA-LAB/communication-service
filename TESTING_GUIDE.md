# API Testing Guide

Complete guide for testing all endpoints in the Communication Service API.

---

## Table of Contents

1. [Setup](#setup)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Profile Endpoints](#profile-endpoints)
4. [Groups Endpoints](#groups-endpoints)
5. [Messages Endpoints](#messages-endpoints)
6. [Testing Methods](#testing-methods)
7. [Testing Workflow](#testing-workflow)
8. [WebSocket Testing (Messages)](#websocket-testing-messages)

---

## Setup

### Prerequisites

- Node.js (v18+)
- Docker (for database)
- Redis (for OTP/token blacklist)
- Postman or Curl
- VS Code (or any code editor)

### Environment Setup

1. **Start Docker containers:**

```bash
npm run db:dev:restart
```

2. **Start the development server:**

```bash
npm run start:dev
```

3. **Run migrations:**

```bash
npm run prisma:dev:deploy
```

The API will be available at `http://localhost:3000`

---

## Authentication Endpoints

### Endpoint 1: Request OTP

**POST** `/auth/request-otp`

**Description:** Send a 6-digit OTP to the user's email address.

**Request:**

```json
{
  "email": "user@example.com",
  "phone": "+2348129316522"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "+2348129316522"
  }'
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "data": {
    "retry_after": "60s"
  }
}
```

**Response (Error - 400):**

```json
{
  "statusCode": 400,
  "message": "Invalid email format",
  "error": "Bad Request"
}
```

**Notes:**

- Rate limit: 60 seconds between requests
- OTP is sent via email in production, logged in console in dev mode

---

### Endpoint 2: Verify OTP

**POST** `/auth/verify-otp`

**Description:** Verify the OTP and receive JWT access and refresh tokens.

**Request:**

```json
{
  "email": "user@example.com",
  "phone": "+2348129316522",
  "otp": "123456"
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "+2348129316522",
    "otp": "123456"
  }'
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "+2348129316522",
      "name": null,
      "avatar": null
    }
  }
}
```

**Notes:**

- To find the OTP in dev mode, check the server console logs
- Creates user automatically if not exists
- Access token expires in 15 minutes
- Refresh token expires in 30 days

---

### Endpoint 3: Refresh Token

**POST** `/auth/refresh-token`

**Description:** Refresh the access token using a valid refresh token.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Endpoint 4: Logout

**POST** `/auth/logout`

**Description:** Logout the user by blacklisting their JWT token.

**Request:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "token": "YOUR_ACCESS_TOKEN_HERE"
  }'
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

---

## Profile Endpoints

> **Note:** All profile endpoints require authentication. Add the `Authorization: Bearer YOUR_TOKEN` header to all requests.

### Endpoint 1: Get Profile

**GET** `/profile/me`

**Description:** Get current user's profile information.

**cURL:**

```bash
curl -X GET http://localhost:3000/profile/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success - 200):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "phone": "+2348129316522",
  "name": "John Doe",
  "bio": "Software developer",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2026-05-04T10:00:00Z",
  "updatedAt": "2026-05-04T10:30:00Z"
}
```

---

### Endpoint 2: Update Profile

**PATCH** `/profile/update`

**Description:** Update user's name or bio.

**Request:**

```json
{
  "name": "John Doe",
  "bio": "Software developer | Coffee enthusiast"
}
```

**cURL:**

```bash
curl -X PATCH http://localhost:3000/profile/update \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated",
    "bio": "Senior Software Developer"
  }'
```

**Response (Success - 200):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "phone": "+2348129316522",
  "name": "John Doe Updated",
  "bio": "Senior Software Developer",
  "avatar": "https://example.com/avatar.jpg"
}
```

---

### Endpoint 3: Upload Avatar

**POST** `/profile/avatar`

**Description:** Upload or update profile picture.

**Request:** Multipart form-data with file

**cURL:**

```bash
curl -X POST http://localhost:3000/profile/avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -F "file=@/path/to/image.jpg"
```

**Response (Success - 200):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "phone": "+2348129316522",
  "avatar": "./uploads/profiles/avatar-1714819200000.jpg"
}
```

---

### Endpoint 4: List All Users (Testing Only)

**GET** `/profile/all/list`

**Description:** Get all users (internal endpoint for testing).

**cURL:**

```bash
curl -X GET http://localhost:3000/profile/all/list \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success - 200):**

```json
[
  {
    "id": 1,
    "name": "John Doe",
    "phone": "+2348129316522"
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "phone": "+2348129316523"
  }
]
```

---

## Groups Endpoints

> **Note:** All group endpoints require authentication.

### Endpoint 1: Create Group

**POST** `/groups/create`

**Description:** Create a new group.

**Request:**

```json
{
  "name": "Team Alpha",
  "description": "Project discussion group",
  "memberIds": [2, 3]
}
```

**cURL:**

```bash
curl -X POST http://localhost:3000/groups/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Alpha",
    "description": "Project discussion group",
    "memberIds": [2, 3]
  }'
```

**Response (Success - 201):**

```json
{
  "id": 1,
  "name": "Team Alpha",
  "description": "Project discussion group",
  "creatorId": 1,
  "createdAt": "2026-05-04T10:00:00Z",
  "members": [
    { "id": 1, "name": "John Doe" },
    { "id": 2, "name": "Jane Smith" },
    { "id": 3, "name": "Bob Johnson" }
  ]
}
```

---

### Endpoint 2: Get My Groups

**GET** `/groups/my-groups`

**Description:** Get all groups for current user.

**cURL:**

```bash
curl -X GET http://localhost:3000/groups/my-groups \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success - 200):**

```json
[
  {
    "id": 1,
    "name": "Team Alpha",
    "description": "Project discussion group",
    "creatorId": 1,
    "members": []
  },
  {
    "id": 2,
    "name": "Friends",
    "description": null,
    "creatorId": 2,
    "members": []
  }
]
```

---

### Endpoint 3: Add Member to Group

**POST** `/groups/:id/add/:userId`

**Description:** Add a member to a group.

**cURL:**

```bash
curl -X POST http://localhost:3000/groups/1/add/4 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "User successfully added to group",
  "data": {
    "groupId": 1,
    "userId": 4
  }
}
```

---

## Messages Endpoints

> **Note:** All message endpoints require authentication.

### Endpoint 1: Send Message

**POST** `/messages/send`

**Description:** Send a message with optional file attachment.

**Request:** Multipart form-data or JSON

**JSON Request:**

```json
{
  "receiverId": 2,
  "content": "Hello, how are you?",
  "type": "TEXT"
}
```

**With File (cURL):**

```bash
curl -X POST http://localhost:3000/messages/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -F "receiverId=2" \
  -F "content=Check this image" \
  -F "type=IMAGE" \
  -F "file=@/path/to/image.jpg"
```

**JSON (without file):**

```bash
curl -X POST http://localhost:3000/messages/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": 2,
    "content": "Hello!",
    "type": "TEXT"
  }'
```

**Response (Success - 201):**

```json
{
  "id": 1,
  "content": "Hello!",
  "type": "TEXT",
  "senderId": 1,
  "receiverId": 2,
  "fileUrl": null,
  "createdAt": "2026-05-04T10:00:00Z"
}
```

**Message Types:** `TEXT`, `IMAGE`, `VIDEO`, `FILE`

---

### Endpoint 2: Get Inbox

**GET** `/messages/inbox`

**Description:** Get the latest conversations.

**cURL:**

```bash
curl -X GET http://localhost:3000/messages/inbox \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success - 200):**

```json
[
  {
    "userId": 2,
    "userName": "Jane Smith",
    "lastMessage": "See you later!",
    "lastMessageTime": "2026-05-04T11:30:00Z",
    "unreadCount": 2
  },
  {
    "userId": 3,
    "userName": "Bob Johnson",
    "lastMessage": "Thanks!",
    "lastMessageTime": "2026-05-04T09:20:00Z",
    "unreadCount": 0
  }
]
```

---

### Endpoint 3: Get Chat History

**GET** `/messages/history/:partnerId`

**Description:** Get chat history with a specific user.

**Query Parameters:**

- `cursor` (optional): Pagination cursor for loading more messages

**cURL:**

```bash
# Get first 20 messages
curl -X GET "http://localhost:3000/messages/history/2" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"

# Get next batch with cursor
curl -X GET "http://localhost:3000/messages/history/2?cursor=100" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success - 200):**

```json
{
  "messages": [
    {
      "id": 1,
      "content": "Hello!",
      "type": "TEXT",
      "senderId": 1,
      "receiverId": 2,
      "fileUrl": null,
      "createdAt": "2026-05-04T10:00:00Z",
      "isEdited": false
    },
    {
      "id": 2,
      "content": "Hi there!",
      "type": "TEXT",
      "senderId": 2,
      "receiverId": 1,
      "fileUrl": null,
      "createdAt": "2026-05-04T10:05:00Z",
      "isEdited": false
    }
  ],
  "nextCursor": 3,
  "hasMore": true
}
```

---

### Endpoint 4: Search Messages

**GET** `/messages/search`

**Description:** Search messages across conversations.

**Query Parameters:**

- `q` (required): Search query
- `partnerId` (optional): Search within specific conversation

**cURL:**

```bash
# Search all messages
curl -X GET "http://localhost:3000/messages/search?q=hello" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"

# Search within conversation
curl -X GET "http://localhost:3000/messages/search?q=hello&partnerId=2" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success - 200):**

```json
[
  {
    "id": 1,
    "content": "Hello!",
    "type": "TEXT",
    "senderId": 1,
    "receiverId": 2,
    "createdAt": "2026-05-04T10:00:00Z"
  }
]
```

---

### Endpoint 5: Edit Message

**PATCH** `/messages/:id/edit`

**Description:** Edit a message content.

**Request:**

```json
{
  "content": "Updated message content"
}
```

**cURL:**

```bash
curl -X PATCH http://localhost:3000/messages/1/edit \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated message"
  }'
```

**Response (Success - 200):**

```json
{
  "id": 1,
  "content": "Updated message",
  "type": "TEXT",
  "senderId": 1,
  "receiverId": 2,
  "isEdited": true,
  "editedAt": "2026-05-04T10:30:00Z"
}
```

---

### Endpoint 6: Revoke Message (Delete for Everyone)

**DELETE** `/messages/:id/revoke`

**Description:** Delete a message for all users.

**cURL:**

```bash
curl -X DELETE http://localhost:3000/messages/1/revoke \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Message revoked successfully"
}
```

---

## Testing Methods

### 1. Using cURL (Command Line)

**Pros:** Quick, no setup needed
**Cons:** Less organized for multiple tests

Example workflow:

```bash
# Step 1: Request OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "phone": "+2348129316522"}'

# Step 2: Check console for OTP and verify
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "phone": "+2348129316522", "otp": "123456"}'

# Step 3: Save the token and use it
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
curl -X GET http://localhost:3000/profile/me \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. Using Postman

**Pros:** GUI, organized, easy visualization
**Cons:** Requires installation

**Steps:**

1. Open Postman
2. Create a new collection: "Communication Service API"
3. Add requests organized by folder:
   - Authentication
   - Profile
   - Groups
   - Messages

4. **Set environment variables:**
   - Go to Environments → Create New
   - Add variable: `baseUrl` = `http://localhost:3000`
   - Add variable: `accessToken` = (will be filled after login)

5. **For each request:**
   - Use `{{baseUrl}}` for base URL
   - Use `{{accessToken}}` in Authorization header

6. **Example: Get Profile**
   - Method: GET
   - URL: `{{baseUrl}}/profile/me`
   - Headers:
     - Authorization: `Bearer {{accessToken}}`

---

### 3. Using Jest E2E Tests

**Run existing tests:**

```bash
npm run test:e2e
```

**Create new test file** `test/endpoints.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import * as request from 'supertest';

describe('API Endpoints (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('POST /auth/request-otp', () => {
      return request(app.getHttpServer())
        .post('/auth/request-otp')
        .send({
          email: 'test@example.com',
          phone: '+2348129316522',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.retry_after).toBeDefined();
        });
    });

    it('POST /auth/verify-otp', () => {
      return request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({
          email: 'test@example.com',
          phone: '+2348129316522',
          otp: '123456',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.accessToken).toBeDefined();
          expect(res.body.data.refreshToken).toBeDefined();
          accessToken = res.body.data.accessToken;
          refreshToken = res.body.data.refreshToken;
        });
    });
  });

  describe('Profile', () => {
    it('GET /profile/me', () => {
      return request(app.getHttpServer())
        .get('/profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBeDefined();
          expect(res.body.phone).toBeDefined();
        });
    });

    it('PATCH /profile/update', () => {
      return request(app.getHttpServer())
        .patch('/profile/update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test User',
          bio: 'Test bio',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Test User');
        });
    });
  });

  describe('Messages', () => {
    it('POST /messages/send', () => {
      return request(app.getHttpServer())
        .post('/messages/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          receiverId: 2,
          content: 'Test message',
          type: 'TEXT',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.content).toBe('Test message');
        });
    });

    it('GET /messages/inbox', () => {
      return request(app.getHttpServer())
        .get('/messages/inbox')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
```

**Run specific test file:**

```bash
npm run test:e2e -- endpoints.e2e-spec
```

---

## Testing Workflow

### Complete Flow Example

**1. Setup:**

```bash
npm run start:dev
```

**2. Create two test users:**

User 1:

```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@example.com", "phone": "+2348129316521"}'

# Get OTP from console and verify
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@example.com", "phone": "+2348129316521", "otp": "YOUR_OTP"}'
```

User 2:

```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user2@example.com", "phone": "+2348129316522"}'

# Get OTP from console and verify
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user2@example.com", "phone": "+2348129316522", "otp": "YOUR_OTP"}'
```

**3. Test Groups:**

```bash
curl -X POST http://localhost:3000/groups/create \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Group", "memberIds": [2]}'
```

**4. Test Messages:**

```bash
# User 1 sends a message to User 2
curl -X POST http://localhost:3000/messages/send \
  -H "Authorization: Bearer USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverId": 2, "content": "Hello User 2!", "type": "TEXT"}'

# User 2 checks inbox
curl -X GET http://localhost:3000/messages/inbox \
  -H "Authorization: Bearer USER2_TOKEN"

# Get chat history
curl -X GET http://localhost:3000/messages/history/1 \
  -H "Authorization: Bearer USER2_TOKEN"
```

---

## WebSocket Testing (Messages)

Real-time messaging uses WebSocket (Socket.IO)

### Connect to WebSocket

**JavaScript Client Example:**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_ACCESS_TOKEN',
  },
});

// Listen for events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('message:new', (data) => {
  console.log('New message:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Send message via WebSocket
socket.emit('message:send', {
  receiverId: 2,
  content: 'Hello via WebSocket!',
  type: 'TEXT',
});
```

**Testing with Postman (Advanced):**

1. Go to "New" → "WebSocket Request"
2. URL: `ws://localhost:3000/socket.io/?token=YOUR_TOKEN`
3. Configure authentication in the headers
4. Send events and listen for responses

---

## Tips for Testing

1. **Save tokens as environment variables:**

   ```bash
   export ACCESS_TOKEN="your-token-here"
   export API_URL="http://localhost:3000"
   ```

2. **Check server logs for dev info:**
   - OTP codes
   - Error details
   - WebSocket connections

3. **Use test data:**
   - Phone: +2348129316521, +2348129316522, +2348129316523
   - Emails: test@example.com, user1@example.com, etc.

4. **Reset database:**

   ```bash
   npm run db:dev:restart
   ```

5. **Check uploaded files:**
   - Avatars: `./uploads/profiles/`
   - Messages: `./uploads/`

---

## Common Issues & Solutions

| Issue                      | Solution                                                   |
| -------------------------- | ---------------------------------------------------------- |
| "Invalid OTP"              | Check server console for the OTP code generated            |
| "Rate limit exceeded"      | Wait 60 seconds before requesting another OTP              |
| "Unauthorized"             | Ensure token is in header as `Authorization: Bearer TOKEN` |
| "Invalid token"            | Token may have expired, use refresh token endpoint         |
| File upload fails          | Check file size and ensure `/uploads` directory exists     |
| WebSocket connection fails | Verify token is valid and passed in auth                   |

---

## Next Steps

1. Set up Postman collection for easier testing
2. Create automated E2E tests for workflow validation
3. Set up CI/CD pipeline with automated tests
4. Document API response schemas for frontend team
5. Generate API documentation using Swagger UI (already enabled)

---

Swagger API Documentation is available at: `http://localhost:3000/api`
