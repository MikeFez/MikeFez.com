---
title: Streamlining Work Repository Management with Raycast
publishedOn: 2025-03-27
updatedOn:
tags: ['post', 'productivity', 'git', 'raycast', 'python', 'automation']
excerpt: Managing multiple work repositories can be tedious. I built a Python script that automatically clones repositories, opens them in VS Code, and generates Raycast shortcuts for instant access in the future.
---

## Too Many Repositories

Working in software development means juggling an ever-growing collection of Git repositories. For me, it became overwhelming - I was constantly:

Finding repositories, checking if they were already on my machine, cloning them when needed, and then opening them in VS Code. Each time I switched contexts, I'd repeat this process.

What started as a minor annoyance grew into a significant time sink. I needed a better way to manage my workspace.

## Automation to the Rescue

I built a solution around a simple idea: what if one command could handle the entire repository workflow?

My Python script integrated with Raycast now:
- Checks if the repository exists locally
- Clones it automatically when needed
- Opens it directly in VS Code
- Remembers it for next time with a shortcut

The script also maintains the shortcuts automatically - removing ones for deleted repositories and adding new ones as I work with them.

The result is a frictionless workflow where I can instantly access any work repository with just its name.

## How It Works

### Setting Up the Environment

The script first ensures the necessary directories exist and defines some constants:

```python
# Get the home directory and create the full paths
home_dir = str(pathlib.Path.home())
WORK_REPOS_DIRECTORY = os.path.join(home_dir, "Work-Repos")
RAYCAST_REPO_SCRIPTS_DIRECTORY = os.path.join(home_dir, "Nextcloud/Applications/Raycast/Scripts/repo_shortcuts/work")

# Default settings - hardcoded
DEFAULT_ORGANIZATION = "organization"
GITHUB_DOMAIN = "github.com"

# Ensure both directories exist
os.makedirs(WORK_REPOS_DIRECTORY, exist_ok=True)
os.makedirs(RAYCAST_REPO_SCRIPTS_DIRECTORY, exist_ok=True)
```

### Repository Management Logic

The main function handles checking for the repository, cloning it if needed, and opening it in VS Code:

```python
def main():
    # Check if repo name was provided
    if len(sys.argv) < 2:
        print("Please provide a repository name.")
        sys.exit(1)

    repo_name = sys.argv[1]

    # Check if organization was provided as second argument
    organization = DEFAULT_ORGANIZATION
    if len(sys.argv) > 2 and sys.argv[2]:
        organization = sys.argv[2]
        print(f"Using specified organization: {organization}")

    repo_path = os.path.join(WORK_REPOS_DIRECTORY, repo_name)

    # Check if directory exists
    if not os.path.isdir(repo_path):
        print(f"Repository not found, cloning from {organization}...")
        try:
            clone_url = f"git@{GITHUB_DOMAIN}:{organization}/{repo_name}.git"
            subprocess.run(["git", "-C", WORK_REPOS_DIRECTORY, "clone", clone_url], check=True)
            print(f"Cloning complete from {organization}.")
        except subprocess.CalledProcessError:
            print(f"{repo_name} could not be cloned from {organization}.")
            sys.exit(1)
```

The script allows specifying an organization as an optional parameter, which overrides the default. For repositories that already exist locally, it detects the organization from the remote URL:

```python
def get_repo_organization(repo_path):
    """Get the organization from a repository's remote URL"""
    try:
        result = subprocess.run(
            ["git", "-C", repo_path, "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True
        )
        remote_url = result.stdout.strip()

        # Parse organization from URL (handles SSH and HTTPS URLs)
        if ":" in remote_url:
            # SSH format: git@github.com:organization/repo.git
            parts = remote_url.split(":")
            if len(parts) > 1:
                org_repo = parts[1].split("/")
                if len(org_repo) > 0:
                    return org_repo[0].replace(".git", "")
        # ... more parsing logic
```

### Generating Raycast Shortcuts

For each repository, the script creates a Raycast shortcut that includes the organization name:

```python
def generate_script(repo_name, organization):
    """
    Generate a Raycast script to open a specific repository
    """
    script_path = os.path.join(RAYCAST_REPO_SCRIPTS_DIRECTORY, f"open-{repo_name}.sh")

    script_content = f"""#!/bin/bash
# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open {repo_name} in VS Code
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 📂
# @raycast.packageName vs {repo_name}

# Documentation:
# @raycast.description Opens the {repo_name} repository ({organization}) in VS Code

# ... more script content
```

### Keeping Everything in Sync

The script includes a function to prune shortcuts for repositories that no longer exist:

```python
def update_scripts():
    """Update all scripts and prune those for repos that no longer exist"""
    print("Updating Raycast scripts...")

    # Keep track of valid repos using a set
    valid_repos = set()

    # Find all repos in the WORK_REPOS_DIRECTORY
    for item in os.listdir(WORK_REPOS_DIRECTORY):
        repo_dir = os.path.join(WORK_REPOS_DIRECTORY, item)
        if os.path.isdir(repo_dir) and os.path.isdir(os.path.join(repo_dir, ".git")):
            repo_name = os.path.basename(repo_dir)
            valid_repos.add(repo_name)

            # Get the organization from the repo
            organization = get_repo_organization(repo_dir) or DEFAULT_ORGANIZATION

    # Prune scripts for repos that no longer exist
    for script_path in glob.glob(os.path.join(RAYCAST_REPO_SCRIPTS_DIRECTORY, "open-*.sh")):
        if os.path.isfile(script_path):
            script_basename = os.path.basename(script_path)
            script_repo_name = script_basename.replace("open-", "").replace(".sh", "")

            if script_repo_name not in valid_repos:
                print(f"Removing script for deleted repo: {script_repo_name}")
                os.remove(script_path)
```

## Setting It Up with Raycast

The script itself is set up as a Raycast command that accepts two arguments:

```
@raycast.title Open Work Repo
@raycast.argument1 { "type": "text", "placeholder": "Repository Name" }
@raycast.argument2 { "type": "text", "placeholder": "Organization (default: organization)", "optional": true }
```

This allows me to:
1. Press Alt+Space to open Raycast
2. Type "open work repo"
3. Enter the repository name
4. Optionally specify an organization (or use the default)
5. Press Enter

The script handles everything else. For repositories I access frequently, dedicated shortcuts are created that I can access directly by typing the repository name.

## Results

This approach has saved me countless hours managing repositories. The benefits include:

1. **Simplicity**: One command to handle the entire workflow
2. **Speed**: Instant access to any repository I've worked with before
3. **Flexibility**: Easy to work with repositories from different organizations
4. **Discoverability**: Repository shortcuts appear in Raycast search results
5. **Organization**: All work repositories are in a dedicated directory
6. **Cleanliness**: Shortcuts for deleted repositories are automatically pruned

## Future Improvements

I'm considering a few enhancements for this system:

1. Add support for different Git hosting services beyond GitHub
2. Include branch information in the shortcuts
3. Add status indicators to show which repositories have uncommitted changes
4. Integrate with project-specific tooling or environments
5. Create a companion script to batch update all repositories

## Full script

The full script is available below. You can customize the paths and settings to fit your own environment.

```python
#!/usr/bin/env python3

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open Work Repo
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖
# @raycast.argument1 { "type": "text", "placeholder": "Repository Name" }
# @raycast.argument2 { "type": "text", "placeholder": "Organization (default: organization)", "optional": true }
# @raycast.packageName wr

# Documentation:
# @raycast.description Opens or clones a Work Repo

import os
import sys
import pathlib
import stat
import subprocess
import glob

# Get the home directory and create the full paths
home_dir = str(pathlib.Path.home())
WORK_REPOS_DIRECTORY = os.path.join(home_dir, "Work-Repos")
RAYCAST_REPO_SCRIPTS_DIRECTORY = os.path.join(home_dir, "Nextcloud/Applications/Raycast/Scripts/repo_shortcuts/work")

DEFAULT_ORGANIZATION = "organization"

# Ensure both directories exist
os.makedirs(WORK_REPOS_DIRECTORY, exist_ok=True)
os.makedirs(RAYCAST_REPO_SCRIPTS_DIRECTORY, exist_ok=True)

def generate_script(repo_name, organization):
    """
    Generate a Raycast script to open a specific repository

    Args:
        repo_name (str): Repository name
        organization (str): GitHub organization name
    """
    script_path = os.path.join(RAYCAST_REPO_SCRIPTS_DIRECTORY, f"open-{repo_name}.sh")

    script_content = f"""#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open {repo_name} in VS Code
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 📂
# @raycast.packageName vs {repo_name}

# Documentation:
# @raycast.description Opens the {repo_name} repository ({organization}) in VS Code

WORK_REPOS_DIRECTORY=~/Work-Repos
RAYCAST_REPO_SCRIPTS_DIRECTORY=~/Nextcloud/Applications/Raycast/Scripts/Repos

# Function to update all scripts
update_scripts() {{
    # Create a temporary file to keep track of valid repos
    local temp_file=$(mktemp)

    # Find all repos in the WORK_REPOS_DIRECTORY
    for repo_dir in "$WORK_REPOS_DIRECTORY"/*; do
        if [ -d "$repo_dir" ] && [ -d "$repo_dir/.git" ]; then
            local repo_name=$(basename "$repo_dir")
            echo "$repo_name" >> "$temp_file"
        fi
    done

    # Prune scripts for repos that no longer exist
    for script in "$RAYCAST_REPO_SCRIPTS_DIRECTORY"/open-*.sh; do
        if [ -f "$script" ]; then
            local script_repo_name=$(basename "$script" | sed 's/^open-//;s/\.sh$//')
            if ! grep -q "^$script_repo_name$" "$temp_file"; then
                rm "$script"
            fi
        fi
    done

    rm "$temp_file"
}}

# Check if directory exists before opening
if [ ! -d "$WORK_REPOS_DIRECTORY/{repo_name}" ]; then
    echo "Repository {repo_name} not found."
    exit 1
fi

# Update scripts to remove any that no longer exist
update_scripts

# Open the repository in VS Code
code -n "$WORK_REPOS_DIRECTORY/{repo_name}"
"""

    # Write the script file
    with open(script_path, 'w') as f:
        f.write(script_content)

    # Make the script executable (chmod +x)
    current_permissions = os.stat(script_path).st_mode
    os.chmod(script_path, current_permissions | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    print(f"Created script for {repo_name} ({organization})")

def update_scripts():
    """Update all scripts and prune those for repos that no longer exist"""
    print("Updating Raycast scripts...")

    # Keep track of valid repos using a set
    valid_repos = set()

    # Find all repos in the WORK_REPOS_DIRECTORY
    for item in os.listdir(WORK_REPOS_DIRECTORY):
        repo_dir = os.path.join(WORK_REPOS_DIRECTORY, item)
        if os.path.isdir(repo_dir) and os.path.isdir(os.path.join(repo_dir, ".git")):
            repo_name = os.path.basename(repo_dir)
            valid_repos.add(repo_name)

            # Get the organization from the repo
            organization = get_repo_organization(repo_dir) or DEFAULT_ORGANIZATION

            # Generate script if it doesn't exist
            script_path = os.path.join(RAYCAST_REPO_SCRIPTS_DIRECTORY, f"open-{repo_name}.sh")
            if not os.path.exists(script_path):
                generate_script(repo_name, organization)

    # Prune scripts for repos that no longer exist
    for script_path in glob.glob(os.path.join(RAYCAST_REPO_SCRIPTS_DIRECTORY, "open-*.sh")):
        if os.path.isfile(script_path):
            script_basename = os.path.basename(script_path)
            script_repo_name = script_basename.replace("open-", "").replace(".sh", "")

            if script_repo_name not in valid_repos:
                print(f"Removing script for deleted repo: {script_repo_name}")
                os.remove(script_path)

    print("Scripts updated successfully.")

def get_repo_organization(repo_path):
    """Get the organization from a repository's remote URL"""
    try:
        result = subprocess.run(
            ["git", "-C", repo_path, "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True
        )
        remote_url = result.stdout.strip()

        # Parse organization from URL (handles SSH and HTTPS URLs)
        if ":" in remote_url:
            # SSH format: git@github.com:organization/repo.git
            parts = remote_url.split(":")
            if len(parts) > 1:
                org_repo = parts[1].split("/")
                if len(org_repo) > 0:
                    return org_repo[0].replace(".git", "")
        elif "/" in remote_url:
            # HTTPS format: https://github.com/organization/repo.git
            parts = remote_url.split("/")
            for i, part in enumerate(parts):
                if part in ["github.com", "gitlab.com", "bitbucket.org"] and i + 1 < len(parts):
                    return parts[i + 1]
    except Exception:
        pass

    return None

def main():
    # Check if repo name was provided
    if len(sys.argv) < 2:
        print("Please provide a repository name.")
        sys.exit(1)

    repo_name = sys.argv[1]

    # Check if organization was provided as second argument
    organization = DEFAULT_ORGANIZATION
    if len(sys.argv) > 2 and sys.argv[2]:
        organization = sys.argv[2]
        print(f"Using specified organization: {organization}")

    repo_path = os.path.join(WORK_REPOS_DIRECTORY, repo_name)

    # Check if directory exists
    if not os.path.isdir(repo_path):
        print(f"Repository not found, cloning from {organization}...")
        try:
            clone_url = f"git@github.com:{organization}/{repo_name}.git"
            subprocess.run(["git", "-C", WORK_REPOS_DIRECTORY, "clone", clone_url], check=True)
            print(f"Cloning complete from {organization}.")
        except subprocess.CalledProcessError:
            print(f"{repo_name} could not be cloned from {organization}.")
            sys.exit(1)
    else:
        # Get the actual organization from the repo if it exists
        existing_org = get_repo_organization(repo_path)
        if existing_org:
            organization = existing_org
            print(f"Using existing repository's organization: {organization}")

    # Open the repository in VS Code
    subprocess.run(["code", "-n", repo_path])

    # Generate script for this specific repo
    generate_script(repo_name, organization)

    # Update all scripts (including pruning)
    update_scripts()

if __name__ == "__main__":
    main()
```
