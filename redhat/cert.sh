#!/bin/bash
openssl req -newkey rsa:3072 -new -x509 -days 365 -nodes -out localhost.crt -keyout localhost.pem -subj /emailAddress=rezultTest@mailinator.com/O=RezultGroup/OU=Development/CN=RezultGroup/C=US/ST=Texas/L=Austin
cp localhost.pem /Applications/MAMP/data/moodle311/saml2/localhost.pem
cp localhost.crt /Applications/MAMP/data/moodle311/saml2/localhost.crt
code /Applications/MAMP/data/moodle311/saml2/localhost.crt
code ./localhost.xml