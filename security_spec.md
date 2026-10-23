# Firestore Security Specifications

## 1. Data Invariants
1. Teachers can submit (create) their own form submission. They cannot read other teachers' submissions.
2. Only verified Administrators (matching admin list or designated user email `faouramar@gmail.com`) can read all submissions (`list` / `get`), approve submissions, and print forms.
3. Every submission must contain valid Israeli ID (`^[0-9]{7,10}$`), full teacher name, valid date, school year, and up to 10 questionnaire rows.
4. Immortality: Once created, `createdAt` and `teacherId` cannot be tampered with or modified.
5. PII Protection: Teacher names, Israeli ID numbers, and submission lists must never be accessible to anonymous clients or other teachers.

## 2. The Dirty Dozen Test Payloads
1. **Unauthenticated List Attack**: An unauthenticated user attempts to `list` all documents in `/submissions`. -> Expected: PERMISSION_DENIED.
2. **Teacher Cross-Read Attack**: An authenticated teacher tries to read another teacher's submission document directly. -> Expected: PERMISSION_DENIED.
3. **ID Poisoning Attack**: An attacker submits a document with an ID exceeding 128 characters or containing SQL/Script characters. -> Expected: PERMISSION_DENIED.
4. **Huge Payload / Denial of Wallet Attack**: A submission with 50,000 characters in teacherName. -> Expected: PERMISSION_DENIED.
5. **Invalid ID Format Attack**: An attacker passes teacherId as letters or malicious characters instead of Israeli 7-10 digit number. -> Expected: PERMISSION_DENIED.
6. **Shadow Update Attack**: A user attempts to update a submission with an unapproved key like `isAdmin: true` or `superUser: true`. -> Expected: PERMISSION_DENIED.
7. **Tamper Approval Attack**: A non-admin user attempts to set `principalApproved: true` or change `approvedBonusPercent`. -> Expected: PERMISSION_DENIED.
8. **Unbounded Rows Array Attack**: A payload containing 5,000 questionnaire rows attempting memory exhaustion. -> Expected: PERMISSION_DENIED.
9. **Email Spoofing Attack**: An unverified email token claiming to be `faouramar@gmail.com` with `email_verified: false`. -> Expected: PERMISSION_DENIED.
10. **Admin Escalation Attack**: A standard user attempting to create a document in `/admins/{adminId}` to grant themselves admin privileges. -> Expected: PERMISSION_DENIED.
11. **Immutability Breach**: An attempt to update an existing submission altering `teacherId` or `createdAt`. -> Expected: PERMISSION_DENIED.
12. **Malformed Types Attack**: Passing a boolean or array where `teacherName` is expected as a string. -> Expected: PERMISSION_DENIED.
