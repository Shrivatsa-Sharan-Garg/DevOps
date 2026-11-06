# 1. Make sure you are on main and have the latest updates
git checkout main
git pull origin main

# 2. Create a temporary "orphan" branch (a branch with no parent commit history)
git checkout --orphan temp-branch

# 3. Stage all your current files and directories (ml/, backend, frontend, DevBridge, etc.)
git add -A

# 4. Commit everything as a single, fresh compressed commit
git commit -m "chore: initial compressed release of main branch"

# 5. Delete the old heavy 'main' branch locally
git branch -D main

# 6. Rename this temporary branch to 'main'
git m -m main

# 7. Force push the single compressed commit to GitHub
git push origin main --force