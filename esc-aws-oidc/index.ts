import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as service from "@pulumi/pulumiservice";

const config = new pulumi.Config();
const orgName = pulumi.getOrganization();
// OIDC settings
const issuerHost = "api.pulumi.com/oidc";
const audience = orgName;
const awsRegion = config.get("awsRegion") || "us-west-2";

// This is an existing OIDC provider because the AWS account is shared across many Pulumi orgs.
// This stack only ever reads it.
const existingOidcProvider = aws.iam.getOpenIdConnectProviderOutput({
  url: `https://${issuerHost}`,
});

// Role that ESC's fn::open::aws-login will assume.
const role = new aws.iam.Role("pulumi-onboarding-role", {
  maxSessionDuration: 43200,
  assumeRolePolicy: existingOidcProvider.arn.apply(arn => JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: { Federated: arn },
      Action: "sts:AssumeRoleWithWebIdentity",
      Condition: {
        StringEquals: { [`${issuerHost}:aud`]: audience },
        StringLike: { [`${issuerHost}:sub`]: `pulumi:environments:org:${orgName}:env:*` },
      },
    }],
  })),
});

// The ARN of the policy attached to `role`.
const rolePolicyArn = config.get("rolePolicyArn") || "arn:aws:iam::aws:policy/AmazonS3FullAccess";

// Attach the rolePolicyArn to the role, granting the role the permissions defined in the policy.
const rolePolicyAttachment = new aws.iam.RolePolicyAttachment("pulumi-onboarding-role-s3-access", {
  role: role.name,
  policyArn: rolePolicyArn,
});

// Create the ESC environment with AWS OIDC configured.
const environment = new service.Environment("aws-oidc-onboarding", {
  organization: orgName,
  project: "default",
  yaml: role.arn.apply(arn => new pulumi.asset.StringAsset(`values:
  aws:
    login:
      fn::open::aws-login:
        oidc:
          roleArn: ${arn}
          sessionName: pulumi-onboarding-session
  environmentVariables:
    AWS_ACCESS_KEY_ID: \${aws.login.accessKeyId}
    AWS_SECRET_ACCESS_KEY: \${aws.login.secretAccessKey}
    AWS_SESSION_TOKEN: \${aws.login.sessionToken}
    AWS_REGION: ${awsRegion}
`)),
});

// Consumed by service-provider-demo via StackReference to grant its team
// TeamEnvironmentPermission on this environment.
export const escEnvironmentProject = environment.project;
export const escEnvironmentName = environment.name;
