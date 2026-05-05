const fs = require("fs");
const yaml = require("js-yaml");

const openapiFile = "openapi.yaml";
const envFile = "utho-environment.json";

const doc = yaml.load(fs.readFileSync(openapiFile, "utf8"));
const env = JSON.parse(fs.readFileSync(envFile, "utf8"));

/**
 * Helper to get Postman env variable
 */
const getVar = (key) => {
  const v = env.values.find((x) => x.key === key);
  return v ? v.value : null;
};

const baseUrl = getVar("base_url");

/**
 * 1. Inject servers
 */
doc.servers = [
  {
    url: baseUrl,
    description: env.name || "Environment",
  },
];

/**
 * 2. Remove Authorization headers
 */
for (const path in doc.paths) {
  for (const method in doc.paths[path]) {
    const endpoint = doc.paths[path][method];

    if (endpoint.parameters) {
      endpoint.parameters = endpoint.parameters.filter(
        (p) => !(p.name === "Authorization" && p.in === "header")
      );

      if (endpoint.parameters.length === 0) {
        delete endpoint.parameters;
      }
    }
  }
}

/**
 * 3. Add global auth
 */
doc.components = doc.components || {};
doc.components.securitySchemes = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
  },
};

doc.security = [{ bearerAuth: [] }];

/**
 * 4. Clean paths (remove base_url if present)
 */
const newPaths = {};
for (const path in doc.paths) {
  const cleanPath = path.replace(baseUrl, "");
  newPaths[cleanPath] = doc.paths[path];
}
doc.paths = newPaths;

/**
 * Save file
 */
fs.writeFileSync(openapiFile, yaml.dump(doc, { noRefs: true }));

console.log("✅ OpenAPI normalized successfully");