# Firebase Security Rules - Ghana Immunization Tracker

## Firestore Security Rules

Copy these rules to your Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ====================================================
    // HELPER FUNCTIONS
    // ====================================================
    
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Check if user belongs to a facility
    function belongsToFacility(facilityId) {
      return isAuthenticated() && 
        exists(/databases/$(database)/documents/userRoles/$(request.auth.uid + '_' + facilityId));
    }
    
    // Check if user has a specific role in a facility
    function hasRole(facilityId, role) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/userRoles/$(request.auth.uid + '_' + facilityId)).data.role == role;
    }
    
    // Check if user is a facility admin
    function isFacilityAdmin(facilityId) {
      return hasRole(facilityId, 'facility_admin');
    }
    
    // Check if user is staff or admin (can write data)
    function canWriteData(facilityId) {
      let roleDoc = get(/databases/$(database)/documents/userRoles/$(request.auth.uid + '_' + facilityId));
      return roleDoc.data.role == 'facility_admin' || roleDoc.data.role == 'staff';
    }
    
    // Validate string field
    function isValidString(field, minLen, maxLen) {
      return field is string && field.size() >= minLen && field.size() <= maxLen;
    }
    
    // Validate date format (YYYY-MM-DD)
    function isValidDateString(dateStr) {
      return dateStr is string && dateStr.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
    }
    
    // ====================================================
    // CHILDREN COLLECTION
    // ====================================================
    match /children/{childId} {
      // Allow read if user belongs to the child's facility
      allow read: if isAuthenticated() && 
        belongsToFacility(resource.data.facilityId);
      
      // Allow create if authenticated and belongs to facility (not read-only)
      allow create: if isAuthenticated() && 
        belongsToFacility(request.resource.data.facilityId) &&
        canWriteData(request.resource.data.facilityId) &&
        // Validate required fields
        isValidString(request.resource.data.name, 1, 200) &&
        isValidString(request.resource.data.motherName, 1, 200) &&
        isValidDateString(request.resource.data.dateOfBirth) &&
        request.resource.data.sex in ['male', 'female', 'Male', 'Female', 'M', 'F'] &&
        // Ensure user sets themselves as creator
        request.resource.data.createdByUserId == request.auth.uid;
      
      // Allow update if user can write and belongs to facility
      allow update: if isAuthenticated() && 
        belongsToFacility(resource.data.facilityId) &&
        canWriteData(resource.data.facilityId) &&
        // Prevent changing critical fields
        request.resource.data.facilityId == resource.data.facilityId &&
        request.resource.data.createdByUserId == resource.data.createdByUserId;
      
      // Only facility admins can permanently delete
      allow delete: if isAuthenticated() && 
        isFacilityAdmin(resource.data.facilityId);
    }
    
    // ====================================================
    // FACILITIES COLLECTION
    // ====================================================
    match /facilities/{facilityId} {
      // Allow read if user belongs to facility
      allow read: if isAuthenticated() && belongsToFacility(facilityId);
      
      // Only facility admins can update facility info
      allow update: if isAuthenticated() && isFacilityAdmin(facilityId);
      
      // Facility creation handled by backend/admin
      allow create, delete: if false;
    }
    
    // ====================================================
    // USER ROLES COLLECTION
    // ====================================================
    match /userRoles/{roleId} {
      // Users can read their own role
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // Facility admins can read all roles in their facility
      allow read: if isAuthenticated() && 
        isFacilityAdmin(resource.data.facilityId);
      
      // Only facility admins can manage roles
      allow create, update, delete: if isAuthenticated() && 
        isFacilityAdmin(request.resource.data.facilityId);
    }
    
    // ====================================================
    // USER PROFILES COLLECTION
    // ====================================================
    match /profiles/{userId} {
      // Anyone authenticated can read profiles (for display names)
      allow read: if isAuthenticated();
      
      // Users can only write their own profile
      allow create, update: if isOwner(userId) &&
        isValidString(request.resource.data.displayName, 1, 100);
      
      // Users can delete their own profile
      allow delete: if isOwner(userId);
    }
    
    // ====================================================
    // ACTIVITY LOGS COLLECTION
    // ====================================================
    match /activityLogs/{logId} {
      // Users can read logs from their facility
      allow read: if isAuthenticated() && 
        belongsToFacility(resource.data.facilityId);
      
      // Staff and admins can create logs
      allow create: if isAuthenticated() && 
        belongsToFacility(request.resource.data.facilityId) &&
        // Ensure user sets themselves as the actor
        request.resource.data.userId == request.auth.uid;
      
      // Activity logs are immutable - no updates or deletes
      allow update, delete: if false;
    }
    
    // ====================================================
    // OUTREACH SESSIONS COLLECTION
    // ====================================================
    match /outreachSessions/{sessionId} {
      // Users can read sessions from their facility
      allow read: if isAuthenticated() && 
        belongsToFacility(resource.data.facilityId);
      
      // Staff and admins can create sessions
      allow create: if isAuthenticated() && 
        belongsToFacility(request.resource.data.facilityId) &&
        canWriteData(request.resource.data.facilityId) &&
        // Validate required fields
        isValidString(request.resource.data.vaccineName, 1, 100) &&
        isValidString(request.resource.data.batchNumber, 3, 50) &&
        request.resource.data.conductedBy == request.auth.uid;
      
      // Staff and admins can update (e.g., mark complete)
      allow update: if isAuthenticated() && 
        belongsToFacility(resource.data.facilityId) &&
        canWriteData(resource.data.facilityId) &&
        // Prevent changing critical fields
        request.resource.data.facilityId == resource.data.facilityId &&
        request.resource.data.conductedBy == resource.data.conductedBy;
      
      // Only facility admins can delete sessions
      allow delete: if isAuthenticated() && 
        isFacilityAdmin(resource.data.facilityId);
    }
    
    // ====================================================
    // SYNC HISTORY COLLECTION
    // ====================================================
    match /syncHistory/{historyId} {
      // Users can read their own sync history
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // Users can create their own sync history
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      // Users can update their own sync history
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // No deletion of sync history
      allow delete: if false;
    }
    
    // ====================================================
    // SETTINGS COLLECTION (per user)
    // ====================================================
    match /settings/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    // ====================================================
    // TRANSFER REQUESTS COLLECTION
    // ====================================================
    match /transferRequests/{requestId} {
      // Both sending and receiving facilities can read
      allow read: if isAuthenticated() && 
        (belongsToFacility(resource.data.fromFacilityId) || 
         belongsToFacility(resource.data.toFacilityId));
      
      // Staff can create transfer requests
      allow create: if isAuthenticated() && 
        belongsToFacility(request.resource.data.fromFacilityId) &&
        canWriteData(request.resource.data.fromFacilityId);
      
      // Both facilities can update (for approval workflow)
      allow update: if isAuthenticated() && 
        (belongsToFacility(resource.data.fromFacilityId) || 
         belongsToFacility(resource.data.toFacilityId)) &&
        canWriteData(resource.data.fromFacilityId);
      
      // Only admins can delete transfer requests
      allow delete: if isAuthenticated() && 
        isFacilityAdmin(resource.data.fromFacilityId);
    }
    
    // ====================================================
    // DEFAULT DENY ALL
    // ====================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Firebase Storage Rules

Copy these rules to Firebase Console → Storage → Rules:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // ====================================================
    // HELPER FUNCTIONS
    // ====================================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Validate file size (max 5MB)
    function isValidFileSize() {
      return request.resource.size < 5 * 1024 * 1024;
    }
    
    // Validate image content type
    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }
    
    // Validate PDF content type
    function isPDF() {
      return request.resource.contentType == 'application/pdf';
    }
    
    // ====================================================
    // USER UPLOADS (avatars, etc.)
    // ====================================================
    match /users/{userId}/{allPaths=**} {
      // Users can read any user's public files
      allow read: if isAuthenticated();
      
      // Users can only write to their own directory
      allow write: if isAuthenticated() && 
        isOwner(userId) && 
        isValidFileSize() &&
        (isImage() || isPDF());
    }
    
    // ====================================================
    // FACILITY FILES
    // ====================================================
    match /facilities/{facilityId}/{allPaths=**} {
      // Authenticated users can read facility files
      allow read: if isAuthenticated();
      
      // Only authenticated users can upload (add more restrictions as needed)
      allow write: if isAuthenticated() && 
        isValidFileSize();
    }
    
    // ====================================================
    // IMMUNIZATION CERTIFICATES
    // ====================================================
    match /certificates/{childId}/{fileName} {
      // Allow reading certificates with proper auth
      allow read: if isAuthenticated();
      
      // Allow creating certificates
      allow create: if isAuthenticated() && 
        isValidFileSize() &&
        isPDF();
      
      // No updates or deletes to prevent tampering
      allow update, delete: if false;
    }
    
    // ====================================================
    // OUTREACH SESSION REPORTS
    // ====================================================
    match /outreach-reports/{facilityId}/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
        isValidFileSize() &&
        isPDF();
      allow update, delete: if false;
    }
    
    // ====================================================
    // DEFAULT DENY
    // ====================================================
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Security Best Practices Checklist

### Immediate Actions
- [ ] Enable Firebase App Check in production
- [ ] Use environment variables for Firebase config
- [ ] Enable email verification for new users
- [ ] Set up Firebase Security Rules monitoring alerts

### Authentication Settings
1. Go to Firebase Console → Authentication → Settings
2. Enable Email/Password authentication
3. Set password requirements (minimum 6 characters)
4. Consider enabling Multi-Factor Authentication (MFA) for admins

### Database Indexes
Add these indexes for optimal query performance:

```javascript
// In Firebase Console → Firestore → Indexes
// Children by facility and creation date
{ 
  collectionGroup: "children",
  fields: [
    { fieldPath: "facilityId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}

// Activity logs by facility and date
{
  collectionGroup: "activityLogs",
  fields: [
    { fieldPath: "facilityId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}

// Outreach sessions by facility and date
{
  collectionGroup: "outreachSessions",
  fields: [
    { fieldPath: "facilityId", order: "ASCENDING" },
    { fieldPath: "sessionDate", order: "DESCENDING" }
  ]
}
```

### Monitoring & Alerts
1. Set up Firebase Alerts for:
   - Rules deployment failures
   - Unusual read/write patterns
   - Authentication failures
   
2. Enable Cloud Logging for security events

### Regular Maintenance
- [ ] Review security rules monthly
- [ ] Audit user roles quarterly
- [ ] Update rules when adding new features
- [ ] Test rules changes in Firebase Emulator first

## Testing Your Rules

Use the Firebase Rules Playground:

1. Go to Firebase Console → Firestore → Rules
2. Click "Rules Playground"
3. Test scenarios:

```javascript
// Test: Authenticated user reading their facility's children
// Expected: ALLOW
{
  "auth": { "uid": "user123" },
  "path": "/children/child456",
  "resource": { "data": { "facilityId": "fac789" } }
}

// Test: Unauthenticated user trying to read
// Expected: DENY
{
  "auth": null,
  "path": "/children/child456"
}

// Test: Read-only user trying to write
// Expected: DENY
{
  "auth": { "uid": "readonly_user" },
  "method": "create",
  "path": "/children/newChild"
}
```
