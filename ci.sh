#!/bin/bash

while inotifywait -e close_write server.js
do
    scp server.js niels:src/node/runfaas/
    ssh niels 'systemctl --user stop runfaas.service'
    ssh niels 'systemctl --user start runfaas.service'
done &

while inotifywait -e close_write public/index.js
do
    scp public/index.js niels:src/node/runfaas/public/
    ssh niels "sed -i 's/ws:\/\/localhost:3030/wss:\/\/faas.fhirstation.net/' src/node/runfaas/public/index.js"
done
