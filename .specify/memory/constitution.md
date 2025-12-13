<!--
Sync Impact Report:
- Version change: Initial → 1.0.0
- New sections: Core Principles, Development Philosophy, Implementation Guidelines, Governance
- Added principles: 
  * I. Simplicity First (KISS)
  * II. You Aren't Gonna Need It (YAGNI)
  * III. Code Readability
  * IV. Selective Dependencies
  * V. No Over-Engineering
- Templates requiring updates: ✅ updated (plan-template.md, tasks-template.md)
- Follow-up TODOs: None
-->

# Kairos Constitution

## Core Principles

### I. Simplicity First (KISS)
Keep It Simple, Stupid. Every implementation MUST prioritize simplicity over cleverness. 
Complex solutions are only acceptable when simpler alternatives have been exhausted and 
documented. Code should be immediately understandable by any developer joining the project.

**Rationale**: Simple code reduces bugs, maintenance overhead, and onboarding time while 
increasing development velocity and system reliability.

### II. You Aren't Gonna Need It (YAGNI)
Implement only what is explicitly required for the current task. Future-proofing, 
speculative features, and "just in case" code are prohibited. Features must have 
clear, immediate business value before implementation.

**Rationale**: Prevents code bloat, reduces maintenance burden, and keeps the codebase 
focused on actual requirements rather than imagined future needs.

### III. Code Readability
Code MUST be self-documenting through clear naming, logical structure, and minimal complexity. 
Comments should explain "why" not "what". Variable and function names should be descriptive 
and unambiguous. Code review must verify readability standards.

**Rationale**: Readable code is maintainable code. It reduces debugging time, enables 
faster feature development, and ensures knowledge transfer between team members.

### IV. Selective Dependencies
Third-party libraries are preferred over reinventing functionality, but MUST be polished, 
stable, and actively maintained. Dependencies must solve real problems and align with 
project architecture. Every dependency must be justified and documented.

**Rationale**: Leverage community expertise while maintaining code ownership and avoiding 
dependency hell or security vulnerabilities from unmaintained packages.

### V. No Over-Engineering
Architecture and patterns must be appropriate to the problem scale. No premature 
optimization, unnecessary abstractions, or complex design patterns unless current 
requirements demand them. Start simple and evolve only when proven necessary.

**Rationale**: Over-engineering creates unnecessary complexity, increases development time, 
and makes systems harder to understand and maintain.

## Development Philosophy

Implementation approach prioritizes getting working solutions quickly over perfect architecture. 
Refactoring is preferred over extensive upfront design. Solutions should solve the immediate 
problem completely rather than attempting to solve broader problem spaces speculatively.

## Implementation Guidelines

- No automated testing infrastructure (manual testing sufficient for current needs)
- Focus on core functionality before peripheral features
- Use established patterns and libraries where appropriate
- Avoid custom frameworks or complex abstractions
- Prioritize working code over comprehensive documentation
- Make incremental improvements rather than large architectural changes

## Governance

This constitution supersedes all other development practices. All code reviews and feature 
implementations must verify compliance with these principles. When in doubt, choose the 
simpler approach. Amendments require clear justification for changing established principles.

All development decisions should be evaluated against: Does this add unnecessary complexity? 
Is this needed now or just nice to have? Will this be readable in 6 months?

**Version**: 1.0.0 | **Ratified**: 2025-10-01 | **Last Amended**: 2025-10-01