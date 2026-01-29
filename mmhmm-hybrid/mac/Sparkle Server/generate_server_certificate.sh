#!/bin/bash

echo "Generating server.pem for localhost ..."
echo

openssl req -x509 -nodes -sha256 -newkey rsa:2048 \
    -keyout server.pem -out server.pem -days 365 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Splitting off server.crt ..."
echo

openssl x509 -in server.pem -out server.crt

echo

continue=""
read -p "Add generated server.crt to system keychain? Enter yes to confirm: " -r continue
echo # move to new line after input
if [ "$continue" != "yes" ]; then
    exit 0
fi

sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain server.crt
security find-certificate -c "localhost" /Library/Keychains/System.keychain

echo
echo "Done."
echo