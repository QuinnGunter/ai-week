#!/bin/bash

# Execute this script in an Xcode scheme's run pre-action.

server_command="python3 server.py --port 4443 --certificate-file-path server.pem"
working_dir="${PROJECT_DIR}/Sparkle Server"
logfile="$working_dir/sparkle_server.log"
screen_session="https_server"

# Reroute stdout and stderr output to log file
exec > "$logfile" 2>&1

pushd "$working_dir" || exit

if screen -list | grep -q "\.${screen_session}\s"; then
    echo "Screen session '${screen_session}' is already running."
else
    # Start server in detached screen session
    screen -dmS "$screen_session" bash -c "$server_command > \"$logfile\" 2>&1"
    echo "HTTPS server started in detached screen session '${screen_session}'."
fi
