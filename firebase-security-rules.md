# Firebase Security Rules

## Firestore Security Rules

Copy these rules to your Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Children collection - users can only access their own children
    match /children/{childId} {
      // Allow read if authenticated (for now, since children don't have userId field)
      // TODO: Add userId field to children documents for proper ownership
      allow read: if isAuthenticated();
      
      // Allow write if authenticated
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // User profiles (if you add them later)
    match /profiles/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
    
    // Settings per user (if you add them later)
    match /settings/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // Vaccination records audit log (if you add them later)
    match /audit_logs/{logId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      // Audit logs should not be updated or deleted
      allow update, delete: if false;
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Recommended Improvements

### 1. Add User Ownership to Children Documents

Currently, children documents don't have a `userId` field. Add this to properly restrict access:

```javascript
// When creating a child
const newChild = {
  ...childData,
  userId: auth.currentUser.uid, // Add this line
  id: `child-${Date.now()}`,
  registeredAt: new Date().toISOString(),
  vaccines: getVaccineSchedule(childData.dateOfBirth),
};
```

Then update rules:

```javascript
match /children/{childId} {
  allow read: if isAuthenticated() && 
    resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && 
    request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAuthenticated() && 
    resource.data.userId == request.auth.uid;
}
```

### 2. Add Data Validation

```javascript
match /children/{childId} {
  // Validate required fields on create
  allow create: if isAuthenticated() &&
    request.resource.data.name is string &&
    request.resource.data.name.size() > 0 &&
    request.resource.data.dateOfBirth is string &&
    request.resource.data.userId == request.auth.uid;
    
  // Prevent changing userId on update
  allow update: if isAuthenticated() &&
    resource.data.userId == request.auth.uid &&
    request.resource.data.userId == resource.data.userId;
}
```

### 3. Rate Limiting (Optional)

Firebase doesn't have built-in rate limiting in rules, but you can implement it with Cloud Functions or use Firebase App Check.

## Firebase Authentication Rules

Ensure these settings in Firebase Console → Authentication → Settings:

1. **Email/Password**: Enabled
2. **Email verification**: Optional but recommended
3. **Password requirements**: Minimum 6 characters (Firebase default)

## Storage Rules (if using Firebase Storage)

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // User uploads
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Testing Your Rules

Use the Firebase Emulator or Rules Playground to test:

1. Go to Firebase Console → Firestore → Rules
2. Click "Rules Playground"
3. Simulate requests to verify access control

## Security Checklist

- [ ] Enable Firebase App Check for production
- [ ] Use environment variables for Firebase config (not in code)
- [ ] Enable email verification for new users
- [ ] Set up Firebase Security Rules monitoring
- [ ] Review and update rules when adding new collections
- [ ] Add `userId` field to all user-owned documents
