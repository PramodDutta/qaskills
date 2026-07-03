---
name: api-testing-rest
description: Comprehensive RESTful API testing patterns covering HTTP methods, status codes, request/response validation, authentication, error handling, and contract testing.
license: MIT
metadata:
  author: thetestingacademy
  version: 1.0.0
  source: https://qaskills.sh/skills/thetestingacademy/api-testing-rest
---

# API Testing REST Skill

You are an expert QA engineer specializing in REST API testing. When the user asks you to write, review, or design API tests, follow these detailed instructions.

## Core Principles

1. **Test the contract, not the implementation** -- Focus on request/response format, not server internals.
2. **Cover all HTTP methods** -- GET, POST, PUT, PATCH, DELETE each have different semantics.
3. **Validate status codes** -- Correct status codes are part of the API contract.
4. **Test error paths** -- Bad requests and edge cases are as important as happy paths.
5. **Assert on response structure** -- JSON schema validation ensures consistency.

## REST API Fundamentals

### HTTP Methods and Their Semantics

```
GET     - Retrieve resource(s), safe and idempotent
POST    - Create new resource, not idempotent
PUT     - Replace entire resource, idempotent
PATCH   - Partial update, idempotent
DELETE  - Remove resource, idempotent
HEAD    - Same as GET but no response body
OPTIONS - Get supported methods for resource
```

### HTTP Status Codes

```
Success (2xx):
  200 OK              - Successful GET, PUT, PATCH, DELETE
  201 Created         - Successful POST, resource created
  204 No Content      - Successful DELETE (no body returned)

Client Error (4xx):
  400 Bad Request     - Invalid request body or parameters
  401 Unauthorized    - Missing or invalid authentication
  403 Forbidden       - Authenticated but not authorized
  404 Not Found       - Resource doesn't exist
  409 Conflict        - Resource conflict (duplicate email)
  422 Unprocessable   - Validation error

Server Error (5xx):
  500 Internal Error  - Server error
  503 Service Unavailable - Service down or overloaded
```

## Testing Patterns with Different Tools

### 1. JavaScript/TypeScript with Axios/Fetch

```typescript
// api-client.ts
import axios from 'axios';

export class ApiClient {
  private baseURL = 'https://api.example.com';
  private authToken: string | null = null;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
    };
  }

  async get(endpoint: string, params = {}) {
    const response = await axios.get(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(),
      params,
    });
    return response;
  }

  async post(endpoint: string, data: any) {
    const response = await axios.post(`${this.baseURL}${endpoint}`, data, {
      headers: this.getHeaders(),
    });
    return response;
  }

  async put(endpoint: string, data: any) {
    const response = await axios.put(`${this.baseURL}${endpoint}`, data, {
      headers: this.getHeaders(),
    });
    return response;
  }

  async delete(endpoint: string) {
    const response = await axios.delete(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(),
    });
    return response;
  }
}
```

```typescript
// users.api.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { ApiClient } from './api-client';

describe('Users API', () => {
  const api = new ApiClient();
  let createdUserId: string;

  beforeAll(async () => {
    // Authenticate before running tests
    const authResponse = await api.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    api.setAuthToken(authResponse.data.token);
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
      };

      const response = await api.post('/api/users', userData);

      // Assert status code
      expect(response.status).toBe(201);

      // Assert response structure
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('email', userData.email);
      expect(response.data).toHaveProperty('name', userData.name);
      expect(response.data).toHaveProperty('createdAt');

      // Assert response types
      expect(typeof response.data.id).toBe('string');
      expect(response.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Save for cleanup
      createdUserId = response.data.id;
    });

    it('should return 400 for invalid email', async () => {
      try {
        await api.post('/api/users', {
          email: 'invalid-email',
          name: 'Test',
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toContain('email');
      }
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'Duplicate User',
      };

      // Create first user
      await api.post('/api/users', userData);

      // Attempt to create duplicate
      try {
        await api.post('/api/users', userData);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error).toContain('already exists');
      }
    });
  });

  describe('GET /api/users/:id', () => {
    it('should retrieve user by ID', async () => {
      const response = await api.get(`/api/users/${createdUserId}`);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(createdUserId);
      expect(response.data).toHaveProperty('email');
      expect(response.data).toHaveProperty('name');
    });

    it('should return 404 for non-existent user', async () => {
      try {
        await api.get('/api/users/non-existent-id');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('GET /api/users', () => {
    it('should list all users', async () => {
      const response = await api.get('/api/users');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Validate structure of first user
      const firstUser = response.data[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).toHaveProperty('name');
    });

    it('should support pagination', async () => {
      const response = await api.get('/api/users', {
        page: 1,
        limit: 10,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('items');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page', 1);
      expect(response.data).toHaveProperty('limit', 10);
      expect(response.data.items.length).toBeLessThanOrEqual(10);
    });

    it('should support filtering', async () => {
      const response = await api.get('/api/users', {
        role: 'admin',
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);

      // All users should be admins
      response.data.forEach((user: any) => {
        expect(user.role).toBe('admin');
      });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user completely', async () => {
      const updatedData = {
        email: 'updated@example.com',
        name: 'Updated Name',
        role: 'admin',
      };

      const response = await api.put(`/api/users/${createdUserId}`, updatedData);

      expect(response.status).toBe(200);
      expect(response.data.email).toBe(updatedData.email);
      expect(response.data.name).toBe(updatedData.name);
      expect(response.data.role).toBe(updatedData.role);
    });

    it('should return 404 for non-existent user', async () => {
      try {
        await api.put('/api/users/non-existent', { name: 'Test' });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      const response = await api.delete(`/api/users/${createdUserId}`);

      expect(response.status).toBe(204);

      // Verify deletion
      try {
        await api.get(`/api/users/${createdUserId}`);
        fail('User should be deleted');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should return 404 when deleting non-existent user', async () => {
      try {
        await api.delete('/api/users/non-existent');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });
});
```

### 2. Python with requests/pytest

```python
# api_client.py
import requests
from typing import Dict, Any, Optional

class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token: Optional[str] = None

    def set_auth_token(self, token: str):
        """Set authentication token for all requests."""
        self.auth_token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})

    def get(self, endpoint: str, params: Optional[Dict] = None) -> requests.Response:
        """Perform GET request."""
        url = f"{self.base_url}{endpoint}"
        return self.session.get(url, params=params)

    def post(self, endpoint: str, data: Dict[str, Any]) -> requests.Response:
        """Perform POST request."""
        url = f"{self.base_url}{endpoint}"
        return self.session.post(url, json=data)

    def put(self, endpoint: str, data: Dict[str, Any]) -> requests.Response:
        """Perform PUT request."""
        url = f"{self.base_url}{endpoint}"
        return self.session.put(url, json=data)

    def delete(self, endpoint: str) -> requests.Response:
        """Perform DELETE request."""
        url = f"{self.base_url}{endpoint}"
        return self.session.delete(url)
```

```python
# test_users_api.py
import pytest
from api_client import ApiClient

@pytest.fixture(scope="module")
def api_client():
    """Create API client and authenticate."""
    client = ApiClient("https://api.example.com")

    # Authenticate
    response = client.post("/auth/login", {
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    client.set_auth_token(response.json()["token"])

    return client

@pytest.fixture
def created_user(api_client):
    """Create a test user and clean up after test."""
    response = api_client.post("/api/users", {
        "email": "testuser@example.com",
        "name": "Test User",
    })
    user_id = response.json()["id"]

    yield user_id

    # Cleanup
    api_client.delete(f"/api/users/{user_id}")

class TestUsersAPI:
    """Test suite for Users API."""

    def test_create_user_success(self, api_client):
        """Should create a new user with valid data."""
        # Arrange
        user_data = {
            "email": "newuser@example.com",
            "name": "New User",
            "role": "user",
        }

        # Act
        response = api_client.post("/api/users", user_data)

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["email"] == user_data["email"]
        assert data["name"] == user_data["name"]
        assert "createdAt" in data

        # Cleanup
        api_client.delete(f"/api/users/{data['id']}")

    def test_create_user_invalid_email(self, api_client):
        """Should return 400 for invalid email."""
        response = api_client.post("/api/users", {
            "email": "invalid-email",
            "name": "Test User",
        })

        assert response.status_code == 400
        assert "error" in response.json()

    def test_get_user_by_id(self, api_client, created_user):
        """Should retrieve user by ID."""
        response = api_client.get(f"/api/users/{created_user}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_user
        assert "email" in data
        assert "name" in data

    def test_get_user_not_found(self, api_client):
        """Should return 404 for non-existent user."""
        response = api_client.get("/api/users/non-existent-id")
        assert response.status_code == 404

    def test_list_users(self, api_client):
        """Should list all users."""
        response = api_client.get("/api/users")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]
        assert "email" in data[0]

    def test_update_user(self, api_client, created_user):
        """Should update user data."""
        updated_data = {
            "email": "updated@example.com",
            "name": "Updated Name",
        }

        response = api_client.put(f"/api/users/{created_user}", updated_data)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == updated_data["email"]
        assert data["name"] == updated_data["name"]

    def test_delete_user(self, api_client, created_user):
        """Should delete user."""
        response = api_client.delete(f"/api/users/{created_user}")

        assert response.status_code == 204

        # Verify deletion
        get_response = api_client.get(f"/api/users/{created_user}")
        assert get_response.status_code == 404
```

### 3. Java with REST Assured

```java
// UserApiTest.java
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.junit.jupiter.api.*;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class UserApiTest {

    private static String authToken;
    private static String createdUserId;

    @BeforeAll
    public static void setup() {
        RestAssured.baseURI = "https://api.example.com";

        // Authenticate
        Response authResponse = given()
            .contentType("application/json")
            .body("{ \"email\": \"test@example.com\", \"password\": \"password123\" }")
        .when()
            .post("/auth/login")
        .then()
            .statusCode(200)
            .extract().response();

        authToken = authResponse.jsonPath().getString("token");
    }

    @Test
    @Order(1)
    public void testCreateUser() {
        String requestBody = """
            {
                "email": "newuser@example.com",
                "name": "New User",
                "role": "user"
            }
            """;

        Response response = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType("application/json")
            .body(requestBody)
        .when()
            .post("/api/users")
        .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("email", equalTo("newuser@example.com"))
            .body("name", equalTo("New User"))
            .body("createdAt", matchesPattern("\\d{4}-\\d{2}-\\d{2}T.*"))
            .extract().response();

        createdUserId = response.jsonPath().getString("id");
    }

    @Test
    @Order(2)
    public void testGetUser() {
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get("/api/users/" + createdUserId)
        .then()
            .statusCode(200)
            .body("id", equalTo(createdUserId))
            .body("email", notNullValue())
            .body("name", notNullValue());
    }

    @Test
    @Order(3)
    public void testUpdateUser() {
        String updateBody = """
            {
                "email": "updated@example.com",
                "name": "Updated Name"
            }
            """;

        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType("application/json")
            .body(updateBody)
        .when()
            .put("/api/users/" + createdUserId)
        .then()
            .statusCode(200)
            .body("email", equalTo("updated@example.com"))
            .body("name", equalTo("Updated Name"));
    }

    @Test
    @Order(4)
    public void testDeleteUser() {
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .delete("/api/users/" + createdUserId)
        .then()
            .statusCode(204);

        // Verify deletion
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get("/api/users/" + createdUserId)
        .then()
            .statusCode(404);
    }
}
```

## JSON Schema Validation

```typescript
import Ajv from 'ajv';

const userSchema = {
  type: 'object',
  required: ['id', 'email', 'name', 'createdAt'],
  properties: {
    id: { type: 'string', pattern: '^[a-zA-Z0-9-]+$' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', minLength: 1 },
    role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
};

test('should match user schema', async () => {
  const response = await api.get('/api/users/123');

  const ajv = new Ajv();
  const validate = ajv.compile(userSchema);
  const valid = validate(response.data);

  expect(valid).toBe(true);
  if (!valid) {
    console.error(validate.errors);
  }
});
```

## Best Practices

1. **Test all CRUD operations** -- Create, Read, Update, Delete for each resource.
2. **Validate response schemas** -- Use JSON Schema validation.
3. **Test authentication/authorization** -- Verify protected endpoints.
4. **Test error responses** -- 4xx and 5xx scenarios are critical.
5. **Use fixtures for test data** -- Create and clean up test data.
6. **Test pagination and filtering** -- Verify query parameters work correctly.
7. **Assert on headers** -- Content-Type, Cache-Control, etc.
8. **Test idempotency** -- PUT/DELETE should be repeatable.
9. **Verify status codes** -- Correct codes are part of the contract.
10. **Clean up test data** -- Don't pollute the database.

## Anti-Patterns to Avoid

1. **Not testing error cases** -- Happy path alone is insufficient.
2. **Hardcoding IDs** -- Use dynamic test data.
3. **Not cleaning up** -- Test data should be removed after tests.
4. **Testing against production** -- Always use test/staging environments.
5. **Ignoring response times** -- Performance matters.
6. **Not validating response structure** -- Schema validation is essential.
7. **Sharing state between tests** -- Each test should be independent.
8. **Not testing edge cases** -- Empty lists, large payloads, special characters.
9. **Ignoring HTTP semantics** -- Use correct methods and status codes.
10. **Not documenting assumptions** -- Comment on expected API behavior.

REST API testing ensures your backend contract is solid and reliable. Test thoroughly, validate rigorously.
