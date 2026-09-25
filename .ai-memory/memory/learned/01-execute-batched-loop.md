# Learned Patterns: Execute Batched Loop

1. **Agent State Logs**: Temp scratchfiles like `.ai-memory/temp/active-locks.json` and `XX-agent-state.md` are critical to avoid collisions. Ensure `.gitignore` explicitly covers `.ai-memory/temp/` before running.
2. **Chunking Subtasks**: Spawning exactly 3 parallel agents on disjoint chunks (e.g., tasks 1-30, 31-60, 61-100) avoids git merge conflicts and allows safe concurrent task execution.
3. **Artifact Sanitization**: Agent simulation requires manual teardown of scratch text files like `temp.txt` before merging branches to avoid dirtying the commit history.
4. **Plans Index Cleanup**: Pending plans can exist in `index.md` without existing in `.ai-memory/plans/pending/`. Always cross-verify the file system before asserting remaining tasks.
