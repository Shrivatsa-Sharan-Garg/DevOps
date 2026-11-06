# 1. Ensure you are on web-dev and up to date
git checkout web-dev
git pull origin web-dev

# 2. Create a temporary orphan branch (this wipes out all parent commit history completely)
git checkout --orphan temp-web-squash

# 3. Stage all current files in the directory
git add -A

# 4. Commit everything as a single clean initial commit with your co-author tag
git commit \
  -m "chore(web-dev): initial consolidated release for web-dev-fullstack" \
  -m "Co-authored-by: Shrivatsa-Sharan-Garg <179140208+Shrivatsa-Sharan-Garg@users.noreply.github.com>"

# 5. Delete the old web-dev branch locally
git branch -D web-dev

# 6. Rename this temporary orphan branch to web-dev
git branch -m web-dev

# 7. Force push the completely flattened history to remote origin
git push origin web-dev --force-with-lease