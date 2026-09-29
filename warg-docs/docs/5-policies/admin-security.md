---
sidebar_position: 2
---

# Admin Security and Access Control

The Admin Dashboard provides privileged oversight of the WARG Platform, including user moderation, content flagging, server statistics, and manual trust score adjustments. 

Because this dashboard exposes sensitive user data and administrative controls, we implement a strict security model to ensure that only authorized admins can gain access.

## 1. Authentication

Admin access is layered on top of the standard user authentication flow. 
- All users log in using their credentials (or Wits SSO if integrated).
- The authentication middleware issues a JSON Web Token (JWT) and a secure HTTP-only cookie.
- The JWT payload contains an `admin: boolean` flag (or `role: 'ADMIN'`) mapped directly from the `Users` database table.

## 2. Role-Based Access Control (RBAC)

Access control is enforced on two distinct layers: Frontend and Backend.

### 2.1 Backend Enforcement (The Source of Truth)
Frontend hiding is not a security measure. The Express API enforces access rights using a dedicated middleware:

```javascript
// Example Middleware
function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ error: "Forbidden: Administrator privileges required." });
}

// Protected Route
app.use('/api/admin/*', requireAdmin);
```
Any request attempting to modify users, delete ARGs, or fetch system metrics is blocked at the API level if the token lacks the admin role.

### 2.2 Frontend Gating
- The `admin.html` page uses a client-side check on load to verify the user's role.
- If a non-admin user navigates to `/admin.html`, the client-side JavaScript immediately redirects them to `/home.html` or displays a 403 Forbidden page.
- Admin-specific buttons (e.g., "Ban User") in other parts of the application are conditionally rendered out of the DOM for standard users.


