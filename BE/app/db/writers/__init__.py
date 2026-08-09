"""Task-DB writer package (Plan 90 Step 96+).

Each writer module owns exactly ONE Task DB table (RunSession, RuleResult,
FrameArtifact) so tier isolation stays greppable and observability routes
can import a narrow surface without pulling the whole persistence stack.
"""
