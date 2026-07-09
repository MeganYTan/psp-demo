ARN='arn:aws:iam::052848974346:oidc-provider/api.pulumi.com/oidc'

pulumi do aws:iam/openIdConnectProvider:OpenIdConnectProvider read \
  "$ARN" > oidc-provider.json

{
  echo 'url = "https://api.pulumi.com/oidc"'
  echo 'clientIdLists = ['
  jq -r \
    '([.clientIdLists[] | select(. != "aws:mtan-psp-demo")] + ["aws:mtan-psp-demo-2"])[] | "  \(tojson),"' \
    oidc-provider.json
  echo ']'
} > oidc-update.pcl

pulumi do aws:iam/openIdConnectProvider:OpenIdConnectProvider patch \
  "$ARN" \
  --input-file oidc-update.pcl \
  --stateless

# aws iam add-client-id-to-open-id-connect-provider  --open-id-connect-provider-arn "$ARN" --client-id 'aws:mtan-psp-demo'