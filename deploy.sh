#!/usr/bin/env bash
# Deploys both demo stacks in dependency order. service-provider-demo reads
# the ESC environment's project/name via a StackReference to esc-aws-oidc,
# so esc-aws-oidc must be up first or that lookup fails.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> esc-aws-oidc"
(cd esc-aws-oidc && pulumi up --yes)

echo "==> service-provider-demo"
(cd service-provider-demo && pulumi up --yes)
