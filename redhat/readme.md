# Redhat Docker Keys
https://www.itix.fr/blog/running-redhat-sso-outside-openshift/
If you need new keys for the docker rhsso container, use the below commands. Commited keys will expire in 365 days

```
mkdir keystore
openssl req -new -newkey rsa:2048 -x509 -keyout keystore/xpaas.key -out keystore/xpaas.crt -days 365 -subj "/CN=localhost" -nodes
keytool -genkeypair -keyalg RSA -keysize 2048 -dname "CN=localhost" -alias jboss -keystore keystore/keystore.jks -storepass secret -keypass secret
keytool -certreq -keyalg rsa -alias jboss -keystore keystore/keystore.jks -file keystore/sso.csr -storepass secret
openssl x509 -req -CA keystore/xpaas.crt -CAkey keystore/xpaas.key -in keystore/sso.csr -out keystore/sso.crt -days 365 -CAcreateserial
keytool -import -file keystore/xpaas.crt -alias xpaas.ca -keystore keystore/keystore.jks -storepass secret -trustcacerts -noprompt
keytool -import -file keystore/sso.crt -alias jboss -keystore keystore/keystore.jks -storepass secret

mkdir jgroups
keytool -genseckey -alias secret-key -storetype JCEKS -keystore jgroups/jgroups.jceks -storepass secret -keypass secret

mkdir truststore
keytool -import -file keystore/xpaas.crt -alias xpaas.ca -keystore truststore/truststore.jks -storepass secret -trustcacerts -noprompt
```

# Redhat Docker
- To start redhat sso locally, run the following command
- Note that you can not stop and start the container, it's explicitly not supported by redhat thought fixed in keycloak
- http://localhost:8080/auth/admin
- admin/password
```
docker run --name redhat-sso -m 1Gi \
    -p 8778:8778 -p 8080:8080 -p 8443:8443\
    -e SSO_HOSTNAME=localhost \
    -e SSO_ADMIN_USERNAME=admin \
    -e SSO_ADMIN_PASSWORD=password \
    -e SSO_REALM=test \
    -e HTTPS_KEYSTORE_DIR=/etc/keystore \
    -e HTTPS_KEYSTORE=keystore.jks \
    -e HTTPS_KEYSTORE_TYPE=jks \
    -e HTTPS_NAME=jboss \
    -e HTTPS_PASSWORD=secret \
    -e JGROUPS_ENCRYPT_KEYSTORE_DIR=/etc/jgroups \
    -e JGROUPS_ENCRYPT_KEYSTORE=jgroups.jceks \
    -e JGROUPS_ENCRYPT_NAME=secret-key \
    -e JGROUPS_ENCRYPT_PASSWORD=secret \
    -e JGROUPS_CLUSTER_PASSWORD=random \
    -e SSO_TRUSTSTORE=truststore.jks \
    -e SSO_TRUSTSTORE_DIR=/etc/truststore \
    -e SSO_TRUSTSTORE_PASSWORD=secret \
    -v $PWD/keystore:/etc/keystore \
    -v $PWD/jgroups:/etc/jgroups \
    -v $PWD/truststore:/etc/truststore \
    registry.redhat.io/redhat-sso-7/sso73-openshift:1.0
```

# Redhat Docker Config
- After starting the container, import `rh-sso-config.json`. It will create your saml client
- The redhat configs assume you are using the commited localhost.crt and localhost.pem
- You will still need to create a user.


# SAML Signature Issues
- There is a known issue with using the already created moodle saml plugin keys and you will need to generate new ones
+ create your own with "openssl req -newkey rsa:3072 -new -x509 -days 3652 -nodes -out localhost.crt -keyout localhost.pem"
+ use your new crt and pem files to replace the files under /Applications/MAMP/data/moodle311/saml2
+ open up the localhost.xml in /Applications/MAMP/data/moodle311/saml2 and replace the encryption and signing keys with your .crt key value (but + remove all whitespaces)
+ use the new localhost.xml to import sp metadata into redhat
+ You can also import keys to update them
+ After updating the moodle saml data and rh sso configs, you need to recopy the idp metadata back to moodle. (I'm thinking the refresh task in moodle should be able to pick this up)

