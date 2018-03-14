import { buildASTSchema, parse, GraphQLSchema, graphql } from "graphql";
import { generate } from "apollo-codegen";
import * as path from "path";
import * as fs from "fs";
import * as glob from "glob";
import { introspectionQuery } from "graphql/utilities";
import { mergeTypes } from "merge-graphql-schemas";
import { promisify } from "util";
import { difference } from "lodash";

const TEMPORARY_SCHEMA_PATH = "/tmp/schema.json";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export const command = "codegen [--target] [--output]";
export const desc =
  "Generates apollo-codegen code/annotations from your .graphqlconfig";
export const builder = {
  output: {
    alias: "o",
    describe: "Output file",
    type: "string",
  },
  schema: {
    alias: "s",
    describe: "Schema to generate `includes` minus `excludes` against.",
    type: "string",
  },
};

const loadGlob = async (paths: string[] = []): Promise<string[]> => {
  const normalizedPaths = await Promise.all(
    paths.map(
      (_path): Promise<string[]> =>
        new Promise((resolve, reject) => {
          glob(_path, (error, paths) => {
            if (error) {
              return reject(error);
            }
            resolve(paths || []);
          });
        })
    )
  );

  return normalizedPaths.reduce((returnValue, nextValue) => {
    return [...returnValue, ...nextValue];
  }, []);
};

export const handler = async (context, argv) => {
  const { project, schema: argSchema } = argv;
  const { getProjectConfig } = context;
  const { config, configPath } = await getProjectConfig(project);
  const {
    includes = [],
    excludes = [],
    schemaPath: projectSchema,
    extensions: {
      codegen: {
        target = "swift",
        tagName = "gql",
        output = "codegen",
        schemaPath: providedSchema = undefined,
      } = {},
    } = {},
  } = config;

  const schemaPath = argSchema ? argSchema : providedSchema || projectSchema;

  const inputFiles = difference(
    await loadGlob(includes),
    await loadGlob(excludes)
  ).map(file => path.resolve(file));

  let resolvedSchemaPath = path.resolve(schemaPath);
  if (schemaPath.endsWith(".graphql")) {
    const schemaString = await readFile(resolvedSchemaPath, "utf8");
    const schema = await buildASTSchema(parse(schemaString));
    const results = await graphql(schema, introspectionQuery);

    resolvedSchemaPath = TEMPORARY_SCHEMA_PATH;
    await writeFile(resolvedSchemaPath, JSON.stringify(results));
  }

  generate(
    inputFiles,
    resolvedSchemaPath,
    output,
    "",
    target,
    tagName,
    project,
    {
      addTypename: true,
    }
  );
};
