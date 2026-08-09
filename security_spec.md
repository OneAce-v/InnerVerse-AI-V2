# Firestore Security Specification

## Data Invariants
1. A user document `/users/{userId}` can only be created or updated by the authenticated user matching `userId`.
2. All subcollections (`journalEntries`, `foodLogs`, `exerciseLogs`, `notifications`) under `/users/{userId}` require `request.auth.uid == userId`.
3. Strict schema validation helpers enforce max length on text fields and timestamp equality with `request.time`.

## Dirty Dozen Payloads (Security Test Vectors)
1. Unauthenticated write to `/users/user123` -> PERMISSION_DENIED
2. User A writing to `/users/userB/journalEntries/e1` -> PERMISSION_DENIED
3. User writing oversized text (>5000 chars) in journal entry -> PERMISSION_DENIED
4. User writing spoofed `userId` mismatching `request.auth.uid` -> PERMISSION_DENIED
5. User modifying `createdAt` during document update -> PERMISSION_DENIED
6. User setting client-controlled timestamp instead of `request.time` -> PERMISSION_DENIED
7. User attempting to inject arbitrary ghost keys on update -> PERMISSION_DENIED
8. Unauthenticated list query on `/users` collection -> PERMISSION_DENIED
9. User reading another user's PII profile -> PERMISSION_DENIED
10. Impersonating admin role without admin document -> PERMISSION_DENIED
11. Writing invalid document ID containing special characters -> PERMISSION_DENIED
12. Unverified email write attempt on protected collections -> PERMISSION_DENIED
