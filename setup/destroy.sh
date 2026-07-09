#!/usr/bin/env bash
# Tears down both demo stacks in reverse dependency order
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

PULUMI_ORG="mtan-psp-demo"
STACK="dev"

(cd ../service-provider-demo &&
  pulumi stack select "$PULUMI_ORG/service-provider-demo/$STACK" &&
  pulumi down --yes)

(cd ../esc-aws-oidc &&
  pulumi stack select "$PULUMI_ORG/esc-aws-oidc/$STACK" &&
  pulumi down --yes)