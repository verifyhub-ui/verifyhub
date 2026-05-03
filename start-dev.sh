#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js dev server..."
  node node_modules/.bin/next dev -p 3000 2>&1
  echo "Server exited with code $?. Restarting in 3 seconds..."
  sleep 3
done
