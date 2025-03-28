---
title: Automating Frigate Camera Recordings Management on Unraid
publishedOn: 2025-03-27
updatedOn:
tags: ['post', 'frigate', 'unraid', 'automation', 'bash']
excerpt: Managing storage for Frigate security camera recordings can be challenging. I created a bash script that automatically moves older recordings to a secondary storage pool, optimizing performance while preserving my footage.
---

# Frigate NVR Storage Management: A Practical Guide

## What is Frigate?

Before diving into storage management, let's clarify what Frigate is. [Frigate](https://frigate.video/) is an open-source, self-hosted Network Video Recorder (NVR) system built around real-time object detection. Unlike traditional security camera systems, Frigate uses machine learning to identify people, vehicles, and other objects in real-time, dramatically reducing false positives and storage requirements.

## Storage Challenges with Security Cameras

My Frigate NVR setup records continuous footage from several security cameras around my property. While the AI features are fantastic for reducing false alerts, my implementation still generates hundreds of gigabytes of video files daily.

This created a storage challenge on my Unraid server:
- New recordings need fast write speeds (ideal for SSD/cache)
- Older recordings should be kept for weeks (requiring larger array storage)
- The directory structure needs to be preserved for Frigate to access everything

Manually moving files wasn't sustainable, and letting the standard Unraid mover handle it wasn't optimal either - I needed something that understood the specific requirements of camera recordings.

## A Targeted Solution

I developed a bash script specifically for managing Frigate recordings. It runs as a scheduled task that:

Identifies recordings older than a configurable threshold (24 hours in my case)
Safely transfers them to a designated array share
Maintains the original directory structure
Cleans up empty directories afterward

The script includes safeguards for disk space checking and sends notifications when transfers complete. This approach gives me the best of both worlds: recent footage on fast storage for optimal performance, with older recordings safely archived but still accessible.

## Key Features

The script includes several features to make it reliable for daily use:

### Configurable Settings

```bash
# Configuration
SOURCE_DIR="/mnt/frigate_pool/frigate/recordings"
DEST_DIR="/mnt/disk3/frigate/recordings"
AGE_HOURS=24
LOG_FILE="/mnt/user/appdata/userscript_logs/frigate_mover.log"
DRY_RUN=false  # Set to true for dry run mode
```

You can easily adjust the source and destination directories, how old recordings should be before moving them, and where logs are stored. The dry run mode is particularly useful for testing before actual implementation.

### Optimized Transfers

Rather than moving files one by one, the script processes them by directory to minimize overhead:

```bash
# Use optimized rsync with proper source and destination directories
rsync -a --whole-file --inplace --no-compress --block-size=32768 \
    --remove-source-files --files-from="$modified_file_list" \
    --info=progress2 \
    "$SOURCE_DIR"/ "$DEST_DIR"/
```

These rsync options are tuned for efficient local transfers with minimal CPU usage.

### Intelligent Error Handling

The script includes checks for common issues like insufficient disk space and detailed error logging:

```bash
check_error() {
    local exit_code=$1
    local operation=$2

    if [ $exit_code -ne 0 ]; then
        log_message "ERROR: $operation failed with exit code $exit_code"
        if [ $exit_code -eq 23 ]; then
            log_message "Note: Exit code 23 means some files were not transferred (but some were)"
        fi
        # ... other error handling
    fi
    return $exit_code
}
```

### Cleanup and Notifications

After moving files, the script automatically removes empty directories and sends a notification through the Unraid system:

```bash
if [ $PROCESSED -gt 0 ]; then
    /usr/local/emhttp/webGui/scripts/notify -s "[Mover] Frigate" -i "normal" -d "Moved $PROCESSED files (${TOTAL_HUMAN_SIZE}) in $FORMATTED_TIME"
    log_message "Notification sent: Moved $PROCESSED files (${TOTAL_HUMAN_SIZE}) in $FORMATTED_TIME"
else
    /usr/local/emhttp/webGui/scripts/notify -s "[Mover] Frigate" -i "alert" -d "No files were moved"
    log_message "Notification sent: No files were moved"
fi
```

## Setting Up the Script on Unraid

To implement this on your own Unraid server:

1. Create a new User Script in the Unraid User Scripts plugin
2. Paste the entire script (provided above) into the script editor
3. Configure the source and destination directories for your system
4. Set a schedule (I run it every 6 hours)
5. Run once in dry run mode to verify everything looks correct
6. Switch to normal mode and let it handle your recordings automatically

## Results

After running this script for a few weeks, I've seen several benefits:

1. My fast storage pool stays below 60% utilization, ensuring optimal performance
2. Older recordings are automatically archived to my larger array
3. I can keep recordings for much longer without manual intervention
4. The directory structure is preserved, so all recordings still appear in Frigate's UI

The script typically moves 10-20GB of recordings per day on my system with 4 cameras. The transfer process takes just a few minutes and hasn't caused any noticeable performance impact on my server.

## Future Improvements

I'm considering a few enhancements:

- Add support for variable retention based on camera or event type
- Implement a restore function to move specific dates back to fast storage if needed
- Create a simple web UI to view transfer statistics
- Add the option to compress older recordings to save space

## Full script
```python
#!/bin/bash

# Configuration
SOURCE_DIR="/mnt/frigate_pool/frigate/recordings"
DEST_DIR="/mnt/disk3/frigate/recordings"
AGE_HOURS=24
LOG_FILE="/mnt/user/appdata/userscript_logs/frigate_mover.log"
DRY_RUN=false  # Set to true for dry run mode

# Function to get current timestamp
get_timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

# Function to log and echo message
log_message() {
    local timestamp=$(get_timestamp)
    local message="[$timestamp] $1"
    echo "$message" | tee -a "$LOG_FILE"
}

# Add an error check function
check_error() {
    local exit_code=$1
    local operation=$2

    if [ $exit_code -ne 0 ]; then
        log_message "ERROR: $operation failed with exit code $exit_code"
        if [ $exit_code -eq 23 ]; then
            log_message "Note: Exit code 23 means some files were not transferred (but some were)"
        fi
        if [ $exit_code -eq 12 ]; then
            log_message "Note: Exit code 12 usually indicates an issue with directory permissions"
        fi
    fi
    return $exit_code
}

# Add disk space check
check_disk_space() {
    local dest_dir=$1
    local needed_bytes=$2

    # Get available space on destination
    local avail=$(df -P "$dest_dir" | awk 'NR==2 {print $4}')
    local avail_bytes=$((avail * 1024))

    if [ $avail_bytes -lt $needed_bytes ]; then
        log_message "WARNING: Low disk space on destination. Available: $(format_size "$avail_bytes"), Needed: $(format_size "$needed_bytes")"
        return 1
    fi
    return 0
}
format_size() {
    local size=$1
    local units=("B" "KB" "MB" "GB" "TB")
    local unit=0

    while [ $size -ge 1024 ] && [ $unit -lt 4 ]; do
        size=$(( size / 1024 ))
        unit=$(( unit + 1 ))
    done

    echo "$size ${units[$unit]}"
}

# Check for rsync
if ! command -v rsync &> /dev/null && [ "$DRY_RUN" = false ]; then
    echo "ERROR: rsync is required but not installed. Please install rsync or set DRY_RUN=true."
    exit 1
fi

# Create log directory if needed
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null
log_message "Starting new run" > "$LOG_FILE"

if [ "$DRY_RUN" = true ]; then
    log_message "DRY RUN MODE - No files will be moved"
fi

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    log_message "ERROR: Source directory does not exist: $SOURCE_DIR"
    exit 1
fi

# Ensure the destination directory exists
if [ ! -d "$DEST_DIR" ] && [ "$DRY_RUN" = false ]; then
    mkdir -p "$DEST_DIR"
    log_message "Created destination directory: $DEST_DIR"
elif [ ! -d "$DEST_DIR" ] && [ "$DRY_RUN" = true ]; then
    log_message "Would create destination directory: $DEST_DIR"
fi

# Start the operation
log_message "Starting move of files older than $AGE_HOURS hours"
log_message "Source: $SOURCE_DIR"
log_message "Destination: $DEST_DIR"

# Pre-create all destination directories for better performance
if [ "$DRY_RUN" = false ]; then
    log_message "Pre-creating destination directories..."
    find "$SOURCE_DIR" -type f -mmin +$((AGE_HOURS*60)) -printf "%h\n" | \
        sed "s|^$SOURCE_DIR|$DEST_DIR|" | sort -u | \
        while read -r dir; do
            if [ ! -d "$dir" ]; then
                mkdir -p "$dir"
            fi
        done
    log_message "Directory structure created"
fi

# First, identify all files to process
log_message "Identifying files to move..."
FILE_LIST=$(mktemp)
find "$SOURCE_DIR" -type f -mmin +$((AGE_HOURS*60)) > "$FILE_LIST"
FILE_COUNT=$(wc -l < "$FILE_LIST")
log_message "Found $FILE_COUNT files to move"

# Variable to store total size for notification
TOTAL_HUMAN_SIZE="0 B"

# Group files by directory to optimize transfers
if [ "$FILE_COUNT" -gt 0 ]; then
    # Calculate total size of files to move efficiently
    log_message "Calculating total size..."

    # Use find with -ls to get file sizes, then sum them with awk in one pass
    # 7th field in -ls output contains the file size in bytes
    TOTAL_SIZE=$(find "$SOURCE_DIR" -type f -mmin +$((AGE_HOURS*60)) -ls | awk '{ total += $7 } END { print total }')

    # Format and report the total size
    TOTAL_HUMAN_SIZE=$(format_size "$TOTAL_SIZE")
    log_message "Total size to transfer: $TOTAL_HUMAN_SIZE (${TOTAL_SIZE} bytes)"

    # Check for sufficient disk space
    check_disk_space "$DEST_DIR" "$TOTAL_SIZE"
    if [ $? -ne 0 ] && [ "$DRY_RUN" = false ]; then
        log_message "WARNING: Proceeding anyway, but transfers may fail due to insufficient space"
    fi
    if [ "$DRY_RUN" = false ]; then
        log_message "Optimizing transfers by directory..."
        DIR_LIST=$(mktemp)

        # Extract unique directories from file list
        cat "$FILE_LIST" | xargs -n1 dirname | sort -u > "$DIR_LIST"
        DIR_COUNT=$(wc -l < "$DIR_LIST")

        log_message "Files are spread across $DIR_COUNT directories"

        # Process each directory
        PROCESSED=0
        FAILED=0
        TOTAL_BYTES=0
        START_TIME_TOTAL=$(date +%s)

        CURRENT_DIR=0
        while IFS= read -r src_dir; do
            CURRENT_DIR=$((CURRENT_DIR + 1))
            # Get relative path
            rel_path="${src_dir#$SOURCE_DIR/}"
            dest_dir="$DEST_DIR/$rel_path"

            # Create a temporary file list for this directory
            dir_file_list=$(mktemp)
            find "$src_dir" -maxdepth 1 -type f -mmin +$((AGE_HOURS*60)) > "$dir_file_list"
            files_to_move=$(wc -l < "$dir_file_list")

            if [ "$files_to_move" -eq 0 ]; then
                rm -f "$dir_file_list"
                continue  # Skip if no files to move
            fi

            log_message "[$CURRENT_DIR/$DIR_COUNT] Processing directory: $src_dir ($files_to_move files)"

            # Transfer with optimized rsync settings using --files-from to specify only old files
            start_time=$(date +%s)

            # Create a modified file list with relative paths from SOURCE_DIR
            modified_file_list=$(mktemp)
            while IFS= read -r file; do
                echo "${file#$SOURCE_DIR/}" >> "$modified_file_list"
            done < "$dir_file_list"

            # Use optimized rsync with proper source and destination directories
            rsync -a --whole-file --inplace --no-compress --block-size=32768 \
                --remove-source-files --files-from="$modified_file_list" \
                --info=progress2 \
                "$SOURCE_DIR"/ "$DEST_DIR"/

            exit_code=$?
            check_error $exit_code "Transfer of files from $src_dir"
            end_time=$(date +%s)
            elapsed=$((end_time - start_time))

            # Clean up temp files
            rm -f "$dir_file_list" "$modified_file_list"

            # Count number of files processed
            if [ $exit_code -eq 0 ]; then
                log_message "[$CURRENT_DIR/$DIR_COUNT] Moved $files_to_move files to: $dest_dir/ in ${elapsed}s"
                PROCESSED=$((PROCESSED + files_to_move))

                # Immediately clean up the empty directory if it exists and is empty
                if [ -d "$src_dir" ] && [ -z "$(ls -A "$src_dir")" ]; then
                    log_message "[$CURRENT_DIR/$DIR_COUNT] Removing empty directory: $src_dir"
                    rmdir "$src_dir" 2>/dev/null || log_message "[$CURRENT_DIR/$DIR_COUNT] Failed to remove directory: $src_dir"

                    # Also try to clean up parent directories if they're empty
                    parent_dir="$(dirname "$src_dir")"
                    while [ "$parent_dir" != "$SOURCE_DIR" ] && [ -d "$parent_dir" ] && [ -z "$(ls -A "$parent_dir")" ]; do
                        log_message "[$CURRENT_DIR/$DIR_COUNT] Removing empty parent directory: $parent_dir"
                        rmdir "$parent_dir" 2>/dev/null || break
                        parent_dir="$(dirname "$parent_dir")"
                    done
                fi
            else
                log_message "[$CURRENT_DIR/$DIR_COUNT] ERROR: Failed to move files from $src_dir (Exit code: $exit_code)"
                FAILED=$((FAILED + 1))
            fi
        done < "$DIR_LIST"

        # We don't need a separate directory cleanup step anymore since we clean up after each transfer

        # Show summary
        END_TIME_TOTAL=$(date +%s)
        ELAPSED_TOTAL=$((END_TIME_TOTAL - START_TIME_TOTAL))

        # Format the elapsed time in HH:MM:SS format
        HOURS=$((ELAPSED_TOTAL / 3600))
        MINUTES=$(( (ELAPSED_TOTAL % 3600) / 60 ))
        SECONDS=$((ELAPSED_TOTAL % 60))
        FORMATTED_TIME=$(printf "%02d:%02d:%02d" $HOURS $MINUTES $SECONDS)

        log_message "Successfully moved $PROCESSED files in $FORMATTED_TIME (HH:MM:SS)"

        if [ $FAILED -gt 0 ]; then
            log_message "Failed to process $FAILED directories"
        fi

        # Clean up temp files
        rm -f "$DIR_LIST"

        # Send notification with processed files count and formatted time
        if [ $PROCESSED -gt 0 ]; then
            /usr/local/emhttp/webGui/scripts/notify -s "[Mover] Frigate" -i "normal" -d "Moved $PROCESSED files (${TOTAL_HUMAN_SIZE}) in $FORMATTED_TIME"
            log_message "Notification sent: Moved $PROCESSED files (${TOTAL_HUMAN_SIZE}) in $FORMATTED_TIME"
        else
            /usr/local/emhttp/webGui/scripts/notify -s "[Mover] Frigate" -i "alert" -d "No files were moved"
            log_message "Notification sent: No files were moved"
        fi
    else
        # Dry run mode - just show files
        CURRENT=0
        while IFS= read -r file; do
            CURRENT=$((CURRENT + 1))

            # Get relative path
            rel_path="${file#$SOURCE_DIR/}"
            dir_part=$(dirname "$rel_path")
            file_name=$(basename "$file")
            dest_dir="$DEST_DIR/$dir_part"

            # Get file size
            file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "unknown")
            if [[ "$file_size" =~ ^[0-9]+$ ]]; then
                human_size=$(format_size "$file_size")
            else
                human_size="unknown size"
            fi

            # Only show first 20 files to avoid excessive output
            if [ $CURRENT -le 20 ]; then
                log_message "[$CURRENT/$FILE_COUNT] Processing: $file ($human_size)"
                log_message "[$CURRENT/$FILE_COUNT] Would move to: $dest_dir/$file_name ($human_size)"
            elif [ $CURRENT -eq 21 ]; then
                log_message "... and $((FILE_COUNT - 20)) more files"
            fi
        done < "$FILE_LIST"
    fi
else
    log_message "No files to move"
fi

# Clean up temp file
rm -f "$FILE_LIST"

log_message "Move operation completed"
```

For now, though, this solution has solved my immediate storage challenges and runs reliably in the background.

If you're using Frigate with Unraid and want to implement a similar setup, feel free to use this script as a starting point for your own solution.

-Fez