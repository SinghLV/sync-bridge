#!/bin/bash

# Sync Bridge Auto-Sync Script
echo "🔄 Syncing changes to GitHub..."

# Add all changes
git add .

# Check if there are changes to commit
if git diff-index --quiet HEAD --; then
    echo "✅ No changes to sync."
else
    # Commit changes
    git commit -m "Sync update: $(date +'%Y-%m-%d %H:%M:%S')"
    
    # Push to main
    git push origin main
    echo "🚀 Successfully synced to GitHub!"
fi
