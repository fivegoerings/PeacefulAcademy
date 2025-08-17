#!/bin/bash
# update.sh - update repo with prompt for commit message

# Prompt for commit message
read -p "Enter commit description: " desc

# If empty, set a default
if [ -z "$desc" ]; then
  desc="Update repository"
fi

# Stage, commit, and push
git add -A
git commit -m "$desc"

git push -u origin dev
