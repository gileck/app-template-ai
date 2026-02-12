/**
 * ESLint Project Configuration
 *
 * Add project-specific ESLint rules here.
 * This file is NOT synced from the template - it's owned by your project.
 *
 * Example:
 *   export default [
 *     {
 *       files: ["src/my-feature/**"],
 *       rules: {
 *         "my-rule": "error"
 *       }
 *     }
 *   ];
 */

const eslintProjectConfig = [
  {
    files: ["src/server/template/rpc/client.ts"],
    rules: {
      "api-guidelines/client-returns-cache-result": "off"
    }
  }
];

export default eslintProjectConfig;
