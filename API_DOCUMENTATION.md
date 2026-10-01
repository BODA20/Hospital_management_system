# 🏥 Hospital Management System — API Reference

> **Base URL:** `http://localhost:5000/api/v1`  
> **Auth Scheme:** Bearer JWT (`Authorization: Bearer <accessToken>`)  
> **Content-Type:** `application/json` (unless noted)  
> **Rate Limiting:** Auth endpoints — 20 requests per 15-minute window  
> **API Version:** v1

---

## 📑 Table of Contents

1. [Authentication](#1-authentication)
2. [Users & Profile](#2-users--profile)
3. [Admin Operations](#3-admin-operations)
4. [Departments](#4-departments)
5. [Doctors](#5-doctors)
6. [Nurses](#6-nurses)
7. [Patients](#7-patients)
8. [Appointments](#8-appointments)
9. [Reception (Walk-in)](#9-reception-walk-in)
10. [Visits & Clinical Records](#10-visits--clinical-records)
11. [Billing & Payments](#11-billing--payments)
12. [Dashboard & Analytics](#12-dashboard--analytics)
13. [Metrics](#13-metrics)
14. [Staff Applications](#14-staff-applications)
15. [Staff Operational Requests](#15-staff-operational-requests)
16. [Audit & Security Logs](#16-audit--security-logs)
17. [Stripe Webhooks](#17-stripe-webhooks)
18. [Standard Error Format](#standard-error-format)

---

## 1. Authentication

> **Base path:** `/api/v1/auth`  
> All auth routes are rate-limited to **20 requests / 15 minutes**.

---

### 1.1 Register (Sign Up)

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/auth/signup` |
| **Access Level** | Public |
| **Description** | Creates a new user account and sends a 6-digit OTP to the supplied email for verification. The account is inactive until OTP is confirmed. |

**Headers Required**
```
Content-Type: application/json
```

**Request Body**
```json
{
  "full_name": "string (2–100 chars, required)",
  "email":     "string (valid email, required)",
  "password":  "string (8–72 chars, must include uppercase, lowercase, digit, symbol — required)",
  "role":      "enum: admin | doctor | nurse | patient (required)",
  "phone":     "string (7–20 chars, format +1 555 000 0000 — required)"
}
```

**Validation Rules**
- `password` — min 8, max 72 chars; must contain `[a-z]`, `[A-Z]`, `[0-9]`, and at least one symbol.
- `phone` — regex `/^\+?[0-9][\s\-\(\)0-9]{6,19}$/`.
- `role` — strictly one of: `admin`, `doctor`, `nurse`, `patient`.

**Success Response — `201 Created`**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 42,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "patient",
      "is_verified": false,
      "is_active": false
    }
  }
}
```

**Error Responses**

| HTTP | Scenario | Body |
|---|---|---|
| `400` | Validation failed | `{ "status": "fail", "message": "Password must include a symbol" }` |
| `409` | Email already registered | `{ "status": "fail", "message": "Email already in use" }` |
| `429` | Rate limit hit | `{ "status": "fail", "message": "Too many attempts, please try again after 15 minutes." }` |

---

### 1.2 Verify OTP (Email Confirmation)

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/auth/verify-otp` |
| **Access Level** | Public |
| **Description** | Verifies the 6-digit OTP sent to the user's email on signup. Activates the account upon success. |

**Request Body**
```json
{
  "email": "john@example.com",
  "otp":   "123456"
}
```

**Validation Rules**
- `otp` — exactly 6 characters.

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "message": "Email verified successfully"
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | Invalid or expired OTP |
| `404` | No user found with this email |

---

### 1.3 Resend OTP

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/auth/resend-otp` |
| **Access Level** | Public |
| **Description** | Resends the email verification OTP to the specified address. |

**Request Body**
```json
{
  "email": "john@example.com"
}
```

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "message": "OTP sent successfully"
}
```

---

### 1.4 Login

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/auth/login` |
| **Access Level** | Public |
| **Description** | Authenticates a verified user and returns a short-lived `accessToken` and a long-lived `refreshToken`. |

**Request Body**
```json
{
  "email":    "john@example.com",
  "password": "MyP@ssw0rd!"
}
```

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "accessToken":  "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "user": {
      "id":          1,
      "full_name":   "John Doe",
      "email":       "john@example.com",
      "role":        "patient",
      "is_verified": true,
      "is_active":   true
    }
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `401` | Invalid credentials |
| `403` | Account not verified or deactivated |
| `429` | Rate limit hit |

---

### 1.5 Refresh Access Token

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/auth/refresh` |
| **Access Level** | Public |
| **Description** | Issues a new `accessToken` using a valid `refreshToken`. |

**Request Body**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `401` | Invalid or expired refresh token |

---

### 1.6 Logout

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/auth/logout` |
| **Access Level** | Authenticated |
| **Description** | Revokes the current session by blacklisting the `accessToken` and invalidating the `refreshToken`. |

**Headers Required**
```
Authorization: Bearer <accessToken>
```

**Request Body**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Logged out successfully"
}
```

---

### 1.7 Forgot Password

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/auth/forgot-password` |
| **Access Level** | Public |
| **Description** | Sends a password-reset link to the user's email. |

**Request Body**
```json
{
  "email": "john@example.com"
}
```

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "message": "Password reset email sent"
  }
}
```

---

### 1.8 Reset Password

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/auth/reset-password/:token` |
| **Access Level** | Public (token in URL) |
| **Description** | Resets the user's password using the token emailed via forgot-password. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `token` | `string` | Signed reset token from the email link |

**Request Body**
```json
{
  "password": "NewStr0ng!Pass"
}
```

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Password reset successful"
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | Token expired or invalid |
| `400` | Password does not meet complexity rules |

---

### 1.9 Verify New Email

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/auth/verify-email/:token` |
| **Access Level** | Public (token in URL) |
| **Description** | Confirms an email-change request using the token sent to the new address. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `token` | `string` | Email verification token from the email link |

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Email verified successfully"
}
```

---

### 1.10 Request Email Change

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/auth/change-email` |
| **Access Level** | Authenticated |
| **Description** | Sends a verification link to the new email address. The change is applied when the link is clicked (see 1.9). |

**Headers Required**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**
```json
{
  "newEmail": "newemail@example.com"
}
```

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Email change requested. Please check your new email for verification link."
}
```

---

### 1.11 Change Password

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/auth/change-password` |
| **Access Level** | Authenticated |
| **Description** | Changes the authenticated user's password. Requires re-login after success. |

**Headers Required**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body**
```json
{
  "current_password": "OldP@ssw0rd!",
  "new_password":     "NewP@ssw0rd1!"
}
```

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Password changed successfully, please login again"
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | Current password is incorrect |
| `400` | New password fails complexity rules |
| `401` | Not authenticated |

---

## 2. Users & Profile

> **Base path:** `/api/v1/users`  
> All routes require authentication (`Authorization: Bearer <token>`).

---

### 2.1 Get Current User (Me)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/users/me` |
| **Access Level** | Authenticated (any role) |
| **Description** | Returns the profile of the currently authenticated user. |

**Headers Required**
```
Authorization: Bearer <accessToken>
```

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":            1,
    "full_name":     "John Doe",
    "email":         "john@example.com",
    "phone":         "+1 555 000 0000",
    "role":          "patient",
    "is_verified":   true,
    "is_active":     true,
    "assigned_shift": null,
    "created_at":    "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 2.2 Update Own Profile

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/users/me` |
| **Access Level** | Authenticated (any role) |
| **Description** | Updates the authenticated user's `full_name` and/or `phone`. At least one field is required. |

**Request Body**
```json
{
  "full_name": "Jane Doe",
  "phone":     "+1 555 111 2222"
}
```

**Validation Rules**
- `full_name` — optional, 2–100 chars.
- `phone` — optional, 7–20 chars, regex `/^\+?[0-9][\s\-\(\)0-9]{6,19}$/`.
- At least one field must be provided.

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":        1,
    "full_name": "Jane Doe",
    "phone":     "+1 555 111 2222",
    "email":     "john@example.com",
    "role":      "patient"
  }
}
```

---

### 2.3 Get All Users

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/users` |
| **Access Level** | Admin Only |
| **Description** | Returns the complete list of all users (with associated department info). Sensitive fields (password hash, reset tokens) are stripped. |

**Headers Required**
```
Authorization: Bearer <adminToken>
```

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":            1,
      "full_name":     "Admin User",
      "email":         "admin@hospital.com",
      "role":          "admin",
      "is_active":     true,
      "assigned_shift": "Morning",
      "department_name": null
    }
  ]
}
```

---

### 2.4 Get User by ID

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/users/:id` |
| **Access Level** | Admin Only |
| **Description** | Returns a single user record by their numeric ID. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Positive integer user ID |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":        5,
    "full_name": "Dr. Smith",
    "email":     "smith@hospital.com",
    "role":      "doctor",
    "is_active": true
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `404` | User not found |
| `400` | `id` is not a valid positive integer |

---

### 2.5 Admin Update User

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/users/:id` |
| **Access Level** | Admin Only |
| **Description** | Allows an admin to update a user's name, active status, role, specialization, and/or license number. Role transitions automatically provision the corresponding profile table (doctors / nurses). |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Target user's ID |

**Request Body**
```json
{
  "full_name":      "Dr. Updated Name",
  "is_active":      true,
  "role":           "doctor",
  "specialization": "Cardiology",
  "license_number": "LIC-2025-001"
}
```

**Validation Rules**
- All fields optional, at least one must be provided.
- `role` — one of: `admin`, `doctor`, `nurse`, `patient`.
- `full_name` — 2–100 chars.
- `license_number` — max 100 chars, nullable.

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":        5,
    "full_name": "Dr. Updated Name",
    "role":      "doctor",
    "is_active": true
  }
}
```

---

### 2.6 Update User Role (Alias)

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/users/:id/role` |
| **Access Level** | Admin Only |
| **Description** | Alias for `PATCH /api/v1/users/:id` — functionally identical, both accept the same body. |

---

### 2.7 Deactivate User

| Field | Value |
|---|---|
| **Method & Path** | `DELETE /api/v1/users/:id` |
| **Access Level** | Admin Only |
| **Description** | Soft-deactivates a user (`is_active = false`) and immediately invalidates their auth cache (forcing logout). |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Target user's ID |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":        5,
    "is_active": false
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `404` | User not found |

---

## 3. Admin Operations

> **Base path:** `/api/v1/admins`  
> All routes require `Admin Only` access.

---

### 3.1 Get All Staff Members

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/admins/staff` |
| **Access Level** | Admin Only |
| **Description** | Returns all users with roles `admin`, `doctor`, or `nurse`. |

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "results": 12,
  "data": [
    {
      "id":             2,
      "full_name":      "Dr. Adams",
      "email":          "adams@hospital.com",
      "role":           "doctor",
      "phone":          "+1 555 200 0000",
      "assigned_shift": "Morning"
    }
  ]
}
```

---

### 3.2 Assign Staff to Department

| Field | Value |
|---|---|
| **Method & Path** | `PUT /api/v1/admins/assign-department` |
| **Access Level** | Admin Only |
| **Description** | Assigns a doctor or nurse to a department. Also provisions/updates the corresponding `doctors` or `nurses` table row. Logs the action to the audit trail. |

**Request Body**
```json
{
  "doctor_id":     5,
  "department_id": 3
}
```

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Staff member department updated successfully."
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | `doctor_id` or `department_id` is missing |
| `404` | User not found |
| `404` | Department not found |
| `500` | Transaction error |

---

### 3.3 Create Staff Account Directly

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/admins/staff/create` |
| **Access Level** | Admin Only |
| **Description** | Creates a new staff user account (doctor, nurse, receptionist, or admin) without requiring email OTP. If a user with the same email/phone already exists, promotes them to staff instead. Auto-provisions the doctor or nurse profile row. |

**Request Body**
```json
{
  "full_name":      "Dr. Jane Smith",
  "email":          "jane.smith@hospital.com",
  "phone":          "+1 555 333 4444",
  "role":           "doctor",
  "department_id":  2,
  "specialization": "Neurology",
  "assigned_shift": "Morning",
  "password":       "CustomPass1!"
}
```

**Validation Rules**
- `full_name`, `email`, `role` — required.
- `role` — one of: `doctor`, `nurse`, `receptionist`, `admin`.
- `assigned_shift` — `Morning` or `Night` (defaults to `Morning`).
- `password` — optional; defaults to `StaffTemp123!` if not provided.

**Success Response — `201 Created`**
```json
{
  "status":  "success",
  "message": "Staff account created successfully.",
  "data": {
    "id":             10,
    "full_name":      "Dr. Jane Smith",
    "email":          "jane.smith@hospital.com",
    "role":           "doctor",
    "phone":          "+1 555 333 4444",
    "assigned_shift": "Morning",
    "is_active":      true,
    "is_verified":    true
  }
}
```

---

### 3.4 Reassign Staff Shift

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/shifts` |
| **Access Level** | Admin Only |
| **Description** | Reassigns a staff member's shift. Also syncs the `nurses.shift` column if the target user is a nurse. |

**Request Body**
```json
{
  "userId": 7,
  "shift":  "Night"
}
```

**Validation Rules**
- `userId` or `user_id` — required (integer).
- `shift` — `Morning`, `Night`, `morning`, or `night`.

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Staff member shift reassigned to Night successfully."
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | Missing `userId` or invalid `shift` value |
| `404` | User not found |

---

## 4. Departments

> **Base path:** `/api/v1/departments`  
> All routes require authentication.

---

### 4.1 Get All Departments

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/departments` |
| **Access Level** | Authenticated |
| **Description** | Returns the full list of hospital departments. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":      1,
      "name_en": "Cardiology",
      "name_ar": "أمراض القلب"
    }
  ]
}
```

---

### 4.2 Get Doctors by Department

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/departments/:departmentId/doctors` |
| **Access Level** | Authenticated |
| **Description** | Lists all active doctors within a specific department. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `departmentId` | `integer` | Department ID |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":             3,
      "full_name":      "Dr. Adams",
      "specialization": "Cardiology",
      "consultation_fee": 150
    }
  ]
}
```

---

### 4.3 Create Department

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/departments` |
| **Access Level** | Admin Only |
| **Description** | Creates a new hospital department. |

**Request Body**
```json
{
  "name_en": "Orthopedics",
  "name_ar": "جراحة العظام"
}
```

**Success Response — `201 Created`**
```json
{
  "status": "success",
  "data": {
    "id":      5,
    "name_en": "Orthopedics",
    "name_ar": "جراحة العظام"
  }
}
```

---

### 4.4 Delete Department

| Field | Value |
|---|---|
| **Method & Path** | `DELETE /api/v1/departments/:id` |
| **Access Level** | Admin Only |
| **Description** | Permanently deletes a department by ID. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Department ID |

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Department deleted"
}
```

---

## 5. Doctors

> **Base path:** `/api/v1/doctors`

---

### 5.1 Get All Doctors

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/doctors` |
| **Access Level** | Public |
| **Description** | Returns a list of all doctors (no auth required — used for the public doctor directory / booking flow). |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":               1,
      "full_name":        "Dr. Ava Johnson",
      "specialization":   "Cardiology",
      "bio":              "Expert in heart disease treatment.",
      "consultation_fee": 200,
      "department_name":  "Cardiology",
      "years_of_experience": 10
    }
  ]
}
```

---

### 5.2 Get Available Time Slots

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/doctors/:doctorId/available-slots` |
| **Access Level** | Public |
| **Description** | Returns available booking slots for a specific doctor on a given date. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `doctorId` | `integer` | Doctor's profile ID |

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | `string` | Optional | `YYYY-MM-DD` — defaults to today |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "available_slots": ["09:00", "09:30", "10:00", "14:00"]
  }
}
```

---

### 5.3 Get Doctor by ID

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/doctors/:id` |
| **Access Level** | Public |
| **Description** | Returns a single doctor's full public profile. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Doctor's profile ID |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":               1,
    "full_name":        "Dr. Ava Johnson",
    "email":            "ava@hospital.com",
    "specialization":   "Cardiology",
    "license_number":   "LIC-2020-001",
    "consultation_fee": 200,
    "bio":              "...",
    "department":       { "id": 1, "name_en": "Cardiology" }
  }
}
```

---

### 5.4 Get My Doctor Profile

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/doctors/me` |
| **Access Level** | Doctor Only |
| **Description** | Returns the profile of the currently authenticated doctor. |

**Headers Required**
```
Authorization: Bearer <doctorToken>
```

**Success Response — `200 OK`** — Same shape as 5.3.

---

### 5.5 Update My Doctor Profile

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/doctors/me` |
| **Access Level** | Doctor Only |
| **Description** | Allows the authenticated doctor to update their own profile fields. |

**Request Body**
```json
{
  "specialization":      "Cardiology",
  "bio":                 "Updated bio (max 500 chars)",
  "years_of_experience": 12,
  "consultation_fee":    250.00,
  "department_id":       1,
  "license_number":      "LIC-2025-999"
}
```

**Validation Rules**
- `bio` — max 500 chars.
- `years_of_experience` — positive integer.
- `consultation_fee` — positive number.
- `department_id` — positive integer.
- `license_number` — max 100 chars, nullable.

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": { "id": 1, "specialization": "Cardiology", "consultation_fee": 250 }
}
```

---

### 5.6 Get My Appointments (Doctor)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/doctors/my-appointments` |
| **Access Level** | Doctor Only |
| **Description** | Returns all appointments assigned to the authenticated doctor. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [ { "id": 10, "patient_name": "Jane", "appointment_date": "2025-08-01", "status": "confirmed" } ]
}
```

---

### 5.7 Get Today's Schedule (Doctor)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/appointments/doctor/schedule/today` |
| **Access Level** | Doctor Only |
| **Description** | Returns all of today's appointments for the authenticated doctor, ordered by queue number. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [ { "id": 5, "queue_number": 1, "patient_name": "John", "status": "confirmed" } ]
}
```

---

### 5.8 Save Doctor Notes

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/doctors/notes` |
| **Access Level** | Doctor Only |
| **Description** | Saves clinical notes written by the doctor for a patient/appointment. |

**Request Body**
```json
{
  "appointment_id": 10,
  "notes":          "Patient is recovering well. Prescribed ibuprofen."
}
```

**Success Response — `201 Created`**
```json
{
  "status": "success",
  "data": { "id": 3, "notes": "Patient is recovering well...", "created_at": "2025-07-01T10:00:00Z" }
}
```

---

### 5.9 Admin Update Doctor

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/doctors/:id` |
| **Access Level** | Admin Only |
| **Description** | Admin overrides any doctor profile field. Same body shape as 5.5. |

---

## 6. Nurses

> **Base path:** `/api/v1/nurses`  
> All routes require authentication.

---

### 6.1 Get All Nurses

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/nurses` |
| **Access Level** | Authenticated |
| **Description** | Returns a list of all nurse profiles. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":                  1,
      "full_name":           "Nurse Mary",
      "department_name":     "ICU",
      "shift":               "morning",
      "years_of_experience": 5
    }
  ]
}
```

---

### 6.2 Get Nurse by ID

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/nurses/:id` |
| **Access Level** | Authenticated |
| **Description** | Returns a single nurse's profile. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Nurse profile ID |

---

### 6.3 Get Vitals Queue

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/nurses/vitals-queue` |
| **Access Level** | Authenticated |
| **Description** | Returns the list of appointments awaiting vital sign recording for today's shift. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "appointment_id": 12,
      "patient_name":   "Bob Smith",
      "queue_number":   3,
      "status":         "awaiting_vitals"
    }
  ]
}
```

---

### 6.4 Get My Beds

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/nurses/me/beds` |
| **Access Level** | Authenticated |
| **Description** | Returns bed assignments for the current nurse. |

---

### 6.5 Get My Tasks

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/nurses/me/tasks` |
| **Access Level** | Authenticated |
| **Description** | Returns task list for the current nurse. |

---

### 6.6 Create Nurse Profile

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/nurses` |
| **Access Level** | Admin Only |
| **Description** | Creates a nurse profile linked to an existing user account. |

**Request Body**
```json
{
  "user_id":             8,
  "department_id":       2,
  "shift":               "morning",
  "years_of_experience": 3,
  "notes":               "Specializes in pediatric care",
  "license_number":      "NRS-2024-042"
}
```

**Validation Rules**
- `user_id` — required, positive integer.
- `department_id` — required, positive integer.
- `shift` — required, one of: `morning`, `evening`, `night`.
- `years_of_experience` — optional, non-negative integer, defaults to 0.
- `notes` — optional, max 1000 chars.
- `license_number` — optional, max 100 chars, nullable.

**Success Response — `201 Created`**
```json
{
  "status": "success",
  "data": {
    "id":                  5,
    "user_id":             8,
    "department_id":       2,
    "shift":               "morning",
    "years_of_experience": 3,
    "license_number":      "NRS-2024-042"
  }
}
```

---

### 6.7 Update Nurse Profile

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/nurses/:id` |
| **Access Level** | Admin Only |
| **Description** | Updates one or more fields of a nurse's profile. All fields from the create schema are optional here. |

---

### 6.8 Delete Nurse Profile

| Field | Value |
|---|---|
| **Method & Path** | `DELETE /api/v1/nurses/:id` |
| **Access Level** | Admin Only |
| **Description** | Permanently removes a nurse profile. |

---

## 7. Patients

> **Base path:** `/api/v1/patients`  
> All routes require authentication.

---

### 7.1 Get My Patient Profile

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/patients/me` |
| **Access Level** | Patient Only |
| **Description** | Returns the authenticated patient's profile including demographic and medical info. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":                1,
    "user_id":           5,
    "full_name":         "John Doe",
    "phone":             "+1 555 000 0000",
    "gender":            "male",
    "date_of_birth":     "1990-05-15",
    "blood_group":       "O+",
    "emergency_contact": "+1 555 999 8888"
  }
}
```

---

### 7.2 Get My Appointments (Patient)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/patients/me/appointments` |
| **Access Level** | Patient Only |
| **Description** | Returns all appointments for the authenticated patient. |

---

### 7.3 Get My Medical Records

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/patients/me/medical-records` |
| **Access Level** | Patient Only |
| **Description** | Returns the patient's full visit history including diagnoses and treatment plans. |

---

### 7.4 Get All Patients

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/patients` |
| **Access Level** | Admin / Doctor |
| **Description** | Returns a paginated list of all patient records, with optional search. |

**Query Parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | `integer` | `1` | Page number |
| `limit` | `integer` | `20` | Records per page (max 100) |
| `search` | `string` | — | Search by name or phone |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "patients": [
      {
        "id":         1,
        "full_name":  "John Doe",
        "phone":      "+1 555 000 0000",
        "gender":     "male",
        "blood_group":"O+"
      }
    ],
    "total":  50,
    "page":   1,
    "limit":  20
  }
}
```

---

### 7.5 Create Patient (Admin)

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/patients` |
| **Access Level** | Admin Only |
| **Description** | Creates a patient profile linked to an existing user account. |

**Request Body**
```json
{
  "user_id":           15,
  "full_name":         "Alice Brown",
  "email":             "alice@example.com",
  "phone":             "+1 555 123 4567",
  "gender":            "female",
  "date_of_birth":     "1985-03-20",
  "blood_group":       "A+",
  "emergency_contact": "+1 555 000 9999"
}
```

**Validation Rules**
- `user_id` — required, positive integer.
- `full_name` — required, 3–150 chars.
- `email` — required, valid email.
- `phone` — required, 7–30 chars.
- `gender` — required, one of: `male`, `female`, `other`.
- `date_of_birth` — required, `YYYY-MM-DD`, must be in the past.
- `blood_group` — optional, one of: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`.
- `emergency_contact` — required, valid phone number.

---

### 7.6 Get Patient by ID

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/patients/:id` |
| **Access Level** | Admin / Doctor |
| **Description** | Returns a single patient's full profile. |

---

### 7.7 Get Patient Appointments

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/patients/:id/appointments` |
| **Access Level** | Admin / Doctor |
| **Description** | Returns all appointments for a specific patient. |

---

### 7.8 Update Patient

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/patients/:id` |
| **Access Level** | Admin / Patient (own record) |
| **Description** | Updates a patient's editable demographic fields. At least one field required. |

**Request Body**
```json
{
  "phone":             "+1 555 999 1111",
  "gender":            "female",
  "date_of_birth":     "1985-03-20",
  "blood_group":       "B-",
  "emergency_contact": "+1 555 777 8888"
}
```

---

### 7.9 Delete Patient

| Field | Value |
|---|---|
| **Method & Path** | `DELETE /api/v1/patients/:id` |
| **Access Level** | Admin Only |
| **Description** | Permanently deletes a patient record. |

---

## 8. Appointments

> **Base path:** `/api/v1/appointments`

---

### 8.1 Create Appointment

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/appointments` |
| **Access Level** | Patient / Admin / Doctor |
| **Description** | Books a new appointment. Either `appointment_date` or `starts_at` must be provided. Admin/Doctor may specify a different `patient_id`; patients always book for themselves. |

**Headers Required**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**
```json
{
  "doctor_id":       3,
  "department_id":   1,
  "patient_id":      null,
  "appointment_date": "2025-08-15",
  "time_slot":       "10:00",
  "starts_at":       null,
  "reason":          "Chest pain checkup",
  "notes":           "Please bring previous ECG results"
}
```

**Validation Rules**
- `doctor_id` — required, positive integer.
- `appointment_date` — `YYYY-MM-DD` format.
- `starts_at` — ISO 8601 datetime string.
- At least one of `appointment_date` or `starts_at` must be provided.
- `reason` / `notes` — max 1000 chars each.

**Success Response — `201 Created`**
```json
{
  "status": "success",
  "data": {
    "id":               25,
    "patient_id":       5,
    "doctor_id":        3,
    "appointment_date": "2025-08-15",
    "time_slot":        "10:00",
    "status":           "pending",
    "booking_source":   "online",
    "queue_number":     4,
    "created_at":       "2025-07-27T09:00:00.000Z"
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | Missing required fields or failed validation |
| `409` | Time slot already taken |

---

### 8.2 Get My Appointments (Patient)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/appointments/me` |
| **Access Level** | Patient Only |
| **Description** | Returns all appointments belonging to the authenticated patient. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":               10,
      "doctor_name":      "Dr. Adams",
      "appointment_date": "2025-08-01",
      "time_slot":        "09:00",
      "status":           "confirmed",
      "queue_number":     2
    }
  ]
}
```

---

### 8.3 Get All Appointments

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/appointments` |
| **Access Level** | Admin / Nurse |
| **Description** | Returns all appointments system-wide. |

---

### 8.4 Get Doctor Appointments

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/appointments/doctor` |
| **Access Level** | Doctor Only |
| **Description** | Returns all appointments assigned to the authenticated doctor. |

---

### 8.5 Complete Appointment

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/appointments/:id/complete` |
| **Access Level** | Patient / Doctor / Admin / Nurse |
| **Description** | Marks an appointment as `completed`. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Appointment ID |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": { "id": 10, "status": "completed" }
}
```

---

### 8.6 Update Appointment Status

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/appointments/:id/status` |
| **Access Level** | Patient / Doctor / Admin / Nurse |
| **Description** | Updates the status of an appointment to any allowed value. |

**Request Body**
```json
{
  "status": "cancelled",
  "notes":  "Patient requested cancellation"
}
```

**Validation Rules**
- `status` — one of: `pending`, `confirmed`, `scheduled`, `completed`, `cancelled`, `no_show`.
- `notes` — optional, max 1000 chars.

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": { "id": 10, "status": "cancelled" }
}
```

---

### 8.7 Reschedule Appointment

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/appointments/:id/reschedule` |
| **Access Level** | Admin / Doctor |
| **Description** | Reschedules an appointment to a different date, time, or doctor. |

**Request Body**
```json
{
  "doctor_id":        3,
  "appointment_date": "2025-09-01",
  "time_slot":        "14:30",
  "starts_at":        "2025-09-01T14:30:00.000Z",
  "reason":           "Doctor unavailable on original date"
}
```

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": { "id": 10, "appointment_date": "2025-09-01", "status": "scheduled" }
}
```

---

### 8.8 Confirm Attendance (Email Link)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/appointments/:id/confirm-attendance` |
| **Access Level** | Public (token-protected URL) |
| **Description** | Called when a patient clicks the "Confirm Attendance" button in their reminder email. Also supports `POST`. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Appointment ID |

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Attendance confirmed"
}
```

---

### 8.9 Cancel by Patient (Email Link)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/appointments/:id/cancel-by-patient` |
| **Access Level** | Public (token-protected URL) |
| **Description** | Called when a patient clicks "Cancel" in their email reminder. Also supports `POST`. |

---

### 8.10 Public Appointment Action

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/appointments/public-action` |
| **Access Level** | Public |
| **Description** | Generic handler for tokenised public appointment actions sent via email (confirm / cancel). |

---

## 9. Reception (Walk-in)

> **Base path:** `/api/v1/reception`  
> All routes require authentication. Accessible by `receptionist` and `admin` (queue board also by `nurse`).

---

### 9.1 Get Available Doctors (for Slot Picker)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/reception/doctors` |
| **Access Level** | Receptionist / Admin |
| **Description** | Returns a simplified list of active doctors for the reception walk-in slot picker. |

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "results": 8,
  "data": [
    {
      "id":               1,
      "name":             "Dr. Ava Johnson",
      "specialization":   "Cardiology",
      "department_name":  "Cardiology",
      "consultation_fee": 200
    }
  ]
}
```

---

### 9.2 Get Today's Live Queue Board

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/reception/queue/today` |
| **Access Level** | Receptionist / Admin / Nurse |
| **Description** | Returns today's full appointment queue grouped by doctor. Includes current serving number per doctor. |

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "results": 2,
  "data": [
    {
      "doctor_id":             3,
      "doctor_name":           "Dr. Smith",
      "doctor_specialization": "Neurology",
      "department_name":       "Neurology",
      "current_serving":       2,
      "appointments": [
        {
          "id":             15,
          "queue_number":   1,
          "status":         "completed",
          "patient_name":   "Alice",
          "patient_phone":  "+1 555 100 2000",
          "time_slot":      "09:00",
          "booking_source": "walk_in",
          "payment_status": "paid_cash"
        }
      ]
    }
  ]
}
```

---

### 9.3 Quick Patient Registration (Walk-in)

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/reception/patients` |
| **Access Level** | Receptionist / Admin |
| **Description** | Quickly registers a walk-in patient without OTP or email. If a user with the same phone already exists, returns the existing record. |

**Request Body**
```json
{
  "full_name":   "Walk-in Patient",
  "phone":       "+1 555 000 1111",
  "national_id": "1234567890"
}
```

**Validation Rules**
- `full_name` — required.
- `phone` — required.
- `national_id` — optional, stored in patient notes.

**Success Response — `201 Created` (new) or `200 OK` (existing)**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id":          20,
      "full_name":   "Walk-in Patient",
      "phone":       "+1 555 000 1111",
      "role":        "patient",
      "is_verified": true
    },
    "patient": {
      "id":      8,
      "user_id": 20,
      "phone":   "+1 555 000 1111"
    },
    "already_existed": false
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | `full_name` or `phone` is missing |

---

### 9.4 Book Walk-in Appointment

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/reception/book-walk-in` |
| **Access Level** | Receptionist / Admin |
| **Description** | Books a walk-in appointment and atomically assigns the next queue number for that doctor on that date. Uses `FOR UPDATE` locking to prevent race conditions. |

**Request Body**
```json
{
  "patient_id":       8,
  "doctor_id":        3,
  "appointment_date": "2025-08-01",
  "time_slot":        "10:30",
  "payment_status":   "paid_cash"
}
```

**Validation Rules**
- `patient_id` — required, positive integer.
- `doctor_id` — required, positive integer.
- `appointment_date` — required, `YYYY-MM-DD`.
- `time_slot` — optional, `HH:MM` format.
- `payment_status` — optional, one of: `unpaid`, `paid_cash`, `paid_online`; defaults to `paid_cash`.

**Success Response — `201 Created`**
```json
{
  "status": "success",
  "data": {
    "appointment": {
      "id":               30,
      "patient_id":       8,
      "doctor_id":        3,
      "appointment_date": "2025-08-01",
      "time_slot":        "10:30",
      "queue_number":     5,
      "booking_source":   "walk_in",
      "payment_status":   "paid_cash",
      "status":           "confirmed"
    },
    "queue_number": 5
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | Missing `patient_id`, `doctor_id`, or `appointment_date` |
| `404` | Patient or Doctor not found |

---

## 10. Visits & Clinical Records

> **Base path:** `/api/v1/visits`  
> All routes require authentication.

---

### 10.1 Get Pending Visits (Doctor)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/visits/pending` |
| **Access Level** | Doctor Only |
| **Description** | Returns visits in `awaiting_vitals` or `ready_for_doctor` status for the authenticated doctor. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":             5,
      "patient_name":   "Bob",
      "status":         "ready_for_doctor",
      "reason_for_visit": "Headache"
    }
  ]
}
```

---

### 10.2 Get My Visits (Doctor)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/visits/my-visits` |
| **Access Level** | Doctor Only |
| **Description** | Returns all visits created by the authenticated doctor. |

---

### 10.3 Get Patient Visit History

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/visits/patient/:patientId` |
| **Access Level** | Admin / Doctor |
| **Description** | Returns the full visit history for a specific patient. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `patientId` | `integer` | Patient profile ID |

---

### 10.4 Get All Visits

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/visits` |
| **Access Level** | Admin / Doctor / Nurse |
| **Description** | Returns all visit records system-wide. |

---

### 10.5 Get Visit by ID

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/visits/:id` |
| **Access Level** | Admin / Doctor / Nurse |
| **Description** | Returns a single visit record with full clinical details. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":               5,
    "patient_id":       3,
    "doctor_id":        1,
    "appointment_id":   10,
    "reason_for_visit": "Chest pain",
    "diagnosis":        "Mild angina",
    "treatment_plan":   "Beta blockers prescribed",
    "notes":            "Follow-up in 2 weeks",
    "status":           "completed",
    "vitals": {
      "bp":               "120/80",
      "pulse":            72,
      "temperature":      36.6,
      "weight":           75.0,
      "respiratory_rate": 16
    },
    "check_in_at":  "2025-07-27T09:00:00.000Z",
    "check_out_at": "2025-07-27T10:00:00.000Z"
  }
}
```

---

### 10.6 Create Visit

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/visits` |
| **Access Level** | Doctor / Admin |
| **Description** | Creates a new clinical visit record for a patient. Optionally linked to an appointment. |

**Request Body**
```json
{
  "patient_id":       3,
  "doctor_id":        1,
  "appointment_id":   10,
  "reason_for_visit": "Chest pain follow-up",
  "diagnosis":        "Stable angina",
  "treatment_plan":   "Continue medication",
  "notes":            "Patient improving",
  "vitals": {
    "bp":               "118/76",
    "pulse":            70,
    "temperature":      36.5,
    "weight":           74.5,
    "respiratory_rate": 15
  },
  "check_in_at": "2025-08-01T09:00:00.000Z"
}
```

**Validation Rules**
- `patient_id` — required, positive integer.
- `doctor_id` — required, positive integer.
- `reason_for_visit` — required, 3–255 chars.
- `diagnosis` — required, min 3 chars.
- `vitals.bp` — format `"120/80"`.
- `vitals.pulse` — integer, 20–300.
- `vitals.temperature` — number, 30–45 °C.
- `vitals.weight` — positive number, max 500 kg.
- `vitals.respiratory_rate` — number, 10–60.

---

### 10.7 Record Vitals (Nurse)

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/visits/:id/vitals` |
| **Access Level** | Nurse Only |
| **Description** | Nurse records vital signs for a visit. At least one vital field must be provided. Also supported via `POST`. |

**Request Body**
```json
{
  "vitals": {
    "bp":               "122/80",
    "pulse":            68,
    "temperature":      36.8,
    "weight":           73.0,
    "respiratory_rate": 14
  }
}
```

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":     5,
    "status": "ready_for_doctor",
    "vitals": { "bp": "122/80", "pulse": 68 }
  }
}
```

---

### 10.8 Complete Visit

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/visits/:id/complete` |
| **Access Level** | Doctor / Admin |
| **Description** | Marks a visit as `completed` and sets `check_out_at`. |

---

### 10.9 Update Visit

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/visits/:id` |
| **Access Level** | Doctor / Admin |
| **Description** | Updates any editable field on a visit. At least one field must be provided. |

**Request Body**
```json
{
  "status":         "in_progress",
  "diagnosis":      "Updated diagnosis",
  "treatment_plan": "New treatment",
  "notes":          "Additional notes",
  "vitals":         { "pulse": 75 },
  "check_out_at":   "2025-08-01T11:00:00.000Z"
}
```

**Validation Rules** — `status` must be one of: `awaiting_vitals`, `ready_for_doctor`, `in_progress`, `completed`, `cancelled`.

---

### 10.10 Delete Visit

| Field | Value |
|---|---|
| **Method & Path** | `DELETE /api/v1/visits/:id` |
| **Access Level** | Admin Only |
| **Description** | Permanently removes a visit record. |

---

## 11. Billing & Payments

> **Base path:** `/api/v1/billing`

---

### 11.1 Payment Success (Stripe Redirect)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/billing/success` |
| **Access Level** | Public (Stripe redirect) |
| **Description** | Landing page after a successful Stripe Checkout payment. No auth header required (browsers don't pass JWT on redirect). |

---

### 11.2 Payment Cancel (Stripe Redirect)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/billing/cancel` |
| **Access Level** | Public (Stripe redirect) |
| **Description** | Landing page when a user cancels out of Stripe Checkout. |

---

### 11.3 Get Patient Invoices

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/billing/patient/:patientId` |
| **Access Level** | Authenticated |
| **Description** | Returns all invoices for a patient. Patients can only view their own; admin/staff can view any. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `patientId` | `integer` | Patient profile ID |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":           1,
      "patient_id":   3,
      "total_amount": 350.00,
      "final_amount": 315.00,
      "status":       "paid",
      "paid_at":      "2025-07-20T12:00:00.000Z",
      "payment_method": "cash"
    }
  ]
}
```

---

### 11.4 Daily Revenue Report

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/billing/reports/daily-revenue` |
| **Access Level** | Admin Only |
| **Description** | Returns a revenue breakdown aggregated by day. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "date":          "2025-07-27",
      "total_revenue": 4200.00,
      "invoice_count": 14
    }
  ]
}
```

---

### 11.5 Get Invoice by ID

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/billing/:id` |
| **Access Level** | Authenticated |
| **Description** | Returns a single invoice with its line items. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "id":           5,
    "patient_id":   3,
    "visit_id":     10,
    "items": [
      { "description": "Consultation", "quantity": 1, "unit_price": 200, "subtotal": 200 },
      { "description": "Blood test",   "quantity": 2, "unit_price":  50, "subtotal": 100 }
    ],
    "total_amount": 300,
    "discount":       0,
    "tax":            0,
    "final_amount": 300,
    "status":       "unpaid"
  }
}
```

---

### 11.6 Add Invoice Line Item

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/billing/:id/items` |
| **Access Level** | Admin / Doctor / Nurse |
| **Description** | Adds a billable line item to an existing invoice. |

**Request Body**
```json
{
  "description": "X-Ray",
  "quantity":    1,
  "unit_price":  75.00
}
```

**Validation Rules**
- `description` — required, min 3 chars.
- `quantity` — required, positive integer.
- `unit_price` — required, non-negative number.

**Success Response — `201 Created`**
```json
{
  "status":  "success",
  "message": "Item added successfully",
  "data": {
    "id":          8,
    "invoice_id":  5,
    "description": "X-Ray",
    "quantity":    1,
    "unit_price":  75.00,
    "subtotal":    75.00
  }
}
```

---

### 11.7 Process Manual Payment

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/billing/:id/pay` |
| **Access Level** | Admin / Receptionist |
| **Description** | Records a manual cash or card payment for an invoice (offline flow). |

**Request Body**
```json
{
  "payment_method": "cash"
}
```

**Validation Rules**
- `payment_method` — one of: `cash`, `card`.

**Success Response — `200 OK`**
```json
{
  "status":  "success",
  "message": "Payment processed successfully",
  "data": {
    "id":             5,
    "status":         "paid",
    "final_amount":   300.00,
    "paid_at":        "2025-07-27T12:00:00.000Z",
    "payment_method": "cash"
  }
}
```

---

### 11.8 Create Stripe Checkout Session

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/billing/:id/create-checkout-session` |
| **Access Level** | Patient / Admin / Receptionist |
| **Description** | Creates a Stripe Checkout Session for online invoice payment. Returns a redirect URL to Stripe's payment page. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "checkout_url": "https://checkout.stripe.com/pay/cs_test_..."
  }
}
```

---

## 12. Dashboard & Analytics

> **Base path:** `/api/v1/dashboard`  
> All routes are `Admin Only`.

---

### 12.1 Get Admin Summary

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/dashboard/admin-summary` |
| **Access Level** | Admin Only |
| **Description** | Returns a high-level summary of system-wide KPIs (total patients, doctors, appointments today, revenue, etc.). |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "total_patients":      320,
    "total_doctors":       18,
    "total_nurses":        25,
    "appointments_today":  42,
    "revenue_this_month":  28500.00,
    "pending_applications": 3
  }
}
```

---

### 12.2 Get Time-Series Stats

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/dashboard/stats` |
| **Access Level** | Admin Only |
| **Description** | Returns aggregated appointment / revenue statistics for a specified time period or custom date range. Defaults to `today` when no query params are supplied. |

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `period` | `string` | Optional | One of: `today`, `week`, `month`, `year` |
| `startDate` | `string` | Conditional | `YYYY-MM-DD` — required if `endDate` is set |
| `endDate` | `string` | Conditional | `YYYY-MM-DD` — required if `startDate` is set; must be ≥ `startDate` |

> **Note:** `period` and `startDate`/`endDate` are mutually exclusive. If neither is provided, defaults to `today`.

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "period":            "week",
    "appointments":      210,
    "completed":         185,
    "cancelled":          10,
    "no_show":             5,
    "revenue":         14500.00,
    "new_patients":       32,
    "daily_breakdown": [
      { "date": "2025-07-21", "appointments": 30, "revenue": 2100 }
    ]
  }
}
```

---

## 13. Metrics

> **Base path:** `/api/v1/metrics`  
> Admin Only.

---

### 13.1 Get System Metrics Summary

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/metrics/summary` |
| **Access Level** | Admin Only |
| **Description** | Returns operational metrics such as server performance, database query stats, cache hit rate, etc. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "uptime_seconds":    86400,
    "cache_hit_rate":    0.87,
    "active_sessions":   24,
    "db_query_avg_ms":   12
  }
}
```

---

## 14. Staff Applications

> **Base path:** `/api/v1/staff-applications`  
> All routes require authentication.

---

### 14.1 Submit a Staff Application

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/staff-applications` |
| **Access Level** | Authenticated (non-staff users applying for staff roles) |
| **Description** | Submits a request to join as a doctor or nurse. Each user may only have one active application. |

**Request Body**
```json
{
  "requested_role":       "doctor",
  "requested_shift":      "Morning",
  "specialization_notes": "Interested in Cardiology",
  "license_number":       "MED-2025-1234"
}
```

**Validation Rules**
- `requested_role` — required, one of: `doctor`, `nurse`.
- `requested_shift` — required, one of: `Morning`, `Night`.
- `specialization_notes` — optional string.
- `license_number` — optional, max 100 chars.

**Success Response — `201 Created`**
```json
{
  "status": "success",
  "data": {
    "id":                  7,
    "user_id":             20,
    "requested_role":      "doctor",
    "requested_shift":     "Morning",
    "specialization_notes":"Interested in Cardiology",
    "license_number":      "MED-2025-1234",
    "status":              "pending",
    "created_at":          "2025-07-27T10:00:00.000Z"
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | User already submitted an application |
| `400` | Invalid role or shift value |

---

### 14.2 Get My Applications

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/staff-applications/me` |
| **Access Level** | Authenticated |
| **Description** | Returns all staff applications submitted by the currently authenticated user. |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":             7,
      "requested_role": "doctor",
      "status":         "pending",
      "created_at":     "2025-07-27T10:00:00.000Z"
    }
  ]
}
```

---

### 14.3 Get All Applications (Admin)

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/staff-applications` |
| **Access Level** | Admin Only |
| **Description** | Returns all submitted staff applications. |

---

### 14.4 Process Application (Approve / Reject)

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/staff-applications/:id` |
| **Access Level** | Admin Only |
| **Description** | Approves or rejects a pending staff application. On approval: updates user role, activates account, assigns shift, and provisions the doctor/nurse profile row in a transaction. On approval for `doctor`, deletes any existing patient profile. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Application ID |

**Request Body**
```json
{
  "status":           "approved",
  "rejection_reason": null
}
```

```json
{
  "status":           "rejected",
  "rejection_reason": "Incomplete license information"
}
```

**Validation Rules**
- `status` — required, one of: `approved`, `rejected`.
- `rejection_reason` — required when `status` is `rejected`, min 5 chars.

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": {
    "message":         "Application approved successfully",
    "applicationId":   7,
    "status":          "approved",
    "requested_role":  "doctor",
    "requested_shift": "Morning",
    "user_id":         20
  }
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `404` | Application not found |
| `400` | Application has already been processed |
| `500` | Transaction failure during role provisioning |

---

## 15. Staff Operational Requests

> **Base path:** `/api/v1/staff-requests`  
> All routes require authentication.

---

### 15.1 Create Operational Request

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/staff-requests` |
| **Access Level** | Doctor / Nurse |
| **Description** | Submits an operational request (e.g., supply request, time-off, equipment need). |

**Request Body**
```json
{
  "role": "doctor"
}
```

**Success Response — `201 Created`**
```json
{
  "status": "success",
  "data": { "id": 3, "status": "pending", "created_at": "2025-07-27T09:00:00.000Z" }
}
```

---

### 15.2 Get Staff Requests

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/staff-requests` |
| **Access Level** | Admin / Doctor / Nurse |
| **Description** | Returns operational requests. Admins see all; doctors and nurses see only their own. |

---

### 15.3 Create Staff Role Request (Legacy)

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/staff-requests/:id` |
| **Access Level** | Authenticated |
| **Description** | Legacy endpoint for creating a role upgrade request for a specific user. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | User ID to associate with the request |

**Request Body**
```json
{
  "role": "doctor"
}
```

---

### 15.4 Approve Request

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/staff-requests/:id/approve` |
| **Access Level** | Admin Only |
| **Description** | Approves a pending operational or role request. |

**URL Parameters**

| Param | Type | Description |
|---|---|---|
| `id` | `integer` | Request ID |

---

### 15.5 Reject Request

| Field | Value |
|---|---|
| **Method & Path** | `PATCH /api/v1/staff-requests/:id/reject` |
| **Access Level** | Admin Only |
| **Description** | Rejects a pending request with an optional reason. |

**Request Body**
```json
{
  "reason": "Budget constraints this quarter"
}
```

**Validation Rules**
- `reason` — optional, min 5 chars.

---

## 16. Audit & Security Logs

> **Base path:** `/api/v1/audit`  
> Admin Only.

---

### 16.1 Get Security Logs

| Field | Value |
|---|---|
| **Method & Path** | `GET /api/v1/audit/security-logs` |
| **Access Level** | Admin Only |
| **Description** | Returns the system-wide security and audit event log. Supports filtering by action type, keyword search, and result limit. |

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `action_type` | `string` | Optional | Filter by event type (e.g., `LOGIN_FAILED`, `STAFF_CREATED`, `PAYMENT_PROCESSED`) |
| `search` | `string` | Optional | Full-text keyword search across log descriptions |
| `limit` | `integer` | Optional | Max records to return (defaults to system limit) |

**Success Response — `200 OK`**
```json
{
  "status": "success",
  "data": [
    {
      "id":          101,
      "user_id":     1,
      "actor_name":  "Admin User",
      "action_type": "STAFF_CREATED",
      "description": "Admin directly created staff account for Dr. Smith (Role: doctor).",
      "ip_address":  "192.168.1.100",
      "created_at":  "2025-07-27T11:30:00.000Z"
    }
  ]
}
```

**Known `action_type` Values**

| Action Type | Trigger |
|---|---|
| `ACCOUNT_CREATED` | New user signs up |
| `LOGIN_SUCCESS` | Successful login |
| `LOGIN_FAILED` | Failed login attempt |
| `LOGOUT` | User logs out |
| `PASSWORD_CHANGE` | Password changed or reset |
| `WALKIN_PATIENT_REGISTERED` | Receptionist registers walk-in patient |
| `WALKIN_APPOINTMENT_BOOKED` | Walk-in appointment booked |
| `STAFF_APPLICATION_SUBMITTED` | User submits staff application |
| `STAFF_REQUEST_APPROVED` | Admin approves staff application |
| `STAFF_REQUEST_REJECTED` | Admin rejects staff application |
| `STAFF_CREATED` | Admin directly creates a staff account |
| `STAFF_ASSIGNED_TO_DEPARTMENT` | Admin assigns staff to department |
| `ROLE_CHANGED` | Admin reassigns staff shift |
| `PAYMENT_PROCESSED` | Manual payment recorded for invoice |

---

## 17. Stripe Webhooks

> **Base path:** `/api/v1/stripe`  
> ⚠️ This route is registered **above** the `express.json()` middleware and processes the raw request body using `express.raw()` to validate Stripe's signature.

---

### 17.1 Stripe Webhook Handler

| Field | Value |
|---|---|
| **Method & Path** | `POST /api/v1/stripe` |
| **Access Level** | Public (validated via `Stripe-Signature` header) |
| **Description** | Receives and processes Stripe payment events (e.g., `checkout.session.completed`, `payment_intent.succeeded`). Updates invoice status in the database. |

**Headers Required**
```
Content-Type: application/octet-stream  (raw body — NOT JSON)
Stripe-Signature: t=1234567890,v1=abc123...
```

**Success Response — `200 OK`**
```json
{
  "received": true
}
```

**Error Responses**

| HTTP | Scenario |
|---|---|
| `400` | Webhook signature verification failed |

---

## Standard Error Format

All error responses from the API follow this consistent structure:

```json
{
  "status":  "fail",
  "message": "Human-readable description of the error"
}
```

For server-side errors (`5xx`):
```json
{
  "status":  "error",
  "message": "Something went wrong. Please try again later."
}
```

For Zod validation errors:
```json
{
  "status":  "fail",
  "message": "Specific validation error message from the schema"
}
```

### HTTP Status Code Reference

| Code | Meaning |
|---|---|
| `200` | OK — Successful read/update |
| `201` | Created — Resource created successfully |
| `400` | Bad Request — Validation failure or missing required fields |
| `401` | Unauthorized — Missing or invalid authentication token |
| `403` | Forbidden — Authenticated but insufficient role permissions |
| `404` | Not Found — Requested resource does not exist |
| `409` | Conflict — Duplicate resource (e.g., email already registered) |
| `429` | Too Many Requests — Rate limit exceeded |
| `500` | Internal Server Error — Unexpected server-side failure |

---

## Base URL Reference

```
Development:   http://localhost:5000/api/v1
Production:    https://your-domain.com/api/v1
```

## Authentication Flow Summary

```
1. POST /auth/signup        → Get user created (is_verified: false)
2. POST /auth/verify-otp    → Activate account
3. POST /auth/login         → Receive { accessToken, refreshToken }
4. Use accessToken in header: Authorization: Bearer <accessToken>
5. POST /auth/refresh       → Get new accessToken when expired
6. POST /auth/logout        → Revoke session
```

---

*Generated: 2026-07-27 | Hospital Management System API v1*
