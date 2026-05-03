#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js dev server... $(date)" >> /home/z/my-project/dev.log
  node node_modules/next/dist/bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE at $(date). Restarting in 3 seconds..." >> /home/z/my-project/dev.log
  sleep 3
done
