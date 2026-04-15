# Authentication API Documentation

## Email-Based OTP Authentication with Refresh Tokens

This implementation provides a complete email and phone-number-based authentication system with JWT access and refresh tokens.

### Endpoints

#### 1. Request OTP

**Endpoint:** `POST /auth/request-otp`

**Description:** Send a 6-digit OTP to the user's email address.

**Request Body:**

```json
{
  "email": "user@example.com",
  "phone": "+2348129316522"
}
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

**Rate Limiting:** Users must wait 60 seconds between OTP requests.

---

#### 2. Verify OTP

**Endpoint:** `POST /auth/verify-otp`

**Description:** Verify the OTP and receive JWT access and refresh tokens. Creates a new user if not exists.

**Request Body:**

```json
{
  "email": "user@example.com",
  "phone": "+2348129316522",
  "otp": "123456"
}
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
      "id": "uuid-here",
      "email": "user@example.com",
      "phone": "+2348129316522",
      "name": null,
      "avatar": null
    }
  }
}
```

**Response (Error - 400):**

```json
{
  "statusCode": 400,
  "message": "Invalid OTP",
  "error": "Bad Request"
}
```

**Token Expiration:** Access tokens expire in 15 minutes, refresh tokens expire in 30 days.

---

#### 3. Refresh Token

**Endpoint:** `POST /auth/refresh-token`

**Description:** Refresh the access token using a valid refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
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

**Response (Error - 401):**

```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

---

#### 4. Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logout the user by blacklisting their JWT token (access or refresh token).

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": {}
}
```

**Response (Error - 401):**

```json
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}
```

---

## Authentication Flow Diagram

```
1. User requests OTP
   ├─ Phone validation
   ├─ Rate limiting check
   ├─ Generate 6-digit OTP
   ├─ Store in Redis (5 min TTL)
   └─ Send via SMS

2. User verifies OTP
   ├─ Phone validation
   ├─ Redis OTP lookup
   ├─ OTP comparison
   ├─ Create/Fetch user from DB
   ├─ Generate JWT token (7d expiry)
   ├─ Delete OTP from Redis
   └─ Return token + user data

3. User logout
   ├─ JWT verification
   ├─ Blacklist token in Redis
   └─ Token expires automatically
```

---

## Implementation Details

### Dependencies

- `@nestjs/jwt` - JWT token generation and verification
- `@nestjs-modules/ioredis` - Redis for OTP and token blacklist storage
- `libphonenumber-js` - Phone number validation and formatting
- `@prisma/client` - Database ORM
- SMS Service - Termii (configured, mocked in dev mode)

### Security Features

1. **Phone Number Validation** - Uses libphonenumber-js for E.164 format
2. **Rate Limiting** - 60-second throttle between OTP requests
3. **OTP Expiration** - OTP expires after 5 minutes
4. **Token Blacklisting** - Logged-out tokens are blacklisted in Redis
5. **Token Expiration** - JWT tokens expire after 7 days
6. **Secure Secret** - JWT secret configurable via environment variable

### Environment Variables Required

```
JWT_SECRET=your-secret-key-min-32-characters
REDIS_HOST=localhost
DATABASE_URL=mysql://user:password@localhost:3306/db_name
TERMII_API_KEY=your_api_key (for production SMS)
```

---

## Protected Routes Example

To protect routes with JWT authentication, use the `JwtAuthGuard`:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return user; // { sub: 'user-id', phone: '+234...', iat: ..., exp: ... }
  }
}
```

---

## Testing the Endpoints

### 1. Request OTP

```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348129316522"}'
```

### 2. Verify OTP (check logs for OTP in dev mode)

```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348129316522", "otp": "123456"}'
```

### 3. Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"token": "your-jwt-token-here"}'
```

---

## Files Modified/Created

- ✅ `src/auth/auth.controller.ts` - Added verify-otp and logout routes
- ✅ `src/auth/auth.service.ts` - Implemented verifyOtp() and logout() methods
- ✅ `src/auth/auth.module.ts` - Added JwtModule configuration
- ✅ `src/auth/dto/verify-otp.dto.ts` - Created DTO for verify-otp endpoint
- ✅ `src/auth/dto/logout.dto.ts` - Created DTO for logout endpoint
- ✅ `src/auth/guards/jwt-auth.guard.ts` - Created guard for protecting routes
- ✅ `src/auth/decorators/current-user.decorator.ts` - Created decorator for extracting user from token
