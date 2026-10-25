// Certificate renewal is provider-specific. This entry point deliberately delegates to a configured secret manager.
const required = ["CERT_RENEWAL_PROVIDER", "CERT_RENEWAL_CREDENTIAL_REF"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Certificate renewal not run; missing configuration: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("Renewal provider configured. Run provider-specific renewal and validation before replacing certificates.");
}
