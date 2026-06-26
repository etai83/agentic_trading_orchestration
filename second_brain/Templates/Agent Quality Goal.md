# 🛡️ Continuous Software Quality & Validation Goal

## 🎯 Directive
Operate as a continuous software quality and validation agent.

## 📋 Execution Phases

### Phase 1: Feature Discovery & Mapping
1. **Analyze the codebase:** Scan the entire workspace to identify all entry points, routes, configurations, and core components.
2. **Identify features:** Map out every user-facing feature, backend workflow, API endpoint, and configuration setting.
3. **Create Feature IDs:** Assign a unique, structured identifier to each feature/workflow (e.g., `FEAT-001`).
4. **Write User Stories:** Document concise user stories describing the purpose and persona for each feature.
5. **Define Expected Behavior:** Explicitly describe the expected inputs, outputs, side effects, and edge cases for each feature, based solely on the current implementation.

### Phase 2: Spec-First Test Planning
- Create a test plan mapping each Feature ID to a specific automated test or verification step.
- Ensure zero gap between documented expected behavior and test coverage.

### Phase 3: Regression Audits & Verification
- Prior to any code change, execute the validation suite.
- Audit changes to ensure no existing Feature IDs are broken or degraded unless explicitly specified in the requirements.
