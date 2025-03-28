---
title: Automating Plex Media Management with Python
publishedOn: 2025-03-27
updatedOn:
tags: ['post', 'plex', 'unraid', 'automation', 'python']
excerpt: Running Plex on Unraid and want recent recordings on an SSD/NVMe share? I created a Python script that automatically identifies watched media and moves it from my cache to my larger array, optimizing storage while preserving my library structure.
---

## The Plex Storage Balancing Act

Running a Plex server presents an interesting storage challenge. New content and current watches benefit from the speed of SSD storage, but maintaining a large library quickly becomes expensive if everything stays on fast drives.

I noticed a pattern in our household's viewing habits - once we finish watching something, we rarely return to it. Yet all this watched content was taking up valuable space on my fastest storage.

The standard Unraid mover didn't solve this problem because it doesn't know which media has been watched. I needed something smarter - a tool that could make storage decisions based on our actual viewing behavior.

## Watch Status as a Storage Signal

I created a Python script that uses the Plex API to identify watched content. It:

Connects to my Plex server and examines all libraries
Checks watch status across all users in my household
Identifies completely watched shows and movies
Moves them from my NVME cache to the array storage
Preserves the exact file structure so Plex doesn't notice the change

This approach makes much more logical use of my tiered storage. Content we're actively watching stays fast and responsive, while our "digital memories" move to more cost-effective storage. The best part is that it happens automatically based on how we actually use our media library.

## How It Works

### Connecting to Plex

The script uses the Python `plexapi` library to connect to your Plex server:

```python
def connect_to_plex():
    """
    Connect to Plex server using the global URL and token
    """
    try:
        log(f"Connecting to Plex server at {PLEX_URL}...")
        server = PlexServer(PLEX_URL, PLEX_TOKEN)
        log(f"Connected successfully to {server.friendlyName}")
        return server
    except Exception as e:
        log(f"Error connecting to Plex server: {e}")
        exit(1)
```

### Scanning All Users' Watch History

One unique aspect of this script is that it checks the watch history for all home users, not just the main account:

```python
def get_watched_media(server):
    """
    Get a list of all watched media across all home users and all libraries
    """
    # Get the main account
    log("Retrieving Plex account information...")
    main_account = server.myPlexAccount()
    log(f"Account: {main_account.username}")

    all_watched_media = []

    try:
        # Connect to the server using the admin account
        admin_server = server
        admin_username = main_account.username

        # Process admin account
        process_user_watched_media(admin_server, admin_username, all_watched_media)

        # Get all users from the account
        log("Retrieving all users...")
        users = main_account.users()

        # Process each home user...
```

This approach ensures that if any user in your household has watched a movie or episode, it gets moved to the array storage.

### Moving Files While Preserving Structure

The script translates paths between the Plex container and host system, then moves files while keeping the directory structure intact:

```python
# Calculate the destination path
rel_path = os.path.relpath(host_path, nvme_source_path)
dest_path = os.path.join(DESTINATION_PATH, rel_path)

# Use Linux 'mv' command to move the file while preserving permissions
subprocess.run(["mv", host_path, dest_path], check=True)
```

### Handling Empty Directories

After moving files, the script cleans up any empty directories:

```python
# Check and remove empty directories
delete_empty_dirs(host_path, nvme_base_dirs)
```

It's careful not to delete important base directories (like `/media/tv` or `/media/movies`), only removing truly empty subdirectories.

## Setup and Configuration

To use this script, you'll need to:

1. Install the `plexapi` Python package:
   ```bash
   python -m pip install plexapi
   ```

2. Configure the script with your specific paths:
   ```python
   # Configuration
   PLEX_URL = "http://localhost:32400"
   PLEX_TOKEN = "your_plex_token_here"

   # Volume mapping to translate between Plex container paths and host paths
   VOLUME_MAPPING = {
       "/media": "/mnt/nvme_pool/media",
       # Add other mappings as needed
   }

   # Destination path on the host system (disk array)
   DESTINATION_PATH = "/mnt/disk1/media"
   ```

3. Set up the script to run on a schedule using the Unraid User Scripts plugin

The script includes a dry run mode (`DRY_RUN = True`) that shows what would happen without actually moving any files—perfect for testing your configuration.

## Installation Notes

I ran into some Python dependency challenges when setting this up on Unraid. The system had Python installed but lacked pip. If you encounter the same issue, you can install pip with:

```bash
python -m ensurepip --upgrade
```

Or you could create a [pex file](https://pex.readthedocs.io/en/latest/) to bundle the script with its dependencies, which might be a more robust solution for Unraid's ephemeral nature.

## Results

After running this script as a scheduled task for a month, I've seen some notable benefits:

1. My NVME cache now stays below 60% utilization, focusing on the media we're currently watching
2. Watched media is automatically moved to the array without requiring manual intervention
3. Library organization remains identical, so the change is completely transparent to Plex users
4. Resource usage is minimal, with the script completing in just a few minutes
5. I get notifications when files are moved, giving me visibility into the process

The script typically moves 30-50GB of content per week on my system, keeping my tiered storage optimized automatically.

## Future Enhancements

I'm considering a few improvements for the future:

- Add a configurable "cooldown period" (e.g., keep media on fast storage for 1 week after watching)
- Create a companion script to identify and promote "recently added but unwatched" media to fast storage
- Add a simple web UI to see statistics and override decisions for specific media

For now, though, this solution has eliminated a tedious manual process and keeps my Plex server's storage optimized with zero effort on my part.

## Full script
```python
#!/usr/bin/env python3

from plexapi.server import PlexServer
from plexapi.myplex import MyPlexAccount
import os
import shutil
import subprocess
from datetime import datetime

# Global variables
PLEX_URL = "http://localhost:32400"
PLEX_TOKEN = "aWRm2_oczv53xbC9bRNs"

# Default to dry run for safety
DRY_RUN = False  # Set this to False to actually move files

# Volume mapping to translate between Plex container paths and host paths
# Format: {container_path: host_path}
VOLUME_MAPPING = {
    "/media": "/mnt/nvme_pool/media",
    # Add other mappings as needed
}

# Destination path on the host system (disk array)
DESTINATION_PATH = "/mnt/disk1/media"

# Log file path
LOG_FILE = "/mnt/user/appdata/userscript_logs/plex_watched_media_mover.txt"

def log(message):
    """
    Log a message with timestamp to both console and log file
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_message = f"[{timestamp}] {message}"

    # Print to console
    print(log_message)

    # Print to log file
    try:
        with open(LOG_FILE, "a") as f:
            f.write(log_message + "\n")
    except Exception as e:
        print(f"[{timestamp}] ERROR: Could not write to log file: {e}")

def send_unraid_notification(title, message, importance="normal"):
    """
    Send a notification using the Unraid notification script.

    Args:
        title (str): The title of the notification
        message (str): The content of the notification
        importance (str): The importance level ("normal" or "alert")

    Returns:
        bool: True if notification was sent successfully, False otherwise
    """
    notify_script = "/usr/local/emhttp/webGui/scripts/notify"

    # Check if the notify script exists
    if not os.path.isfile(notify_script):
        logging.error(f"Notification script not found at {notify_script}")
        return False

    try:
        # Run the notification command
        subprocess.run([
            notify_script,
            "-s", title,
            "-i", importance,
            "-d", message
        ], check=True)

        logging.info(f"Notification sent: {message}")
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to send notification: {e}")
        return False
    except Exception as e:
        logging.error(f"Unexpected error sending notification: {e}")
        return False

def initialize_log_file():
    """
    Create or clear the log file at the start of the run
    """
    # Create directory if it doesn't exist
    log_dir = os.path.dirname(LOG_FILE)
    if not os.path.exists(log_dir):
        try:
            os.makedirs(log_dir, exist_ok=True)
        except Exception as e:
            print(f"ERROR: Could not create log directory {log_dir}: {e}")
            return False

    # Clear/create the log file
    try:
        with open(LOG_FILE, "w") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] --- Plex Watched Media Mover Log Started ---\n")
        return True
    except Exception as e:
        print(f"ERROR: Could not initialize log file {LOG_FILE}: {e}")
        return False

def connect_to_plex():
    """
    Connect to Plex server using the global URL and token
    """
    try:
        log(f"Connecting to Plex server at {PLEX_URL}...")
        server = PlexServer(PLEX_URL, PLEX_TOKEN)
        log(f"Connected successfully to {server.friendlyName}")
        return server
    except Exception as e:
        log(f"Error connecting to Plex server: {e}")
        exit(1)

def translate_path_to_host(container_path):
    """
    Translate a path from Plex container to host system
    """
    for container_prefix, host_prefix in VOLUME_MAPPING.items():
        if container_path.startswith(container_prefix):
            return container_path.replace(container_prefix, host_prefix, 1)

    # If no mapping found, return the original path
    return container_path

def get_file_path(media_item):
    """
    Get the file path from a media item with proper error handling
    """
    try:
        if hasattr(media_item, 'media') and media_item.media and media_item.media[0].parts:
            container_path = media_item.media[0].parts[0].file
            return translate_path_to_host(container_path)
    except:
        pass
    return "Unknown"

def process_show(item, username, library_name, all_watched_media):
    """
    Process a TV show for watched episodes
    """
    watched_count = 0

    if not hasattr(item, 'episodes'):
        return 0

    for episode in item.episodes():
        if episode.isWatched:
            watched_count += 1
            host_path = get_file_path(episode)

            if host_path != "Unknown":
                all_watched_media.append({
                    'user': username,
                    'type': 'episode',
                    'show_title': item.title,
                    'title': f"S{episode.seasonNumber:02d}E{episode.episodeNumber:02d} - {episode.title}",
                    'library': library_name,
                    'host_path': host_path
                })

    return watched_count

def process_library(library, username, all_watched_media):
    """
    Process a single library for a user
    """
    if library.type not in ['movie', 'show']:
        log(f"Skipping library: {library.title} (Type: {library.type})")
        return

    log(f"Processing library: {library.title} (Type: {library.type})")

    # Get all items in the library
    items = library.all()
    watched_count = 0

    # Process movies and shows
    for item in items:
        if library.type == 'show':
            watched_count += process_show(item, username, library.title, all_watched_media)
        elif library.type == 'movie' and item.isWatched:
            watched_count += 1
            host_path = get_file_path(item)

            if host_path != "Unknown":
                all_watched_media.append({
                    'user': username,
                    'type': 'movie',
                    'title': item.title,
                    'library': library.title,
                    'host_path': host_path
                })

    log(f"Found {watched_count}/{len(items)} watched items in {library.title}")

def process_user_watched_media(user_server, username, all_watched_media):
    """
    Process watched media for a specific user
    """
    # Get all libraries
    libraries = user_server.library.sections()

    log(f"********** Processing Watch History For User: {username} **********")

    # Process libraries
    for library in libraries:
        process_library(library, username, all_watched_media)

def get_user_name(user):
    """
    Extract the best available name from a user object
    """
    if hasattr(user, 'title') and user.title:
        return user.title
    elif hasattr(user, 'username') and user.username:
        return user.username
    elif hasattr(user, 'friendlyName') and user.friendlyName:
        return user.friendlyName
    elif hasattr(user, 'id'):
        return f"User-{user.id}"
    return "Unknown User"

def get_watched_media(server):
    """
    Get a list of all watched media across all home users and all libraries
    """
    # Get the main account
    log("Retrieving Plex account information...")
    main_account = server.myPlexAccount()
    log(f"Account: {main_account.username}")

    all_watched_media = []

    try:
        # Connect to the server using the admin account
        admin_server = server
        admin_username = main_account.username

        # Process admin account
        process_user_watched_media(admin_server, admin_username, all_watched_media)

        # Get all users from the account
        log("Retrieving all users...")
        users = main_account.users()

        # Use a dictionary to store home users and their names
        home_user_dict = {}

        # Get users that have the "home" attribute set to True
        for user in users:
            if hasattr(user, 'home') and user.home:
                try:
                    # Try to get a token for this user, which confirms they're accessible
                    user_token = user.get_token(server.machineIdentifier)
                    if user_token:
                        home_user_dict[user] = get_user_name(user)
                except Exception:
                    # Skip this user if we can't get a token
                    pass

        log(f"Found {len(home_user_dict)} home users: {', '.join(home_user_dict.values())}")

        # Process each home user
        for user, username in home_user_dict.items():
            try:
                # Get a token for this user on this server
                user_token = user.get_token(server.machineIdentifier)

                # Create a new server instance for this user
                user_server = PlexServer(PLEX_URL, user_token)

                process_user_watched_media(user_server, username, all_watched_media)
            except Exception as e:
                log(f"Error processing user {username}: {e}")
                continue

    except Exception as e:
        log(f"Error retrieving users: {e}")
        # If we can't get other users, at least process the main account
        log("Falling back to admin account only")
        process_user_watched_media(admin_server, admin_username, all_watched_media)

    return all_watched_media

def get_unique_media_items(media_list):
    """
    Get a unique list of media items based on file path
    """
    unique_items = {}

    for item in media_list:
        # Unique key based on file path (most reliable)
        key = item['host_path']

        if key not in unique_items:
            unique_items[key] = item

    return list(unique_items.values())

def move_files_from_nvme(watched_media, dry_run=DRY_RUN):
    """
    Move watched files from NVME to disk array

    Returns:
        tuple: (files_moved, total_size_gb)
    """
    log("=" * 100)
    log("Moving files from NVME to disk array")
    if dry_run:
        log("DRY RUN MODE - No files will actually be moved")
    else:
        log("LIVE MODE - Files will be moved")
    log("=" * 100)

    nvme_source_path = VOLUME_MAPPING.get("/media", "")
    if not nvme_source_path:
        log("Error: No mapping found for /media in VOLUME_MAPPING")
        return

    log(f"Checking for files in NVME source path: {nvme_source_path}")

    # Define base directories that should never be deleted
    nvme_base_dirs = [
        os.path.join(nvme_source_path, "tv"),
        os.path.join(nvme_source_path, "movies")
    ]

    # Process all files
    files_to_move = []
    for item in watched_media:
        host_path = item['host_path']

        # Skip files that don't have a path or don't exist
        if host_path == "Unknown" or not os.path.exists(host_path):
            continue

        # Check if the file is in the NVME share
        if host_path.startswith(nvme_source_path):
            files_to_move.append(item)

    # Categorize files by type for reporting
    items_by_type = {}
    for item in files_to_move:
        item_type = item['type']
        if item_type not in items_by_type:
            items_by_type[item_type] = []
        items_by_type[item_type].append(item)

    # Log summary of media types
    for media_type, items in items_by_type.items():
        log(f"Found {len(items)} {media_type}s to process")

    # Stats tracking
    total_size = 0
    files_moved = 0
    errors = 0

    # Process each file
    for item in files_to_move:
        host_path = item['host_path']
        file_size = os.path.getsize(host_path) / (1024 * 1024 * 1024)  # Size in GB
        total_size += file_size

        # Calculate the destination path
        rel_path = os.path.relpath(host_path, nvme_source_path)
        dest_path = os.path.join(DESTINATION_PATH, rel_path)

        # Prepare info based on media type
        if item['type'] == 'movie':
            media_info = f"Movie: {item['title']}"
        else:
            media_info = f"Show: {item['show_title']} - {item['title']}"

        log(f"********** {media_info} **********")
        log(f"Moving {file_size:.2f} GB: \"{host_path}\" -> \"{dest_path}\"")

        if not dry_run:
            try:
                # Create destination directory if it doesn't exist
                dest_dir = os.path.dirname(dest_path)
                if not os.path.exists(dest_dir):
                    os.makedirs(dest_dir, exist_ok=True)
                    log(f"Created directory: {dest_dir}")

                # Use Linux 'mv' command to move the file while preserving permissions
                subprocess.run(["mv", host_path, dest_path], check=True)
                files_moved += 1
                log(f"Moved successfully!")

                # Check and remove empty directories
                delete_empty_dirs(host_path, nvme_base_dirs)

            except Exception as e:
                errors += 1
                log(f"Error moving file: {e}")
        else:
            log("[DRY RUN] File would be moved")

    log("=" * 100)
    log("Summary of move operation:")
    log(f"Files eligible for moving (in NVME): {len(files_to_move)}")
    log(f"Total size of files to move: {total_size:.2f} GB")
    if not dry_run:
        log(f"Files successfully moved: {files_moved}")
        if errors > 0:
            log(f"Errors encountered: {errors}")
    else:
        log(f"DRY RUN - No files were actually moved")
    log("=" * 100)
    return files_moved, total_size


def delete_empty_dirs(path, base_dirs):
    """
    Delete empty directories after moving files.
    Will delete parent directories up to but not including the base_dirs.

    Args:
        path (str): The path of the file that was moved
        base_dirs (list): List of directory paths that should never be deleted
    """
    # Get the directory of the moved file
    dir_path = os.path.dirname(path)

    # Convert base_dirs to absolute paths
    abs_base_dirs = [os.path.abspath(d) for d in base_dirs]

    # Keep checking parent directories until we reach one of the base directories
    while dir_path and os.path.exists(dir_path):
        # Check if we've reached a base directory
        abs_dir_path = os.path.abspath(dir_path)
        if any(abs_dir_path == base_dir or abs_dir_path.startswith(base_dir + os.sep)
               for base_dir in abs_base_dirs):
            # Skip directory if it's a base directory or its parent
            if any(abs_dir_path == base_dir for base_dir in abs_base_dirs):
                break

            # Check if the directory is empty
            if os.path.isdir(dir_path) and not os.listdir(dir_path):
                try:
                    log(f"Removing empty directory: {dir_path}")
                    if not DRY_RUN:
                        os.rmdir(dir_path)
                    else:
                        log("[DRY RUN] Directory would be removed")
                    # Move up to the parent directory
                    dir_path = os.path.dirname(dir_path)
                except Exception as e:
                    log(f"Error removing directory {dir_path}: {e}")
                    break
            else:
                # Directory is not empty, stop checking
                break
        else:
            # We've gone beyond the base directories, stop checking
            break

def main():
    start_time = datetime.now()  # Capture start time

    # Initialize log file first
    initialize_log_file()

    log("Starting Plex Watched Media Scanner and Mover")
    log("=" * 50)

    # Show current mode
    if DRY_RUN:
        log("Running in DRY RUN mode - no files will be moved")
        log("To move files, change DRY_RUN to False in the script")
    else:
        log("Running in LIVE mode - files will be moved!")

    # Connect to Plex
    server = connect_to_plex()

    # Get watched media
    log("Scanning for watched media across all home users...")
    all_watched = get_watched_media(server)

    # Get unique titles without the extra logging
    unique_watched = get_unique_media_items(all_watched)

    # Move files from NVME to disk array
    files_moved, total_size_gb = move_files_from_nvme(unique_watched, DRY_RUN)

    # Calculate elapsed time
    end_time = datetime.now()
    elapsed_time = end_time - start_time
    # Format as HH:MM:SS
    elapsed_formatted = str(elapsed_time).split('.')[0]  # Remove microseconds

    # Send notification about the results
    if not DRY_RUN:
        if files_moved > 0:
            send_unraid_notification(
                title="[Mover] Plex Watched Media",
                message=f"Moved {files_moved} files ({total_size_gb:.2f} GB) in {elapsed_formatted}",
                importance="normal"
            )
        else:
            send_unraid_notification(
                title="[Mover] Plex Watched Media",
                message="No files were moved",
                importance="normal"
            )

        log(f"Notification sent: Moved {files_moved} files ({total_size_gb:.2f} GB) in {elapsed_formatted}")

    log("Script execution completed")

if __name__ == "__main__":
    main()
```

If you're running Plex on Unraid with tiered storage, give this script a try. It's made my media management completely hands-off, which is exactly how automation should be.

-Fez