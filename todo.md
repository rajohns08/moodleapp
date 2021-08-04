
# Timeline Start: Sun, Aug 1st
## Week 1: Online TOTP Changes
- Generate and store encryption keys on app start if they don't exist
- Add messaging to send shared secret to moodle
- Add util to get encryption keys
- Add DB Table TOTP shared secret
- Encrypt and store TOTP shared secret in sqlite DB

## Week 2: Offline TOTP Changes
- Add TOTP screen to moodleapp
  + 1 form field with 6 digit otp value
- Update navigation to and from TOTP screen
- On TOTP form submit
    + Get TOTP shared secret and decrypt it
    + Pass shared secret and time into totp validator and compare input value to validator value
    + On success, load offline data
    + On failure, handle form failure UI changes

## Week 3: Documentation Testing
- Document Moodle server changes and configuration
- Document Redhat SSO changes and configuration
- Document Moodle app build and changes
- Document end user flows
- E2E validation