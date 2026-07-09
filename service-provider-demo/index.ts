import * as pulumi from "@pulumi/pulumi";
import * as service from "@pulumi/pulumiservice";

const config = new pulumi.Config();
const orgName = pulumi.getOrganization();
// Configure the members of this organization to be added to the new team
const memberUsernames = config.requireObject<string[]>("memberUsernames");

// Configure the name of the team to be created.
const teamName = config.require("teamName");

// Configure the names of the demo project and stack to be created, which the new team will be granted edit access to.
const demoProjectName = config.get("demoProjectName") || "service-provider-demo-app";
const demoStackName = config.get("demoStackName") || `service-provider-demo-stack`;

// Get the reference to the esc-aws-oidc project's stack,
// so this stack can grant the new team access to the ESC environment that stack created.
const escStackRef = config.get("escStackReference") || `${orgName}/esc-aws-oidc/dev`;
const escStack = new pulumi.StackReference("esc-aws-oidc-stack", { name: escStackRef });

// Pulumi Cloud auto-adds the creator to the team, so we need to get the current user's username to include it in the team members list.
const currentUser = service.getCurrentUserOutput();

// 1. Create a new team.
const team = new service.Team("demo-team", {
  organizationName: orgName,
  name: teamName,
  displayName: "Service Provider Demo Team",
  description: "Pulumi Service Provider Demo: team creation, member association, stack permissions, and ESC environment permissions.",
  teamType: "pulumi",
  // 2. Associate specified org members with the team alongside creator of team.
  members: currentUser.apply(u => [u.username, ...memberUsernames]),
});

// 3. Create a new stack.
const demoStack = new service.Stack("demo-stack", {
  organizationName: orgName,
  projectName: demoProjectName,
  stackName: demoStackName,
});

// 3b. Tag the demo stack with "demo-team" so that the tag-based role below can match it.
const demoStackTag = new service.StackTag("demo-stack-tag", {
  organization: orgName,
  project: demoProjectName,
  stack: demoStackName,
  name: "demo-team",
  value: "true",
}, { dependsOn: [demoStack] });

// 3c. Create a custom role that grants stack:read to any stack carrying the "demo-team" tag.
//     The permission descriptor uses a PermissionDescriptorCondition wrapping a
//     PermissionExpressionHasTag condition — access is granted dynamically to every stack
//     that has the tag, rather than being pinned to a single stack ID.
const demoTeamRole = new service.OrganizationRole("demo-team-role", {
  organizationName: orgName,
  name: "demo-team-stack-access",
  description: "Grants stack:read to any stack tagged with 'demo-team'.",
  permissions: {
    "__type": "PermissionDescriptorCondition",
    "condition": {
      "__type": "PermissionExpressionHasTag",
      "context": { "__type": "PermissionExpressionStack" },
      "key": "demo-team",
    },
    "subNode": {
      "__type": "PermissionDescriptorAllow",
      "permissions": ["stack:read"],
    },
  },
});

// 3d. Assign the tag-based role to the team.
//     All team members will automatically gain stack:read on any stack tagged "demo-team".
const teamRoleAssignment = new service.TeamRoleAssignment("demo-team-role-assignment", {
  organizationName: orgName,
  teamName: teamName,
  roleId: demoTeamRole.roleId,
}, { dependsOn: [team, demoTeamRole] });

// 4. Grant the team permission to open the ESC environment created by the esc-aws-oidc project's stack.
const escEnvironmentPermission = new service.TeamEnvironmentPermission("demo-esc-environment-permission", {
  organization: orgName,
  project: escStack.getOutput("escEnvironmentProject"),
  environment: escStack.getOutput("escEnvironmentName"),
  team: teamName,
  permission: service.EnvironmentPermission.Open,
}, { dependsOn: team });

export const createdTeamName = teamName;
export const stackUrl = pulumi.interpolate`${orgName}/${demoProjectName}/${demoStackName}`;
