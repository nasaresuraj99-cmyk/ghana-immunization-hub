# Facility District Certificates and Firebase Deployment

## Changes
- Make district mandatory whenever a new facility is created, including the fallback onboarding flow.
- Resolve facility name, district, and region at certificate-generation time so PDFs and previews never use stale FIAN defaults.
- Include the creating facility's district in certificate QR verification data and visible certificate/card headers.
- Keep existing FIAN URBAN CHPS data as the backward-compatible default.
- Replace the fragile Firebase service-account environment handoff with a validated temporary credentials file and current GitHub actions.

## Verification
- Run targeted TypeScript/build checks.
- Verify facility signup validation and certificate source paths.
- Confirm the deployment workflow uses the correct project and cleans up temporary credentials.
