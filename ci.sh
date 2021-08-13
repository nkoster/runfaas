#!/bin/bash

while inotifywait -e close_write server.js
do
    scp server.js niels:src/node/runfaas/
    ssh niels 'systemctl --user stop runfaas.service'
    ssh niels 'systemctl --user start runfaas.service'
done
