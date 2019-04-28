#!/bin/bash

cp ./config/config.json ./services/signals/signal_ingest/config.json
cp ./config/config.json ./services/signals/signal_api/config.json
cp ./config/config.json ./services/stomp-bridge/config.json
cp ./config/config.json ./services/berths/berth_ingest/config.json
cp ./config/config.json ./services/berths/berth_api/config.json

echo "Copied configuration into place ready for container builds"
