# Run full check pipeline

Run `npm run check` which executes lint, format check, typecheck, and test in sequence.

If any stage fails:
1. Read the error output carefully
2. Fix the issue
3. Re-run only the failing stage to verify the fix
4. Run the full `npm run check` again to confirm everything passes

Do not stop until all four stages pass with zero errors and zero warnings.
