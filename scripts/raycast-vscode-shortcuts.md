---
title: VS Code Targets Generator for Raycast
publishedOn: 2025-03-27
updatedOn:
tags: ['post', 'automation', 'raycast', 'vscode', 'python']
excerpt: Managing multiple server connections and frequently accessed directories in VS Code can be tedious. I created a Python script to generate Raycast shortcuts that give me one-click access to both local projects and remote servers.
---

## The Problem

I manage several servers and work on multiple projects, both locally and remotely. Opening these directories in VS Code requires either navigating through the file system, using the recent files menu, or typing out SSH remote commands. After a few weeks of this repetitive process, I decided automation was in order.

I already use [Raycast](https://raycast.com/) as my launcher on macOS, and it offers a handy script commands feature that lets you create custom shortcuts. Perfect for my use case.

## The Solution

I created a Python script that generates Raycast shortcut files for both local and remote directories. The script creates two types of shortcuts:

1. **Local directories** - Open a folder on my local machine
2. **Remote directories** - Connect to a server via SSH and open a specific path

Each shortcut is a simple Bash script that Raycast can execute, which then launches VS Code with the appropriate parameters.

## How It Works

The script organizes shortcuts into two directories - one for local paths and one for remote paths:

```python
RAYCAST_BASE_DIRECTORY = os.path.join(home_dir, "Nextcloud/Applications/Raycast/Scripts/repo_shortcuts")
RAYCAST_LOCAL_DIRECTORY = os.path.join(RAYCAST_BASE_DIRECTORY, "local")
RAYCAST_REMOTE_DIRECTORY = os.path.join(RAYCAST_BASE_DIRECTORY, "remote")
```

The core of the script is a `generate_script()` function that handles both local and remote paths:

```python
def generate_script(host, name, path):
    """
    Generate a Raycast script to access a directory in VS Code

    Args:
        host (str, optional): Server hostname for remote paths. If None, path is local.
        name (str): Descriptive name for the directory
        path (str): Path to access
    """
    is_remote = host is not None

    if is_remote:
        script_name = f"open-{host.lower()}-{name.lower().replace(' ', '-')}.sh"
        display_name = f"{host} {name}"
        icon = "🖥️"
        package_name = f"vscode {host} {name}"
        description = f"Opens {path} on {host} server"
        vscode_command = f"code --remote ssh-remote+{host} \"{path}\""
        script_directory = RAYCAST_REMOTE_DIRECTORY
    else:
        script_name = f"open-local-{name.lower().replace(' ', '-')}.sh"
        display_name = f"Local {name}"
        icon = "📁"
        package_name = f"vscode local {name}"
        description = f"Opens local path {path}"
        vscode_command = f"code \"{path}\""
        script_directory = RAYCAST_LOCAL_DIRECTORY
```

Each generated script follows the Raycast command format with the necessary metadata:

```bash
#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open {display_name}
# @raycast.mode silent

# Optional parameters:
# @raycast.icon {icon}
# @raycast.packageName {package_name}

# Documentation:
# @raycast.description {description}

# Open the directory in VS Code
{vscode_command}
```

Finally, the script makes the generated files executable so Raycast can run them:

```python
# Make the script executable (chmod +x)
current_permissions = os.stat(script_path).st_mode
os.chmod(script_path, current_permissions | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
```

## The Results

Running this script creates shortcuts for all my commonly accessed directories:

1. **Remote servers** - I have shortcuts for my home servers (Hermes, Mnemosyne, Hestia) with quick access to docker configurations, Home Assistant, and other important directories.

2. **Local projects** - I can instantly open my blog (MikeFez.com), my Unraid tools project, and other development work.

Now when I need to access any of these locations, I just:
1. Press `⌘+Space` to open Raycast
2. Start typing the name of the location
3. Hit Enter when the shortcut appears

VS Code opens immediately with the correct directory, whether it's local or on a remote server.

## Future Improvements

A few ideas I'm considering:
- Add more metadata to the shortcuts (tags, keywords)
- Create a config file instead of hardcoding the paths
- Add icons based on the directory type or server
- Create a UI for managing the shortcuts

## Full script

If you're interested in setting this up yourself, the full script is available in the code block below. You'll need to customize the paths for your own system and servers.

```python
#!/usr/bin/env python3

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Update VS Code Targets
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🖥️
# @raycast.packageName update-vscode-targets

# Documentation:
# @raycast.description Generates scripts for VS Code remote and local server access

import os
import pathlib
import stat

# Get the home directory and create the full path
home_dir = str(pathlib.Path.home())
RAYCAST_BASE_DIRECTORY = os.path.join(home_dir, "Nextcloud/Applications/Raycast/Scripts/repo_shortcuts")
RAYCAST_LOCAL_DIRECTORY = os.path.join(RAYCAST_BASE_DIRECTORY, "local")
RAYCAST_REMOTE_DIRECTORY = os.path.join(RAYCAST_BASE_DIRECTORY, "remote")

# Ensure the scripts directories exist
os.makedirs(RAYCAST_LOCAL_DIRECTORY, exist_ok=True)
os.makedirs(RAYCAST_REMOTE_DIRECTORY, exist_ok=True)

def generate_script(host, name, path):
    """
    Generate a Raycast script to access a directory in VS Code

    Args:
        host (str, optional): Server hostname for remote paths. If None, path is local.
        name (str): Descriptive name for the directory
        path (str): Path to access
    """
    is_remote = host is not None

    if is_remote:
        script_name = f"open-{host.lower()}-{name.lower().replace(' ', '-')}.sh"
        display_name = f"{host} {name}"
        icon = "🖥️"
        package_name = f"vscode {host} {name}"
        description = f"Opens {path} on {host} server"
        vscode_command = f"code --remote ssh-remote+{host} \"{path}\""
        script_directory = RAYCAST_REMOTE_DIRECTORY
    else:
        script_name = f"open-local-{name.lower().replace(' ', '-')}.sh"
        display_name = f"Local {name}"
        icon = "📁"
        package_name = f"vscode local {name}"
        description = f"Opens local path {path}"
        vscode_command = f"code \"{path}\""
        script_directory = RAYCAST_LOCAL_DIRECTORY

    script_path = os.path.join(script_directory, script_name)

    script_content = f"""#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Open {display_name}
# @raycast.mode silent

# Optional parameters:
# @raycast.icon {icon}
# @raycast.packageName {package_name}

# Documentation:
# @raycast.description {description}

# Open the directory in VS Code
{vscode_command}
"""

    # Write the script file
    with open(script_path, 'w') as f:
        f.write(script_content)

    # Make the script executable (chmod +x)
    current_permissions = os.stat(script_path).st_mode
    os.chmod(script_path, current_permissions | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    print(f"Created {'remote' if is_remote else 'local'} script for {display_name}")

# Generate all scripts
print("Generating VS Code target scripts...")

# Remote server directories
# Hermes server directories
generate_script("Hermes", "proxy-confs", "/opt/docker/volumes/swag/nginx/proxy-confs")
generate_script("Hermes", "docker-compose", "/opt/management/docker-compose")
generate_script("Hermes", "docker", "/opt/docker")

# Mnemosyne server directories
generate_script("Mnemosyne", "docker", "/mnt/user/appdata/docker")
generate_script("Mnemosyne", "UserScripts", "/boot/config/plugins/user.scripts/")
generate_script("Mnemosyne", "root", "/")

# Hestia server directories
generate_script("Hestia", "docker", "/opt/docker")
generate_script("Hestia", "home-assistant", "/opt/docker/volumes/home-assistant")

generate_script("Gilford-Synology", "docker", "/volume1/docker")
generate_script("Mnemosyne-2", "docker", "/volume1/docker")

# Local directories
generate_script(None, "Unraid-Tools", f"{home_dir}/Projects/Unraid-Tools")
generate_script(None, "MikeFez.com", f"{home_dir}/Projects/MikeFez.com")
generate_script(None, "Incubator", f"{home_dir}/Projects/Incubator")
generate_script(None, "Raycast Scripts", f"{home_dir}/Nextcloud/Applications/Raycast/Scripts/")

print("VS Code target scripts generated successfully.")
```
