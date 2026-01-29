#!/bin/bash

# Execute this script in an Xcode scheme's run post-action.

working_dir="${PROJECT_DIR}/Sparkle Server"
logfile="$working_dir/sparkle_server.log"
screen_session="https_server"

# Reroute stdout and stderr output to log file
exec > "$logfile" 2>&1
# Stop server in detached screen session
screen -S "$screen_session" -X quit

echo "HTTPS server stopped."
