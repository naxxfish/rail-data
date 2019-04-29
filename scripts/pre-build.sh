#!/bin/bash

cp ./config/config.json ./services/td/td_ingest/config.json
cp ./config/config.json ./services/td/td_api/config.json
cp ./config/config.json ./services/stomp-bridge/config.json

echo "Copied configuration into place ready for container builds"
