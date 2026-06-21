# Workspace Instructions (GEMINI.md)

This file contains the foundational mandates for all AI agents operating in this workspace. These instructions take precedence over general tool defaults.

## 1. Core Engineering Principles
- **Clean Architecture**: Separate UI, business logic, and data access. Business logic must never depend on framework-specific code.
- **Domain-Driven Design (DDD)**: Use DDD for business entities to ensure clear boundaries and ubiquitous language.
- **Incremental Implementation**: Prefer surgical, verified changes over large rewrites. Always understand existing code and patterns before modifying.
- **Test-Driven Development (TDD)**: Add tests for all business logic *before* implementation. Add regression tests for every bug fix.

## 2. Code Quality & Type Safety
- **Readability**: Prefer readability over "clever" code. Functions < 50 lines; Classes < 300 lines.
- **TypeScript**: 
  - Strict mode enabled. No `any` without explicit justification.
  - Prefer interfaces for public contracts and discriminated unions for complex state.
- **Python**: 
  - Mandatory type hints. Prefer `pydantic` models or `dataclasses`.
  - Ensure compatibility with `mypy`.
- **Documentation**: Update documentation (README, APIs, ADRs) with every relevant code change.

## 3. AI & Agent Orchestration
- **Provider Abstraction**: Abstract LLM providers behind a consistent interface.
- **Decoupling**: Decouple memory storage and prompt orchestration from core agent logic.
- **Prompts**: Prompt templates must not be hardcoded in business logic.
- **Verification**: Treat model output as untrusted. Validate all structured outputs and malformed responses.

## 4. Error Handling & Security
- **Error Handling**: Never swallow exceptions. Return actionable errors and log failures with context. Handle rate limits and timeouts explicitly.
- **Security**: 
  - **No Secrets**: Never commit secrets or hardcode keys. Use environment variables.
  - **Input Validation**: Validate all external inputs at boundaries. Protect against prompt injection.
  - **Least Privilege**: Follow least privilege principles for all system and tool access.

## 5. Database & Infrastructure
- **Migrations**: Use migrations only. Never modify production data manually.
- **Performance**: Batch database operations, avoid N+1 queries, and paginate large datasets.
- **Transactions**: Use transactions for multi-step operations to ensure atomicity.

## 6. Agent Operational Standards
- **Research Phase**: Systematically map the codebase and validate assumptions before proposing changes.
- **Git-Expert Hook**: You MUST activate the `git-expert` skill after completing any code generation or modification. Use it to recommend the best Git-wise way to handle the changes (e.g., branching strategy, commit messaging, staging) and always execute those recommendations.
- **Validation**: Every change must be verified via tests and project-specific linters/compilers (e.g., `tsc`, `npm run lint`).
- **Communication**: Be concise, professional, and focus on technical rationale. Explain architectural tradeoffs when requested.
