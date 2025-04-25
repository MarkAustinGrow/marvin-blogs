#!/bin/sh

# Function to handle errors
handle_error() {
  echo "Error occurred: $1"
  exit 1
}

# Start the web server in the background with auto-restart
echo "Starting Marvin Blogger Agent web server..."
(while true; do
  node /app/dist/web/server.js
  echo "Web server exited with code $?. Restarting in 5 seconds..."
  sleep 5
done) &

# Store the web server process ID
WEB_SERVER_PID=$!

# Run the blogger agent immediately
echo "Running Marvin Blogger Agent at $(date)"
node /app/dist/index.js >> /app/logs/app.log 2>&1 || handle_error "Failed to run blogger agent"

# Start the scheduler loop
echo "Starting scheduler..."
while true; do
  echo "Sleeping until next run..."
  sleep 21600  # 6 hours
  
  # Check if web server is still running
  if ! kill -0 $WEB_SERVER_PID 2>/dev/null; then
    echo "Web server is not running. Restarting..."
    (while true; do
      node /app/dist/web/server.js
      echo "Web server exited with code $?. Restarting in 5 seconds..."
      sleep 5
    done) &
    WEB_SERVER_PID=$!
  fi
  
  echo "Running Marvin Blogger Agent at $(date)"
  node /app/dist/index.js >> /app/logs/app.log 2>&1 || echo "Warning: Blogger agent failed, will retry next scheduled run"
done
