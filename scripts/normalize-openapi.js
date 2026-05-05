const fs = require("fs");
const yaml = require("js-yaml");

/**
 * Load files
 */
const openapiFile = "openapi.yaml";
const envFile = "utho-environment.json";

const doc = yaml.load(fs.readFileSync(openapiFile, "utf8"));
const env = JSON.parse(fs.readFileSync(envFile, "utf8"));

/**
 * Extract environment variables
 */
const getVar = (key) => {
  const v = env.values.find((x) => x.key === key);
  return v ? v.value : null;
};

const baseUrl = getVar("base_url");

/**
 * 1. Inject SERVERS (from Postman env)
 */
doc.servers = [
  {
    url: baseUrl,
    description: env.name || "Environment",
  },
];

/**
 * 2. REMOVE Authorization headers
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
 * 3. ADD GLOBAL AUTH
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
 * 4. Cleanup URLs (replace {{base_url}})
 */
for (const path in doc.paths) {
  const newPath = path.replace(baseUrl, "");
  if (newPath !== path) {
    doc.paths[newPath] = doc.paths[path];
    delete doc.paths[path];
  }
}

/**
 * Save
 */
fs.writeFileSync(openapiFile, yaml.dump(doc, { noRefs: true }));

console.log("✅ OpenAPI fully normalized using Postman environment");