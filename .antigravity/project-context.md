Always read:

graphify-out/GRAPH_REPORT.md
graphify-out/graph.json

Understand the architecture from Graphify before inspecting source code.

Use graph relationships and architecture reports to identify relevant files, dependencies, and data flow.

Do not scan the entire repository unless required for the task.

Only inspect files that are directly relevant to the requested feature, bug fix, enhancement, refactor, or analysis.

Before making changes:

Identify affected modules and files.
Understand their relationships through Graphify.
Check whether similar functionality already exists.
Identify dependencies and downstream impact.
Explain the implementation approach before making significant architectural changes.
Codebase Discipline

Prefer modifying existing files over creating new files.

Create new files only when they clearly improve architecture, maintainability, separation of concerns, or are required for the requested functionality.

Do not create duplicate implementations of existing functionality.

Do not create alternative versions of existing services, utilities, components, hooks, APIs, schemas, or business logic.

Do not create demo files, sample files, playground files, scratch files, experimental files, temporary files, backup files, or duplicate implementations unless explicitly requested.

Do not create documentation files unless explicitly requested.

Do not create test files unless necessary to validate critical functionality or explicitly requested.

Reuse existing code whenever possible.

Extend existing functionality before introducing new abstractions.

Keep the repository clean, organized, and production-ready.

After completing changes, verify that no unnecessary files have been introduced.

Architecture & Development

Follow the existing architecture, folder structure, coding patterns, naming conventions, and design principles.

Maintain consistency with the project's established conventions.

Prefer extending existing functionality rather than introducing parallel implementations.

Avoid:

Duplicate business logic
Duplicate state management
Duplicate APIs
Duplicate schemas
Duplicate validation logic
Duplicate data models

Maintain a single source of truth wherever possible.

Fix root causes instead of applying temporary workarounds.

Do not refactor unrelated code while implementing a task.

Keep changes focused and directly related to the requested requirement.

Modify the minimum number of files necessary while preserving proper architecture and separation of concerns.

Preserve backward compatibility unless explicitly instructed otherwise.

Favor:

Maintainability
Readability
Simplicity
Consistency
Reliability

Avoid overengineering.

Choose the simplest solution that fully satisfies the requirement.

Think like a senior engineer maintaining a long-term production system.

Security Requirements

Never weaken:

Authentication
Authorization
Access Control
Input Validation
Encryption
Security Headers
Session Management
Rate Limiting
Audit Logging

without explicit instruction.

Validate all external inputs.

Avoid introducing:

Security vulnerabilities
Injection risks
Privilege escalation paths
Data leakage
Authentication bypasses
Authorization bypasses
Insecure defaults

Follow existing security patterns already present in the codebase.

Performance & Scalability

Avoid introducing:

Unnecessary re-renders
N+1 database queries
Excessive API calls
Blocking operations
Memory leaks
Duplicate network requests
Inefficient loops
Unnecessary state updates

Preserve or improve performance whenever possible.

Follow existing caching, pagination, batching, indexing, and optimization patterns.

Do not sacrifice maintainability for premature optimization.

Dependencies & Configuration

Do not introduce new dependencies unless absolutely necessary.

Before adding a dependency:

Verify the existing stack cannot solve the problem adequately.
Explain why the dependency is needed.
Explain the impact on maintenance, security, and bundle size.

Do not modify:

Infrastructure
Deployment Configurations
CI/CD Pipelines
Environment Variables
Authentication Systems
Security Settings
Build Systems

unless explicitly requested or required for the requested functionality.

Avoid database schema changes unless required for the requested functionality.

If schema changes are required:

Explain why they are necessary.
Minimize impact.
Preserve backward compatibility whenever possible.
Code Quality

Write clean, production-ready code.

Remove:

Dead code
Unused imports
Unused variables
Obsolete implementations
Redundant logic
Unnecessary complexity introduced during changes

Do not leave:

TODOs
FIXMEs
Placeholder code
Mock implementations
Temporary hacks
Incomplete functionality

unless explicitly requested.

Ensure new code integrates naturally with the existing codebase.

Prefer production-quality implementations over mock solutions.

Avoid:

Hardcoded credentials
Hardcoded secrets
Hardcoded tokens
Hardcoded environment values
Excessive debugging statements
Console spam
Decision Making

Do not assume requirements when ambiguity exists.

Ask clarifying questions whenever requirements are unclear or multiple interpretations are possible.

When multiple implementation options exist:

Choose the option most consistent with the existing architecture.
Minimize disruption.
Maximize maintainability.
Avoid unnecessary complexity.

Explain significant architectural decisions before implementing them.

Validation Before Completion

Before considering a task complete:

Verify the requested functionality works as intended.
Check for regressions in related functionality.
Ensure no duplicate logic was introduced.
Ensure architecture consistency is maintained.
Ensure no unnecessary files were created.
Ensure imports and dependencies are clean.
Ensure code follows project conventions.
Ensure production-readiness standards are met.
Source Control

Do not commit changes.

Do not create branches.

Do not create pull requests.

Do not push to GitHub.

Do not publish releases.

Only perform source control operations when explicitly instructed.

Expected Behavior

For every task:

Understand the request.
Analyze Graphify outputs first.
Identify affected modules.
Inspect only necessary files.
Reuse existing functionality where possible.
Implement the smallest correct solution.
Preserve architecture consistency.
Validate changes.
Deliver production-ready code.
Keep the repository clean and maintainable.