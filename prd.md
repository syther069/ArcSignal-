# Clario — Product Requirements Document

**Document status:** Hackathon build specification  
**Version:** 1.0  
**Product stage:** From-scratch MVP  
**Primary network:** Monad  
**Primary track:** Trust, Identity & AI Infrastructure  
**Secondary track:** Consumer Products & Payments  
**Optional track:** Onchain Finance & Trading, only if reimbursement settlement is completed  

---

## 1. Executive summary

Clario is a verifiable expense workflow for crypto-native teams. It connects an onchain payment to its business purpose, private supporting evidence, reviewer approval, correction history, and reimbursement state. Sensitive documents remain encrypted offchain while tamper-evident commitments, approval decisions, and settlement references are anchored on Monad.

Crypto transactions prove that value moved, but they rarely explain why it moved, who approved it, whether the evidence later changed, or whether an expense was reimbursed twice. Teams currently reconstruct this context from wallets, spreadsheets, chat messages, accounting tools, and private file storage. The resulting record is fragmented, difficult to audit, and easy to alter without detection.

Clario turns that fragmented process into one coherent record:

> payment → evidence → review → approval → reimbursement → verification

The hackathon MVP targets small crypto teams that pay contractors and contributors across chains. A submitter imports a transaction, adds structured expense details, and attaches a receipt or invoice. Clario encrypts the private data, creates a salted commitment, and anchors the expense version on Monad. An authorized approver signs the exact version. If a material field changes, the old approval becomes invalid. A treasury operator can reimburse the approved expense on Monad, and an independent verifier can validate the exported record without trusting Clario's database.

Clario's core promise is simple: **every team expense becomes clear to the people who need context and verifiable to the people who need proof.**

---

## 2. Product identity

### 2.1 Name

**Clario**

The name communicates clarity, explanation, and confidence. It supports a broader product vision than transaction tagging alone.

### 2.2 One-line description

Clario turns crypto transactions into clear, verifiable expense records with private receipts, team approvals, and onchain accountability powered by Monad.

### 2.3 Hackathon pitch

Clario is a verifiable expense workflow for crypto teams: payments can happen across chains, sensitive receipts stay private, and every expense version, approval, correction, and reimbursement is provably anchored on Monad.

### 2.4 Category

Clario sits at the intersection of:

- Trust and identity infrastructure
- Team treasury operations
- Crypto accounting workflows
- Private document verification
- Stablecoin payments and reimbursements
- Human-supervised AI assistance

### 2.5 Product principles

1. **Private by default.** Receipts, invoices, notes, and personal data must not be published onchain.
2. **Verifiable by design.** Critical state changes must be independently checkable.
3. **Human authority is explicit.** AI can extract and suggest; authorized people approve and pay.
4. **Corrections remain visible.** Editing creates a new version and preserves prior history.
5. **Approvals bind to exact data.** A signature must never silently carry over after a material edit.
6. **Blockchain use must be necessary.** Monad records shared commitments, authorization, decisions, and settlement—not arbitrary private application data.
7. **Fast onboarding matters.** A user should understand and complete the core workflow without needing deep wallet knowledge.
8. **Proofs must state their limits.** Clario can prove integrity, signer authority, timing, and workflow state; it cannot guarantee that every submitted document is truthful.

---

## 3. Problem

### 3.1 Core problem

A blockchain transaction contains an address, token, amount, timestamp, and transaction hash. It does not contain reliable business context. A team still needs to know:

- What was purchased or delivered?
- Which project, department, or client should bear the cost?
- Who submitted the expense?
- Where is the receipt or invoice?
- Who reviewed and approved it?
- Did the expense change after approval?
- Was it reimbursed, rejected, or duplicated?
- Can an auditor verify the record without trusting a screenshot or mutable spreadsheet?

### 3.2 Current workflow

Most small crypto teams combine several disconnected tools:

- Block explorers for payment data
- Spreadsheets for categories and reporting
- Chat applications for approvals
- Cloud drives for invoices and receipts
- Wallets or multisigs for reimbursement
- Manual exports for accountants or auditors

This causes missing context, duplicate work, weak access control, unverifiable approvals, silent edits, and slow month-end reconciliation.

### 3.3 Why existing transaction trackers are insufficient

Portfolio and accounting products can aggregate transactions, categorize activity, and export reports. Clario is differentiated by the integrity of the workflow surrounding an expense:

- The evidence is private but cryptographically committed.
- Each approval refers to one exact expense version.
- Material edits invalidate prior approval.
- Team roles and reviewer authority are verifiable.
- Reimbursement status is linked to an actual payment reference.
- A third party can independently verify an export.

### 3.4 Why Monad

Clario produces frequent, low-value state transitions: submissions, version commitments, approvals, rejections, role updates, and settlement references. Monad is used as the shared coordination and verification layer because these actions benefit from fast confirmation and low transaction cost. It lets the product provide a credible audit trail without placing private records or large files onchain.

---

## 4. Vision and goals

### 4.1 Vision

Become the trusted expense and evidence layer for onchain organizations, allowing any payment to carry private context and portable, verifiable accountability.

### 4.2 Hackathon goal

Deliver a polished end-to-end workflow that proves Clario's central insight:

> A team can keep expense evidence private while making its integrity, approval history, corrections, and reimbursement independently verifiable on Monad.

### 4.3 Product goals

- Reduce the time needed to create and reconcile crypto expense records.
- Prevent approvals from remaining valid after material expense changes.
- Give teams one consistent workflow across imported multichain payments and Monad reimbursements.
- Make audit packages independently verifiable.
- Hide wallet and gas complexity during common user actions where feasible.
- Demonstrate a meaningful, native use of Monad rather than a cosmetic deployment.

### 4.4 Non-goals for the hackathon MVP

- Full double-entry accounting or general ledger replacement
- Tax advice, tax filing, or legal compliance certification
- Proof that a merchant issued a genuine receipt
- Fully decentralized storage of sensitive documents
- Autonomous AI approval or autonomous treasury spending
- Support for every chain, token, exchange, ERP, and accounting platform
- Cross-chain trustless verification of every source transaction
- Enterprise procurement, purchase orders, payroll, or card issuing

---

## 5. Target users

### 5.1 Primary persona: crypto team operator

**Profile:** Founder, operations lead, or community manager at a 3–30 person crypto organization.  
**Needs:** Collect contributor expenses, understand wallet activity, enforce approvals, and prepare clean records.  
**Pain:** Context is scattered across messages, wallets, and spreadsheets.  
**Success:** Can see what each payment was for, who approved it, and whether it was reimbursed.

### 5.2 Primary persona: contributor or contractor

**Profile:** Person who pays an expense or submits an invoice.  
**Needs:** Submit proof quickly, track review status, and receive reimbursement.  
**Pain:** Repeated questions, unclear approval status, and delayed payments.  
**Success:** Submits an expense in minutes and can follow its complete status.

### 5.3 Primary persona: treasury approver

**Profile:** Authorized signer, finance lead, or project owner.  
**Needs:** Review the exact evidence and amount, approve with accountability, and avoid duplicate payment.  
**Pain:** Chat-based approvals lack structure and can become detached from the final expense.  
**Success:** Signs one exact version and immediately sees when an edit requires reapproval.

### 5.4 Secondary persona: external verifier

**Profile:** Accountant, grant reviewer, investor, donor, auditor, or ecosystem partner.  
**Needs:** Confirm record integrity and authorization without receiving database access.  
**Pain:** Screenshots and spreadsheets can be changed after export.  
**Success:** Uploads an audit package and verifies commitments, signatures, versions, and settlement references against Monad.

### 5.5 Initial beachhead

The first focused use case is a small crypto team reimbursing contractors for project expenses. It is narrow enough for a compelling demo and broad enough to expand into grants, DAOs, agencies, protocol contributors, event teams, and onchain businesses.

---

## 6. Jobs to be done

### Submitter

- When I pay for something on behalf of my team, help me attach the purpose and evidence so I can be reimbursed without repeated questions.
- When I make a mistake, let me correct it without erasing the original record.
- When my expense is reviewed or paid, show me a clear status and history.

### Approver

- When a contributor submits an expense, show me the payment, evidence, policy checks, and risk flags in one place.
- When I approve an expense, bind my approval to the exact data I reviewed.
- When relevant data changes, require me to review the new version.

### Treasury operator

- When an approved expense is ready, help me reimburse it on Monad and prevent accidental duplicate settlement.
- When I reconcile the treasury, connect every outgoing reimbursement to its approved claim.

### Verifier

- When I receive an expense report, let me confirm that records were not altered, approvals came from authorized identities, and corrections or reimbursements are complete.

---

## 7. Core user journey

```text
Create workspace
      ↓
Invite members and assign roles
      ↓
Import or enter a source payment
      ↓
Add purpose, category, project, amount, and private evidence
      ↓
AI extracts fields and suggests matches; user confirms
      ↓
Encrypt private record and anchor salted version commitment on Monad
      ↓
Authorized reviewer approves or rejects the exact version
      ↓
If material data changes, create a new version and invalidate approval
      ↓
Treasury reimburses approved claim on Monad
      ↓
Generate report and independently verifiable audit package
```

### 7.1 Required demo story

1. A contractor imports a source-chain payment and uploads a private receipt.
2. Clario extracts the merchant, date, currency, total, and category, and the contractor confirms them.
3. Clario anchors a salted commitment for expense version 1 on Monad.
4. An authorized project owner reviews and approves version 1.
5. The contractor changes the amount or replaces the evidence, creating version 2.
6. The interface clearly marks the old approval invalid and requests reapproval.
7. The project owner approves version 2.
8. The treasury reimburses the contractor in a supported stablecoin on Monad.
9. An external verifier loads the exported package, detects any tampered evidence, verifies the authorized approval, and confirms the reimbursement transaction.

---

## 8. Product scope

### 8.1 Hackathon MVP — required

The following capabilities define a complete submission:

1. Wallet or embedded-wallet sign-in
2. Team workspace creation
3. Role-based membership
4. Manual transaction entry plus at least one transaction import path
5. Structured expense creation
6. Private receipt or invoice upload
7. Salted content commitment and onchain version registration
8. Review queue
9. Approve and reject actions tied to an exact version
10. Automatic approval invalidation after a material edit
11. Monad stablecoin reimbursement or a clearly demonstrated Monad settlement transaction
12. Expense activity timeline built from application and onchain events
13. Exportable verification package
14. Standalone verifier experience
15. A polished seeded demo workspace

### 8.2 Hackathon MVP — recommended stretch

- AI receipt field extraction
- AI category and project suggestions
- Duplicate and anomaly warnings
- Gas-sponsored onchain actions
- Email or wallet-link invitations
- Dashboard analytics
- Indexer-backed event querying
- Wallet risk labels or counterparty intelligence

### 8.3 Post-hackathon expansion

- Multi-level approval policies
- Budgets and spending limits
- Batch reimbursements
- Recurring expenses
- Accounting integrations
- Multisig and smart-account settlement
- Mobile capture
- Vendor identities and attestations
- Grants and milestone disbursements
- Programmable policies
- Cross-workspace auditor portal
- Fiat and stablecoin reconciliation

---

## 9. Functional requirements

### 9.1 Authentication and onboarding

#### Requirements

- Users can sign in with a wallet.
- If an embedded wallet provider is used, users can sign in through email or social login and receive a wallet automatically.
- The product shows a short onboarding sequence: create workspace, add a first expense, invite an approver.
- The application detects the connected network and guides the user to Monad when an onchain action is required.
- Users see a human-readable explanation before signing any message or transaction.
- Where sponsor tooling permits it, Clario sponsors gas for commitment and approval transactions.

#### Acceptance criteria

- A first-time user can reach an empty workspace without already knowing how Monad wallets work.
- A user cannot accidentally submit a Monad transaction while connected to the wrong network.
- Signing prompts state the workspace, expense, version, action, and chain.

### 9.2 Workspaces and membership

#### Roles

- **Owner:** Manages workspace, roles, policies, and all records.
- **Admin:** Manages members and operational settings.
- **Submitter:** Creates and edits their permitted expenses.
- **Approver:** Reviews, approves, and rejects expenses within scope.
- **Treasury:** Executes or records reimbursements.
- **Auditor:** Read-only access to approved reports and permitted evidence.

One member may hold multiple roles.

#### Requirements

- A user can create and name a workspace.
- Owners can invite members by wallet address and optionally email.
- Owners can grant and revoke roles.
- Critical role assignments and revocations are recorded on Monad or included in a verifiable workspace policy commitment.
- Historical approval validity is evaluated using the reviewer's authorization at the time of approval.
- Removed members lose future access without erasing historical actions.

#### Acceptance criteria

- A submitter cannot approve their own expense unless workspace policy explicitly allows it.
- A non-approver cannot record an approval.
- A role revocation prevents new privileged actions.
- Historical actions continue to display the signer and their role at the relevant time.

### 9.3 Transaction ingestion

#### Requirements

- Users can import transactions for supported chains by wallet address.
- The hackathon build should support Monad plus a small set of source chains already practical for the team, such as Ethereum and Base.
- Users can paste a transaction hash when an indexer or explorer result is unavailable.
- Users can manually create an offchain expense or invoice when no prior transaction exists.
- Imported data includes chain ID, transaction hash, sender, recipient, asset, amount, timestamp, and status where available.
- Source-chain facts are visibly distinguished from user-entered business context.
- Each source transaction links to the appropriate explorer.

#### Acceptance criteria

- The same source transaction cannot be accidentally claimed twice in the same workspace without a visible warning.
- Failed or unconfirmed payments cannot appear as confirmed.
- Clario never claims that anchoring a source transaction hash on Monad verifies the source chain by itself.

### 9.4 Expense creation

#### Required fields

- Workspace
- Submitter
- Expense title
- Business purpose
- Category
- Project or cost center
- Original amount and currency/token
- Claim amount and reimbursement currency/token
- Expense date
- Payment source: imported transaction, transaction hash, or manual
- Recipient or merchant
- Evidence status

#### Optional fields

- Client
- Tags
- Tax or invoice identifier
- Attendees
- Location
- Notes
- Custom metadata

#### Requirements

- Drafts are saved offchain and are not committed until submission.
- A submitter previews the normalized record before anchoring it.
- Required data is validated before submission.
- A deterministic canonical representation is created for hashing.
- A cryptographically random salt is included before hashing private data.
- Each submission receives a stable expense ID and monotonically increasing version number.

#### Acceptance criteria

- Equivalent canonical inputs always produce the same commitment when using the same salt.
- Different salts produce different commitments for the same private record.
- The UI never displays a hash as proof that the underlying claim is factually true.

### 9.5 Evidence management and privacy

#### Requirements

- Users can upload PDF, PNG, and JPEG evidence within configured size limits.
- Files are encrypted before or immediately upon storage.
- The file hash, metadata hash, and salt contribute to the expense version commitment.
- Access follows workspace roles and record permissions.
- Evidence links use short-lived authorization rather than public permanent URLs.
- Replacing, adding, or deleting material evidence creates a new expense version.
- Users can download an authorized evidence copy and verify its hash locally or through the verifier.

#### Privacy model

Stored onchain:

- Opaque workspace and expense identifiers or their derived forms
- Version number
- Salted commitment
- Submitter address
- Approval or rejection action
- Authorized signer address
- Timestamp or block reference
- Superseding version relationship
- Reimbursement transaction reference and status
- Role or policy commitments where required

Stored encrypted offchain:

- Receipt and invoice files
- Merchant and employee details
- Full business purpose and notes
- Extracted document text
- Email addresses
- Internal categories, projects, and reports
- Encryption salts and keys, with appropriate separation

#### Acceptance criteria

- No raw receipt, description, personal name, email, or predictable unsalted hash is emitted in a public transaction or event.
- Unauthorized members cannot retrieve evidence through the normal application API.
- Tampering with exported evidence causes verification to fail.

### 9.6 AI-assisted extraction and review

#### Requirements

- AI can extract merchant, date, invoice number, currency, subtotal, tax, and total from evidence.
- AI can suggest a category, project, and matching wallet transaction.
- AI can flag likely duplicates, amount mismatches, suspicious date differences, and incomplete evidence.
- Every AI-produced field is labeled as a suggestion until confirmed by a user.
- The system records model/provider, model version, time, confidence, and user correction for significant AI outputs.
- Private evidence must be sent only to an explicitly configured provider under the product's privacy policy.
- AI cannot approve, reject, or execute a reimbursement in the MVP.

#### Acceptance criteria

- A user can edit or reject every suggestion.
- Low-confidence output is never silently committed.
- The final committed record contains user-confirmed values.
- Failure of the AI provider does not block manual expense submission.

### 9.7 Versioning and commitments

#### Material changes

The following changes must create a new version and invalidate existing approval:

- Claim amount or currency
- Recipient or reimbursement address
- Source payment reference
- Merchant
- Business purpose
- Category or project when policy treats it as approval-relevant
- Added, removed, or replaced evidence
- Reimbursement destination

Cosmetic display changes may remain offchain if they cannot affect interpretation or settlement.

#### Requirements

- Every submitted version is immutable in the application model.
- Editing creates a new version linked to its predecessor.
- The current version is clearly marked.
- Superseded versions remain available to authorized users and verifiers.
- Approval status is calculated per version.
- The UI displays exactly which fields changed between versions.

#### Acceptance criteria

- No update operation overwrites the committed content of a submitted version.
- A material edit to an approved record changes the expense state to `REAPPROVAL_REQUIRED`.
- A verifier can trace the full version chain and identify the active version.

### 9.8 Review and approval

#### States

- `DRAFT`
- `SUBMITTED`
- `IN_REVIEW`
- `CHANGES_REQUESTED`
- `APPROVED`
- `REJECTED`
- `REAPPROVAL_REQUIRED`
- `READY_FOR_REIMBURSEMENT`
- `REIMBURSEMENT_PENDING`
- `REIMBURSED`
- `CANCELLED`

#### Requirements

- Authorized approvers have a review queue.
- A review view combines source payment facts, private expense details, evidence preview, version diff, policy status, and AI risk flags.
- Approval and rejection actions include workspace ID, expense ID, version, commitment, decision, signer, chain ID, and nonce or replay protection.
- Rejection and change requests require a reason.
- Approval may include a private note whose commitment is included in the decision record.
- The contract rejects approval from an unauthorized address.
- The application prevents approvals for a superseded version from appearing current.

#### Acceptance criteria

- The reviewer can identify exactly what is being signed.
- Replaying a valid signature for another workspace, expense, chain, or version fails.
- A self-approval policy violation is blocked.
- The expense timeline reflects both pending and confirmed transaction states.

### 9.9 Reimbursement and settlement

#### Requirements

- An approved expense can be marked ready for reimbursement.
- Treasury can pay a supported stablecoin on Monad from an authorized wallet or smart account.
- The intended token, recipient, and amount are shown before signing.
- A reimbursement is associated with one approved expense version.
- The system records pending, confirmed, failed, and replaced transaction states.
- A confirmed reimbursement stores the transaction hash and normalized settlement details.
- Duplicate reimbursement attempts show a blocking warning and require an explicit administrative recovery path.
- If direct payment is outside MVP constraints, the product may record a manually executed Monad payment, but the demo must verify that transaction onchain.

#### Acceptance criteria

- An unapproved or superseded version cannot enter the standard reimbursement flow.
- The recorded onchain recipient, token, and amount match the approved settlement instruction.
- A failed transaction does not mark the expense reimbursed.
- The verifier can connect the reimbursement to the approved expense version.

### 9.10 Activity timeline and notifications

#### Timeline events

- Draft created
- Expense submitted
- Commitment transaction pending/confirmed/failed
- Evidence added or replaced
- AI extraction completed or corrected
- Review started
- Changes requested
- Version superseded
- Expense approved or rejected
- Reimbursement initiated/confirmed/failed
- Member or role changed
- Export generated

#### Requirements

- Every expense has a chronological timeline.
- Events distinguish application activity from finalized onchain activity.
- Indexed Monad events update the application state idempotently.
- Notifications cover assignment, change requests, approval, reapproval, payment, and failure.
- Hackathon notifications may remain in-app; email or push is a later upgrade.

### 9.11 Dashboard and reporting

#### Requirements

- Dashboard cards show pending review, needs changes, approved unpaid, reimbursed, and total claim value.
- Filters include member, project, category, status, chain, asset, merchant, and date.
- Reports show original and normalized currency values with the price source and timestamp.
- Users can export CSV for operational use.
- Users can export a signed or committed verification package for third-party validation.
- Currency conversion must state the feed/provider, timestamp, and whether the value is historical or current.

#### Acceptance criteria

- Aggregates reconcile to the visible filtered records.
- A report never silently substitutes current prices for historical expense values.
- CSV export includes expense ID, version, approval state, source transaction, reimbursement transaction, and verification status.

### 9.12 Independent verifier

The verifier is a critical product surface, not a hidden developer utility.

#### Inputs

- Clario verification package file
- Optional private evidence files
- Monad RPC or indexed contract data

#### Checks

- Package schema and manifest integrity
- Canonical record reconstruction
- Salted commitment match
- Evidence file hash match
- Expense version exists on Monad
- Version ordering and supersession
- Approval signature or transaction authenticity
- Approver authorization at decision time
- Current approval validity
- Reimbursement reference and settlement match
- Duplicate or conflicting settlement indicators

#### Outputs

- `VERIFIED`
- `VERIFIED_WITH_WARNINGS`
- `FAILED`
- `UNVERIFIABLE`

Each result must explain individual checks in plain language. “Verified” means the package matches the relevant onchain commitments and authorization history; it does not certify economic purpose, receipt authenticity, or tax eligibility.

#### Acceptance criteria

- The verifier can run without authenticated access to Clario's production database.
- Modifying a committed amount or evidence file changes the result to `FAILED`.
- Missing optional evidence produces `UNVERIFIABLE` for that check rather than a misleading success.

---

## 10. Information architecture

### Primary navigation

- Overview
- Expenses
- Review queue
- Reimbursements
- Reports
- Team
- Settings

### Key screens

1. Landing page
2. Sign-in and wallet setup
3. Workspace onboarding
4. Dashboard
5. Expense list
6. Create/import expense
7. Expense detail and timeline
8. Evidence preview
9. Review and approval
10. Reimbursement confirmation
11. Reports and export
12. Public/local verifier
13. Team and roles
14. Integration settings

### UX requirements

- The primary state and next action must be visible on every expense.
- Blockchain terminology should be secondary to user intent.
- Transaction progress should show awaiting signature, submitted, confirming, confirmed, and failed.
- Destructive or financially meaningful actions require a review step.
- Sensitive information must not appear in notifications, URLs, transaction calldata, logs, or analytics.
- All core screens must work on desktop and mobile widths.
- Keyboard navigation, visible focus, semantic labels, contrast, and error association are required.

---

## 11. Data model

### 11.1 Workspace

- `id`
- `name`
- `slug`
- `ownerWallet`
- `policyVersion`
- `policyCommitment`
- `createdAt`
- `status`

### 11.2 Membership

- `workspaceId`
- `userId`
- `walletAddress`
- `roles[]`
- `scope`
- `validFrom`
- `validUntil`
- `grantedBy`
- `grantTransactionHash`
- `revocationTransactionHash`

### 11.3 Expense

- `id`
- `workspaceId`
- `submitterId`
- `currentVersion`
- `status`
- `createdAt`
- `archivedAt`

### 11.4 ExpenseVersion

- `expenseId`
- `version`
- `previousVersion`
- `canonicalSchemaVersion`
- `privateRecordCiphertext`
- `commitment`
- `saltReference`
- `sourceChainId`
- `sourceTransactionHash`
- `claimAmount`
- `claimAsset`
- `reimbursementAddress`
- `evidenceManifestHash`
- `submittedBy`
- `submittedAt`
- `anchorTransactionHash`
- `anchorBlockNumber`

### 11.5 Evidence

- `id`
- `expenseId`
- `version`
- `encryptedStorageKey`
- `ciphertextHash`
- `plaintextHash`
- `mimeType`
- `size`
- `encryptionKeyReference`
- `uploadedBy`
- `uploadedAt`

### 11.6 Decision

- `id`
- `workspaceId`
- `expenseId`
- `version`
- `commitment`
- `decision`
- `reviewerWallet`
- `roleProofOrPolicyVersion`
- `reasonCommitment`
- `createdAt`
- `transactionHash`

### 11.7 Reimbursement

- `id`
- `expenseId`
- `version`
- `approvedCommitment`
- `chainId`
- `tokenAddress`
- `amount`
- `recipient`
- `payer`
- `status`
- `transactionHash`
- `blockNumber`
- `confirmedAt`

### 11.8 AIAnalysis

- `expenseId`
- `version`
- `provider`
- `model`
- `promptVersion`
- `outputCiphertext`
- `confidence`
- `flags[]`
- `createdAt`
- `confirmedBy`
- `confirmedAt`

### 11.9 AuditEvent

- `id`
- `workspaceId`
- `expenseId`
- `actor`
- `eventType`
- `source`
- `payloadCommitment`
- `transactionHash`
- `createdAt`

---

## 12. Onchain architecture

### 12.1 Contract responsibilities

The Monad contracts should remain small and purpose-driven.

**WorkspaceRegistry**

- Registers workspace identifiers
- Stores owner/admin authority or a policy commitment
- Emits role and policy update events
- Supports role validity checks needed by approvals

**ExpenseRegistry**

- Registers a new expense version commitment
- Enforces increasing versions
- Links each version to the previous one
- Marks which version is current
- Emits submission and supersession events

**ApprovalRegistry**

- Records approval or rejection for an exact expense commitment
- Verifies reviewer authorization
- Prevents replay and ambiguous signatures
- Emits decision events
- Exposes current approval validity

**SettlementRegistry or reimbursement module**

- Links a reimbursement to an approved version
- Optionally transfers the supported stablecoin
- Prevents normal duplicate settlement
- Emits initiation and settlement events

For hackathon speed, these responsibilities may be combined into one carefully structured contract if the interfaces and events remain clear.

### 12.2 Suggested contract operations

- `createWorkspace(workspaceId, policyCommitment)`
- `grantRole(workspaceId, account, role, scope)`
- `revokeRole(workspaceId, account, role, scope)`
- `submitVersion(workspaceId, expenseId, version, commitment, previousCommitment)`
- `recordDecision(workspaceId, expenseId, version, commitment, decision, reasonCommitment)`
- `recordSettlement(workspaceId, expenseId, version, commitment, token, recipient, amount, paymentReference)`
- `getCurrentVersion(workspaceId, expenseId)`
- `isApprovalValid(workspaceId, expenseId, version)`
- `isSettled(workspaceId, expenseId, version)`

### 12.3 Required events

- `WorkspaceCreated`
- `RoleGranted`
- `RoleRevoked`
- `PolicyUpdated`
- `ExpenseVersionSubmitted`
- `ExpenseVersionSuperseded`
- `DecisionRecorded`
- `SettlementInitiated`
- `SettlementConfirmed`

### 12.4 Commitment construction

The commitment must use a versioned canonical schema. Conceptually:

```text
commitment = keccak256(
  domainSeparator,
  schemaVersion,
  chainId,
  contractAddress,
  workspaceId,
  expenseId,
  version,
  canonicalPrivateRecordHash,
  evidenceManifestHash,
  randomSalt
)
```

The exact encoding must be specified and tested. Domain separation prevents the same commitment or signature from being reused across chains, contracts, workspaces, or message types.

### 12.5 Monad integration requirements

- Deploy the core registry/settlement contracts to the hackathon-supported Monad network.
- Display contract addresses and explorer links in the application and repository.
- Use Monad for real expense commitment, decision, and reimbursement events in the live demo.
- Measure actual confirmation time and transaction cost during the demo period rather than making unsupported cost claims.
- Include a deployment manifest with chain ID, addresses, deployer, block numbers, source commit, and ABI hashes.

---

## 13. Offchain architecture

### Components

- Web application
- API/backend service
- Relational database
- Encrypted object storage
- Monad RPC client
- Event indexer
- Source-chain data providers
- AI extraction service
- Background job processor
- Verification package generator
- Standalone verifier

### System boundaries

- The database supports discovery, permissions, workflows, and reporting.
- Encrypted storage holds private documents.
- Monad holds public commitments, authority changes, decisions, and settlement references.
- The indexer projects contract events into query-friendly application state.
- The verifier treats the export and Monad as its inputs and does not depend on hidden database state.

### Reliability requirements

- Onchain writes use idempotency keys and recover safely after refresh.
- Background jobs can retry without creating duplicate versions or payments.
- Indexed events are identified by chain, transaction hash, and log index.
- Reorganizations or replaced transactions update provisional states correctly.
- The UI distinguishes local submission from confirmed final state.

---

## 14. Security, privacy, and trust model

### 14.1 Assets to protect

- Receipt and invoice contents
- Personal and business metadata
- Encryption keys
- Workspace membership and access tokens
- Approval authority
- Treasury funds
- Export package integrity
- Provider credentials and API keys

### 14.2 Threats

- Guessing low-entropy receipt or metadata hashes
- Unauthorized evidence access
- Approval replay across records or chains
- Approval remaining valid after an edit
- Duplicate reimbursement
- Frontend substitution of recipient or amount
- Compromised privileged wallet
- Malicious file upload
- AI prompt injection inside a receipt
- Provider outage or incorrect source-chain data
- Event indexer lag or reorganization
- Sensitive data leakage through logs, analytics, URLs, or contract calldata

### 14.3 Required mitigations

- Random salts for private-data commitments
- Authenticated encryption for documents and sensitive records
- Clear key separation and rotation strategy
- Short-lived storage URLs
- MIME validation, file-size limits, and malware scanning where available
- Checksummed addresses and explicit transaction review
- Domain-separated EIP-712 typed data or direct contract calls
- Nonces and replay protection
- Version-bound approvals
- Role checks onchain for authoritative decisions
- Idempotent settlement and duplicate detection
- Server-side authorization on every private object request
- Redaction of secrets and private fields from logs
- Rate limits for authentication, uploads, exports, and AI analysis
- Explicit confirmation for treasury payment
- Graceful manual workflow when AI or third-party data is unavailable

### 14.4 Trust assumptions

Clario's MVP assumes:

- The connected wallet controller is the represented user.
- Workspace owners correctly assign reviewer and treasury roles.
- The backend enforces private-data access and manages encryption correctly.
- Source-chain providers accurately report data subject to independent explorer/RPC checks.
- The configured AI provider processes data according to its agreement.
- Monad supplies the public ordering and integrity of registered events.

### 14.5 Claims Clario can make

- This record matches the commitment registered on Monad.
- This wallet approved or rejected this exact expense version.
- The wallet held the required role according to the recorded policy history.
- A newer version superseded an older one.
- This evidence file matches the committed evidence hash.
- This Monad payment matches the recorded reimbursement instruction.

### 14.6 Claims Clario must not make without additional evidence

- The receipt was issued by the claimed merchant.
- The purchase had a legitimate business purpose.
- The expense is legally or tax deductible.
- A source-chain transaction is valid solely because its hash was stored on Monad.
- AI output is accurate or unbiased.
- An onchain identity necessarily maps to a legally verified human.

---

## 15. Integrations and hackathon bounty strategy

Sponsor names and bounty requirements can change. The team must verify current eligibility, required SDK usage, judging criteria, submission forms, and deadlines before applying. Every integration should strengthen the product's main workflow.

### 15.1 Recommended integration stack

| Capability | Candidate integration | Clario use |
|---|---|---|
| Wallet onboarding | Privy or Dynamic | Email/social onboarding, embedded wallets, account creation |
| Gas sponsorship | Privy, MetaMask, or Alchemy tooling | Sponsor low-cost commitment and approval interactions |
| Contract interaction | Viem | Typed Monad reads, writes, event decoding, and chain configuration |
| Contract safety | OpenZeppelin | Roles, access control, signatures, and standard token handling |
| Event indexing | ENVIO or another Monad-supported indexer | Workspace activity, approvals, versions, and settlement timeline |
| Price data | Chainlink where feeds are supported | Historical or reference conversion values with source attribution |
| Wallet intelligence | Nansen where Monad data is supported | Counterparty labels or risk context presented as advisory signals |
| Stablecoin/payment tooling | Agora or supported stablecoin issuer infrastructure | Reimbursement settlement on Monad |
| RPC/infrastructure | Alchemy or Monad-supported provider | Reliable reads, writes, logs, and transaction lifecycle handling |
| AI extraction | Kimi or an eligible AI sponsor | Receipt extraction, classification, matching, and anomaly suggestions |

### 15.2 Track selection

**Primary: Trust, Identity & AI Infrastructure**

Clario's strongest innovation is verifiable human authority over private expense records. The submission should emphasize role-based identity, exact-version approvals, tamper evidence, portable verification, and human-supervised AI.

**Secondary: Consumer Products & Payments**

Clario provides a complete payment-adjacent user workflow, from transaction context through stablecoin reimbursement. Apply if the track permits operational or business-facing consumer products.

**Conditional: Onchain Finance & Trading**

Apply only if the product executes or verifies a real Monad stablecoin reimbursement and that capability satisfies the track's published rules. Expense tagging alone is not a strong finance submission.

**Conditional: Social, Attention & Culture**

Do not force this track into the MVP. It becomes relevant later if Clario introduces opt-in portable contributor reputation, public grant accountability, or attestations derived from completed work while protecting private financial details.

### 15.3 Bounty selection rule

Pursue a bounty only when all four statements are true:

1. The integration is used in the live end-to-end demo.
2. Removing it would make a meaningful product capability worse.
3. The implementation satisfies the sponsor's explicit technical requirements.
4. The team can explain the integration in one sentence without changing Clario's core pitch.

### 15.4 Recommended priority

1. Wallet onboarding and gas sponsorship
2. Monad indexing
3. Stablecoin reimbursement
4. Price/reference data
5. Wallet intelligence
6. AI extraction

Kuru or another trading venue should only be integrated if Clario adds an intentional treasury conversion flow—for example, converting an approved reimbursement asset into the selected Monad stablecoin. A decorative swap widget would weaken the story.

### 15.5 Monad resources Clario will use

This section is the implementation checklist derived from the hackathon resource hub and the official Monad developer documentation. The team must recheck the [Metropolis resources](https://hackathon.monad.xyz/resources) and [Metropolis tracks](https://hackathon.monad.xyz/tracks) pages before final submission because hackathon-specific links, network requirements, and sponsor eligibility may change during the event.

| Monad resource | How Clario uses it | Required evidence in the submission |
|---|---|---|
| [Monad Developer Documentation](https://docs.monad.xyz/) | Canonical reference for network behavior, EVM compatibility, transactions, gas, and deployment requirements | README links to the official docs and documents any Monad-specific assumptions |
| [Developer Guides](https://docs.monad.xyz/guides) | Starting point for contract deployment, verification, wallet connection, indexing, and AI-related examples | Implementation follows the relevant guide and names the selected path |
| [Network information](https://docs.monad.xyz/developer-essentials/network-information) | Supplies the current chain ID, RPC choices, explorers, native currency, and canonical contract addresses | Runtime chain configuration matches the selected hackathon network; UI links each transaction to a supported explorer |
| [JSON-RPC API](https://docs.monad.xyz/reference/json-rpc/api) | Reads receipts, blocks, logs, fee data, and transaction state; broadcasts Clario contract interactions through the chosen provider | RPC health check, confirmation-state handling, and fallback/error behavior are demonstrated |
| [Deploy a contract](https://docs.monad.xyz/guides/deploy-smart-contract/index) | Deploys Clario's workspace, expense, approval, and settlement contracts using Foundry or Hardhat | Reproducible deployment command/script and deployment manifest are committed |
| [Verify a contract](https://docs.monad.xyz/guides/verify-smart-contract/index) | Publishes verified source for Clario contracts through a supported Monad explorer | Verified contract links appear in the README and demo |
| [Indexer guides](https://docs.monad.xyz/guides/indexers/index) | Provides supported paths for indexing contract events, including GhostGraph, Envio, Envio HyperSync, and QuickNode Streams | Clario's activity feed and review queue visibly consume indexed Monad events |
| [Indexer overview](https://docs.monad.xyz/tooling-and-infra/indexers) | Helps select common-data APIs versus a custom smart-contract event indexer | Architecture documentation explains the selected indexer and its recovery/fallback path |
| [Wallet resources](https://docs.monad.xyz/tooling-and-infra/wallets) | Confirms wallet compatibility and routes advanced onboarding needs to wallet-infrastructure providers | Demo covers connection, network switching, signing, rejection, and reconnect states |
| [Monad faucet](https://faucet.monad.xyz/) | Funds deployment and demo wallets if the hackathon uses Monad testnet | Team wallets have sufficient test funds before the demo; no keys are committed |
| [Monad Developers GitHub](https://github.com/monad-developers/) | Supplies maintained examples and starter repositories for Monad-compatible frontend and contract patterns | Any reused starter or example is credited and substantially adapted to Clario |

#### Selected implementation path

Clario should make one explicit choice for each layer rather than integrating several overlapping tools:

- **Contracts:** Solidity with OpenZeppelin; use the team's existing Foundry or Hardhat experience.
- **Network client:** Viem connected to an RPC provider listed in current Monad network/tooling documentation.
- **Wallet:** Reown AppKit for the official-guide path, or Privy/Dynamic when pursuing embedded-wallet and onboarding bounties.
- **Indexing:** Envio is the preferred hackathon path when its current bounty applies; GhostGraph or QuickNode Streams is a fallback.
- **Explorer:** Use an explorer listed in current official network information for address, transaction, and verified-contract links.
- **Test funds:** Use the official Monad faucet only for a testnet deployment.
- **Production network:** Use mainnet only when required by the current hackathon rules and when supported reimbursement assets are confirmed.

Official Monad documentation currently identifies mainnet as chain ID `143` and testnet as chain ID `10143`. These values must remain configuration rather than duplicated business logic, and the application must call `eth_chainId` at runtime before any write. The hackathon's required network takes precedence over this document.

#### Monad-specific product usage

Clario must use Monad for product-critical actions:

1. Register each submitted expense-version commitment.
2. Record role or policy changes that determine reviewer authority.
3. Record approval and rejection decisions bound to exact commitments.
4. Record supersession when a material edit creates a new version.
5. Execute or verifiably reference the stablecoin reimbursement.
6. Reconstruct the public audit timeline from contract events.
7. Let the verifier independently query the registered versions, decisions, authority history, and settlement state.

Wallet connection alone does not count as sufficient Monad integration. At least the submission, approval, supersession, and settlement path must produce real Monad transactions during the demo.

#### Resource completion checklist

- [ ] Confirm the required hackathon network from the current resources page.
- [ ] Configure chain ID, RPC URL, native currency, and explorer from official network information.
- [ ] Fund deployer and demo wallets through the appropriate official route.
- [ ] Deploy the Clario contracts using the official Foundry or Hardhat workflow.
- [ ] Verify all deployed contracts on a supported Monad explorer.
- [ ] Publish contract addresses, deployment blocks, ABI hashes, and source commit.
- [ ] Index every Clario contract event used by the UI.
- [ ] Add explorer links for commitments, approvals, role changes, and reimbursements.
- [ ] Test runtime chain-ID validation and wrong-network recovery.
- [ ] Test pending, confirmed, failed, and replaced Monad transactions.
- [ ] Measure real demo transaction confirmation time and gas use.
- [ ] Verify current sponsor bounty requirements before naming a sponsor in the final submission.

### 15.6 Metropolis resource-hub adoption plan

The following choices come directly from the [Metropolis Hackathon Resources](https://hackathon.monad.xyz/resources) catalog supplied with this PRD. They are divided into resources Clario should use in the hackathon build, resources that strengthen a specific stretch feature, and resources intentionally deferred.

#### Required resource stack for the hackathon build

| Resource from the Metropolis hub | Clario feature | Implementation decision | Demo or repository evidence |
|---|---|---|---|
| [Differences from Ethereum](https://docs.monad.xyz/developer-essentials/differences) | Safe Monad contract and transaction behavior | Review before contract implementation and record every relevant difference in the engineering notes | README includes a “Monad considerations” section |
| [Developer essentials summary](https://docs.monad.xyz/developer-essentials/summary) | Network setup and deployment readiness | Use as the release checklist for developers | Deployment runbook links to the summary |
| [Gas pricing](https://docs.monad.xyz/developer-essentials/gas-pricing) | Fee estimates for submission, approval, and reimbursement | Estimate gas through RPC and show the user a current estimate before signing | Demo displays a real estimate; results document measured gas |
| [Reserve balance](https://docs.monad.xyz/developer-essentials/reserve-balance) | Reliable transaction preflight | Account for Monad's balance reservation behavior when checking whether a wallet can submit a transaction | Automated test covers insufficient available balance |
| [Tooling and infrastructure](https://docs.monad.xyz/tooling-and-infra) | Provider selection | Use only providers listed as compatible with the selected Monad network | Architecture section names RPC, indexer, wallet, and explorer providers |
| [Deploy a smart contract](https://docs.monad.xyz/guides/deploy-smart-contract/index) | Clario registries and settlement contracts | Use the official Foundry or Hardhat deployment workflow | Reproducible script plus deployment manifest |
| [Verify a smart contract](https://docs.monad.xyz/guides/verify-smart-contract/index) | Public contract inspection | Verify every deployed Clario contract | Explorer links to verified source |
| [Indexers](https://docs.monad.xyz/guides/indexers/index) | Expense timeline, review queue, and settlement state | Implement a custom event indexer rather than repeatedly scanning logs in the browser | Indexed events populate the live application |
| [Privy smart-wallet PWA starter](https://docs.monad.xyz/templates/next-serwist-privy-smart-wallet) | Familiar login, embedded wallet, and sponsored interactions | Preferred frontend starting reference if Clario uses Privy; adapt its wallet layer rather than its visual design | First-time user completes a sponsored commitment flow |
| [Envio HyperIndex](https://docs.envio.dev/docs/HyperIndex/overview) and [Monad setup](https://docs.envio.dev/docs/HyperIndex/monad-testnet) | Fast querying of Clario contract events | Preferred custom indexer for `WorkspaceCreated`, `RoleGranted`, `ExpenseVersionSubmitted`, `DecisionRecorded`, and settlement events | Envio configuration/schema in the repository and indexed demo data |
| [QuickNode Monad quickstart](https://www.quicknode.com/docs/monad/quickstart) and [API overview](https://www.quicknode.com/docs/monad/api-overview) | Primary RPC connection | Use the Metropolis QuickNode Build Plan for RPC access when available | Provider configuration uses environment variables; health check is documented |
| [Tenderly](https://tenderly.co/) | Transaction debugging, simulation, and monitoring | Claim the Metropolis Pro-tier voucher and use it for contract failure analysis and reimbursement simulation | At least one documented simulation/debugging workflow |
| [Zerion API](https://developers.zerion.io/introduction) | Multichain wallet history and candidate expense discovery | Use the Metropolis Builder-tier perk to retrieve and normalize wallet transactions from supported source chains | Imported transaction retains provider, chain, and raw reference provenance |
| [Circle Wallets and gas sponsorship on Monad](https://www.circle.com/blog/now-available-usdc-cctp-wallets-and-contracts-on-monad) | USDC reimbursement | Use supported Circle contract addresses and tooling for the reimbursement asset; do not add a second wallet stack unless required | Real Monad USDC settlement link and matching verifier result |

#### Recommended stack decision

The default Clario hackathon stack is:

```text
Next.js PWA
  ├── Privy smart wallet for onboarding and sponsored user interactions
  ├── Viem for typed contract reads and writes
  ├── QuickNode for Monad RPC
  ├── Envio HyperIndex for Clario event projections
  ├── Tenderly for simulation and debugging
  ├── Zerion API for multichain transaction discovery
  ├── Encrypted object storage for private evidence
  └── Monad contracts for roles, versions, decisions, and USDC settlement references
```

Alchemy's [Smart Wallets SDK](https://www.alchemy.com/docs/wallets/quickstart), [gas sponsorship](https://www.alchemy.com/docs/wallets/transactions/sponsor-gas/overview), [Monad API quickstart](https://www.alchemy.com/docs/reference/monad-api-quickstart), and [EIP-7702 transaction support](https://www.alchemy.com/docs/wallets/transactions/using-eip-7702) form a valid alternative to the Privy plus QuickNode wallet/RPC path. The team should select Alchemy when its bounty criteria or implementation quality is stronger. Running two smart-wallet systems in the MVP creates unnecessary account and signing complexity.

If the chosen wallet path uses an EOA upgrade or delegation, implementation must follow Monad's [EIP-7702 documentation](https://docs.monad.xyz/developer-essentials/eip-7702) and test authorization revocation, replay resistance, and recovery.

#### Trust and identity resources applied to Clario

The Trust, Identity & AI Infrastructure resources describe adjacent ideas rather than a ready-made Clario SDK. Clario should apply their standards and lessons as follows:

| Track resource | Application in Clario | Scope |
|---|---|---|
| [C2PA Content Credentials specification](https://spec.c2pa.org) | Use a versioned, portable manifest model for evidence provenance, transformations, hashes, and signer information | Design reference for the verification-package schema; full C2PA compatibility is a post-hackathon upgrade |
| [Privacy, identity, and trust in C2PA](https://worldprivacyforum.org/posts/privacy-identity-and-trust-in-c2pa/) | Preserve the distinction between integrity and truth | Required copy in verifier results: a matching commitment does not prove the expense claim is truthful |
| [Ethereum Attestation Service](https://docs.attest.org) | Model workspace roles, reviewer credentials, and portable approval attestations | Evaluate for P1; either deploy EAS-compatible contracts on Monad or document why Clario's compact registry is used for MVP |
| [EAS contracts](https://github.com/ethereum-attestation-service/eas-contracts) | Reference schemas, revocation behavior, resolvers, and attestations | Contract-design reference and possible post-hackathon interoperability target |
| [Vana](https://docs.vana.org) | Reference user-controlled, encrypted, grant-gated data access | Architecture reference for Clario's private evidence locker |
| [Ocean compute-to-data examples](https://github.com/deltaDAO/Ocean-Protocol-Use-Cases) | Reference future private computation over evidence without disclosing source documents | Post-hackathon privacy upgrade |

Clario's track narrative should connect these resources to a concrete claim: **C2PA-inspired manifests make evidence portable, Monad commitments make versions tamper-evident, and role-bound attestations make human approval independently verifiable.**

#### Consumer payments resources applied to Clario

| Track resource | Application in Clario | Scope |
|---|---|---|
| [Circle Wallets, USDC, CCTP, and gas sponsorship on Monad](https://www.circle.com/blog/now-available-usdc-cctp-wallets-and-contracts-on-monad) | Reimburse the approved current expense version in USDC and optionally sponsor network fees | P0 for USDC settlement; cross-chain CCTP is P1 |
| [CCIP and CCTP on Monad](https://docs.monad.xyz/tooling-and-infra/cross-chain) | Reference canonical addresses and supported cross-chain routes | P1 only if Clario reimburses a source-chain expense across chains |
| [Splits Protocol](https://splits.org) | Split one approved team expense among multiple reimbursers or cost centers | Post-hackathon; unnecessary for the single-recipient MVP |
| [Superfluid](https://docs.superfluid.org) and [Sablier](https://sablier.com) | Future recurring contractor payments or streamed retainers | Post-hackathon payroll/recurring-expense expansion |

#### AI and agent resources

- [x402 on Monad](https://docs.monad.xyz/guides/x402#what-is-x402) is reserved for a future paid verification API where auditors or agents pay per verification request.
- [ERC-8004 on Monad](https://docs.monad.xyz/guides/erc-8004) and [Trust8004](https://www.8004.org/build) are reserved for a future verifier-agent identity and reputation layer.
- [Alchemy MCP](https://www.alchemy.com/docs/alchemy-mcp-server) and [Envio indexer skills](https://docs.envio.dev/blog/ai-agents-acting-onchain-indexer) may accelerate development, but using a development tool does not count as a user-facing product integration.
- AI receipt extraction remains human-supervised. No agent receives approval authority or permission to reimburse funds in the MVP.

#### Metropolis sponsor perks to claim

The resource hub grants one voucher per team for each listed perk. The team should claim these early enough to avoid blocking the final build:

| Perk | Use in Clario | Claim link |
|---|---|---|
| QuickNode Build Plan — three months | Monad RPC, optional Streams, and production-like demo reliability | [Claim QuickNode perk](https://www.notion.so/quicknode/Quicknode-Credits-for-Metropolis-Hackers-3cd15a82e84c8093b33af5fee0452ca9) |
| Tenderly Pro tier | Simulate, debug, and monitor contract interactions | [Claim Tenderly perk](https://www.notion.so/monad-foundation/Tenderly-Access-for-Metropolis-participants-3ce6367594f280539f27d268d05431cd) |
| Zerion API Builder tier — one month | Import multichain wallet activity and identify candidate expenses | [Claim Zerion perk](https://zerion.notion.site/Free-Zerion-API-Builder-Plan-3cead18255da810aa409ebdcceb05ed3) |

#### Resources intentionally deferred

- Aave, Morpho, Euler, Curvance, Blend, and Pendle are lending or yield resources. They do not improve the core reimbursement workflow in the hackathon MVP.
- Perpl, Uniswap trading skills, and Kuru-style order-book resources are outside Clario's primary trust and expense scope.
- Farcaster and React Native templates are deferred while Clario ships as a focused web PWA.
- Staking, launchpad, collectibles, and attention-market resources do not support the current product promise.
- Mera, P256/passkey proof of personhood, and full mobile-native identity can be evaluated after the core role and approval system works.

Deferring a resource is a scope decision, not a technical incompatibility. Clario should add one only when it improves the end-to-end expense workflow and can be demonstrated clearly.

---

## 16. Non-functional requirements

### Performance

- Initial authenticated dashboard becomes usable within 3 seconds on a normal broadband connection, excluding wallet-provider latency.
- Expense lists paginate and remain responsive at 1,000 records per workspace.
- Upload progress is visible for files larger than 1 MB.
- Onchain state updates optimistically but always show confirmation status.

### Availability and resilience

- Manual expense creation remains available when AI extraction is down.
- Existing records remain readable when a source-chain API is unavailable.
- RPC fallback or a clear retry path exists for critical Monad reads.
- Failed jobs are observable and retryable.

### Accessibility

- Core flows meet WCAG 2.1 AA intent.
- Status is communicated through text and icons, not color alone.
- Dialogs trap focus correctly and return focus when closed.
- Forms expose labels, descriptions, and actionable validation errors.

### Compatibility

- Current stable Chrome, Edge, Firefox, and Safari.
- Responsive layouts down to 360 px width.
- Wallet flows tested with at least the wallets/providers used in the demo.

### Observability

- Structured application errors with request or correlation IDs
- Onchain transaction state tracking
- Indexer lag monitoring
- Failed upload and AI job monitoring
- Privacy-safe product analytics
- No receipt contents, raw notes, secrets, salts, or personal details in telemetry

---

## 17. Analytics and success metrics

### North-star metric

**Verified expense completions:** number of expenses per week that receive valid evidence commitment, authorized approval, and either verified reimbursement or finalized approved status.

### Hackathon success criteria

- One uninterrupted live demonstration of the complete required journey
- At least two real roles using distinct wallets
- At least one material edit that invalidates an approval
- At least one reimbursement confirmed on Monad
- At least one verification package successfully checked
- At least one intentionally tampered package correctly rejected
- Contract addresses, transaction links, and reproducible setup published

### Product metrics

- Time from expense start to submitted commitment
- Percentage of started expenses successfully submitted
- Time from submission to first review
- Reapproval rate after material change
- Time from approval to reimbursement
- Duplicate claims detected
- Percentage of AI suggestions accepted or corrected
- Verification success and warning rates
- Gas paid by user versus sponsored
- Weekly active workspaces
- Verified expenses per active workspace

### Guardrail metrics

- Unauthorized access attempts
- Failed or stuck transactions
- Duplicate settlement attempts
- Evidence upload failure rate
- Incorrect AI field acceptance rate from sampled review
- Private-data leakage incidents
- Support requests per completed expense

---

## 18. MVP acceptance test scenarios

### Scenario A: normal approval and payment

1. Owner creates a workspace and adds a submitter, approver, and treasury member.
2. Submitter imports or enters a payment and uploads evidence.
3. Expense version is committed on Monad.
4. Approver approves the exact version.
5. Treasury reimburses the specified address on Monad.
6. Timeline and verifier show a valid complete chain.

**Expected:** Status reaches `REIMBURSED`; commitment, authority, approval, and settlement checks pass.

### Scenario B: edited after approval

1. Approver approves version 1.
2. Submitter changes the claim amount or evidence.
3. Clario creates version 2.

**Expected:** Version 1 remains historically approved but is superseded; the current expense state becomes `REAPPROVAL_REQUIRED`; payment cannot proceed through the normal flow until version 2 is approved.

### Scenario C: unauthorized approval

1. A submitter or unrelated wallet attempts to approve an expense.

**Expected:** Contract or authorization layer rejects the decision; UI does not show valid approval.

### Scenario D: tampered audit package

1. Export a valid package.
2. Modify the amount, purpose, or receipt bytes.
3. Run verification.

**Expected:** Relevant commitment or evidence checks fail with a clear explanation.

### Scenario E: duplicate reimbursement

1. Reimburse an approved expense.
2. Attempt the same settlement again.

**Expected:** The application blocks the normal action, reports the prior transaction, and the contract prevents duplicate settlement if payment is contract-mediated.

### Scenario F: provider failure

1. AI extraction or a source-chain provider is unavailable.
2. User continues manually.

**Expected:** User can finish a valid expense submission; unavailable enrichment is identified without corrupting the record.

---

## 19. Testing strategy

### Smart contracts

- Role authorization and revocation
- Version monotonicity and predecessor validation
- Exact commitment binding
- Signature domain separation and replay prevention
- Approval validity after supersession
- Self-approval policy enforcement
- Settlement authorization and duplicate prevention
- Event accuracy
- Fuzz tests for identifiers, versions, roles, and amounts
- Invariant: a settled claim must refer to an approved, non-superseded version

### Backend

- Canonical serialization fixtures
- Salt and commitment generation
- Object authorization
- Encryption/decryption round trips
- Upload validation
- Idempotent transaction and event processing
- Source provider normalization
- Export manifest construction
- Price timestamp and source handling
- Sensitive-log redaction

### Frontend

- Create, edit, submit, review, and reimburse flows
- Network mismatch and wallet rejection
- Pending, confirmed, replaced, and failed transactions
- Approval invalidation UI
- Version diff rendering
- Evidence permissions
- Keyboard and screen-reader behavior for critical forms and dialogs

### Verifier

- Valid package
- Changed canonical record
- Changed evidence bytes
- Missing salt
- Missing or unavailable chain event
- Unauthorized signer
- Superseded approval
- Mismatched settlement
- Duplicate settlement reference

### End-to-end

- Run the full demo story against the deployed Monad contracts.
- Test with separate submitter, approver, and treasury identities.
- Verify from a clean browser session without privileged database access.

---

## 20. Delivery roadmap

### Phase 0 — foundation

- Finalize canonical expense schema and privacy boundary.
- Configure Monad network and wallet connection.
- Implement basic workspace and expense data model.
- Create contract interfaces and deployment process.
- Prepare seeded demo identities and sample evidence.

### Phase 1 — verifiable expense core

- Create workspace and roles.
- Create/import expense.
- Encrypt and store evidence.
- Generate salted commitment.
- Submit expense version to Monad.
- Display transaction lifecycle and explorer link.

### Phase 2 — approval integrity

- Build approver review queue.
- Record approval/rejection for exact versions.
- Implement immutable version chain.
- Invalidate approval after material edits.
- Build timeline from indexed events.

### Phase 3 — reimbursement and verification

- Execute or record stablecoin reimbursement on Monad.
- Prevent duplicate reimbursement.
- Generate verification package.
- Build independent verifier.
- Demonstrate tamper detection.

### Phase 4 — intelligence and polish

- Add AI extraction and suggestions.
- Add anomaly and duplicate warnings.
- Add gas sponsorship if eligible.
- Improve onboarding, empty states, errors, responsiveness, and accessibility.
- Add dashboard metrics and reporting.

### Phase 5 — submission

- Deploy final contracts and application.
- Freeze and publish deployment manifest.
- Record a concise demo video.
- Update README, architecture diagram, setup steps, and limitations.
- Verify every selected track and bounty requirement against current rules.
- Submit only bounties with meaningful, demonstrable integrations.

---

## 21. Prioritization

### P0 — submission cannot succeed without it

- Workspace and roles
- Private evidence
- Salted version commitment on Monad
- Version-bound approval
- Approval invalidation on material edit
- Reimbursement reference or transfer on Monad
- Activity timeline
- Export and independent verification
- Complete demo flow

### P1 — materially improves judging strength

- Embedded-wallet onboarding
- Gas sponsorship
- AI receipt extraction
- Duplicate/anomaly warnings
- Indexer integration
- Historical price source
- Polished dashboard and responsive UX

### P2 — valuable after the hackathon

- Advanced approval policies
- Accounting integrations
- Batch payments
- Smart-account treasury
- Vendor attestations
- Budgets and forecasting
- Public grant reporting
- Contributor reputation

### Features to cut first under time pressure

- Broad multichain support beyond the demonstrated chains
- Multiple AI providers
- Custom report builder
- Complex policy language
- Social reputation
- Trading or swap integrations
- Mobile-native application

Do not cut the independent verifier, material-edit invalidation, or real Monad transactions. Those are the clearest proof of Clario's differentiation.

---

## 22. Risks and responses

| Risk | Impact | Response |
|---|---|---|
| Product looks like a transaction tagger | Weak differentiation | Lead with private evidence, exact-version approval, correction integrity, and independent verification |
| Scope becomes too large | Incomplete demo | Focus on contractor reimbursement and one complete workflow |
| Private information leaks onchain | Severe privacy failure | Strict public/private schema, salted commitments, calldata review, automated tests |
| Hash is presented as proof of truth | Misleading trust claim | Explain that it proves integrity and timing, not factual authenticity |
| Approval survives an edit | Core integrity failure | Immutable versions and approval validity bound to commitment |
| Duplicate payment | Financial loss | Idempotency, settlement state, preflight checks, and contract guard |
| Sponsor integration feels artificial | Lower judging credibility | Integrate only when used in the core demo |
| AI makes incorrect extraction | Bad records | Human confirmation, confidence display, manual fallback |
| Indexer or RPC is delayed | Confusing state | Pending states, retry, fallback reads, and explicit finality status |
| Encryption keys are lost | Evidence becomes unavailable | Document backup, recovery, rotation, and organization key strategy |
| Demo depends on external services | Demo failure | Seeded fallback data, provider health checks, and manual path |

---

## 23. Open product decisions

These decisions must be resolved before production but can use documented assumptions during the hackathon:

- Whether workspace roles live fully onchain or use a committed policy with selected onchain checks
- Whether reimbursement transfers occur inside Clario's contract or from an external treasury wallet with recorded proof
- Which stablecoin is supported on the selected Monad network
- Which source chains are included in the demo
- Whether encryption occurs entirely client-side or through a trusted backend envelope-encryption service
- How workspace encryption keys are recovered and rotated
- Which categories or fields count as approval-material under workspace policy
- Required confirmation depth for Monad and source-chain transactions
- Whether the verifier is a route in the main app, a standalone static app, or a CLI plus web interface
- Which wallet, indexer, AI, price, and risk providers satisfy current hackathon bounty rules

---

## 24. Launch and demo assets

### Required repository assets

- Clear README with product problem, solution, architecture, and local setup
- Deployed application URL
- Contract addresses and explorer links
- Deployment manifest
- ABIs and verified source where supported
- Architecture diagram
- Privacy and trust-model explanation
- Test instructions and results
- Known limitations
- Demo account/role instructions without private keys in the repository
- Sample verification package and tampered sample

### Three-minute demo outline

**0:00–0:25 — Problem**  
A payment proves value moved but does not prove purpose, evidence, approval, or reimbursement state.

**0:25–1:05 — Submit**  
Import a payment, upload a private receipt, confirm AI-extracted fields, and anchor the expense commitment on Monad.

**1:05–1:40 — Approve and correct**  
Approve version 1 with an authorized wallet, edit a material field, and show the approval becoming invalid before approving version 2.

**1:40–2:10 — Reimburse**  
Pay the approved claim in a supported stablecoin on Monad and show the linked settlement event.

**2:10–2:45 — Verify**  
Load the audit package in the independent verifier, show all checks passing, then alter the evidence and show failure.

**2:45–3:00 — Close**  
Explain that Clario keeps sensitive context private while making expense integrity and authority portable and verifiable.

### Judge-facing proof points

- Monad is the source of shared proof for versions, roles, decisions, and settlement.
- Private evidence never appears onchain.
- An approval cannot silently survive a meaningful edit.
- Verification does not require trust in Clario's internal database.
- AI reduces manual effort but never receives approval or treasury authority.

---

## 25. Definition of done

The hackathon MVP is done when:

- A new user can enter through the chosen wallet/onboarding flow.
- An owner can create a workspace and assign distinct submitter, approver, and treasury roles.
- A submitter can create an expense from a transaction or manual entry and attach private evidence.
- The application creates a salted, versioned commitment and confirms it on Monad.
- An authorized reviewer can approve the exact committed version.
- A material change produces a new version and visibly invalidates the old approval.
- Treasury can complete or verifiably record a Monad stablecoin reimbursement for the approved current version.
- The activity timeline accurately reconstructs the workflow.
- An export can be verified without production database access.
- Tampering with a committed field or evidence file is detected.
- Contract and application tests cover the critical authorization, versioning, privacy, and settlement paths.
- The deployed app, contract addresses, documentation, demo video, and selected track/bounty submissions are ready before the deadline.

---

## 26. Long-term roadmap

### Team finance platform

- Budgets by project, grant, department, and token
- Policy-driven approval thresholds
- Vendor directory and recurring invoices
- Batch reimbursements and payroll-like contributor payouts
- Multisig and smart-account execution
- Accounting-system sync and reconciliation

### Verifiable business context protocol

- Portable expense attestations
- Vendor-issued invoice commitments
- Selective disclosure for auditors and grant programs
- Organization-controlled schemas
- Public verification SDK and API
- Cross-application approval and evidence standards

### Responsible intelligence

- Learned category and project suggestions per workspace
- Duplicate detection across receipts and payments
- Policy-based review assistance
- Cash-flow and budget forecasting
- Privacy-preserving fraud signals
- Explainable risk scoring with human decisions and feedback

### New markets

- DAO contributor expenses
- Grant milestone evidence
- Event and travel reimbursements
- Crypto agencies and studios
- Protocol ecosystem funds
- Onchain nonprofit and donor reporting
- International contractor operations

---

## 27. Final product position

Clario should not compete as another wallet dashboard or spreadsheet with blockchain labels. Its defensible product is the connection between private business evidence and public, verifiable workflow integrity.

The strongest version of Clario answers five questions for every expense:

1. **What happened?** A payment or claim is normalized into a clear record.
2. **What supports it?** Private evidence is encrypted and tamper-evident.
3. **Who accepted responsibility?** Authorized identities approve an exact version.
4. **What changed?** Corrections preserve history and invalidate stale decisions.
5. **Was it settled?** Reimbursement is tied to the approved record and verifiable on Monad.

If the hackathon build demonstrates those five answers in one polished flow, Clario will present a coherent product, a meaningful Monad integration, and a credible foundation for a real company.
