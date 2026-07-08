#!/usr/bin/env bash
# Tears down both demo stacks in reverse dependency order. service-provider-demo
# holds a StackReference into esc-aws-oidc, so it comes down first - destroying
# esc-aws-oidc first would leave that reference pointing at a gone environment.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> service-provider-demo"
(cd service-provider-demo && pulumi destroy --yes)

echo "==> esc-aws-oidc"
(cd esc-aws-oidc && pulumi destroy --yes)
