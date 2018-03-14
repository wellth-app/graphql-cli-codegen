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

export const command = "codegen [--target] [--output]";
export const desc =
  "Generates apollo-codegen code/annotations from your .graphqlconfig";
export const builder = {};

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

const mergeSchemas = async (schemaPaths: string[]): Promise<GraphQLSchema> => {
  return await buildASTSchema(
    parse(
      mergeTypes(
        schemaPaths.map(value => fs.readFileSync(value, "utf8").toString())
      )
    )
  );
};

const writeSchema = async (
  schema: GraphQLSchema,
  outputPath: string
): Promise<void> => {
  const results = await graphql(schema, introspectionQuery);
  await promisify(fs.writeFile)(outputPath, JSON.stringify(results));
};

export const handler = async (context, argv) => {
  const { project } = argv;
  const { getProjectConfig } = context;
  const { config, configPath } = await getProjectConfig(project);
  const {
    extensions: { codegen: options = {} } = {},
    includes = [],
    excludes = [],
    schemaPath,
  } = config;
  const {
    target = "swift",
    tagName = "gql",
    output = "codegen",
    mergedSchemaOutputPath = TEMPORARY_SCHEMA_PATH,
    schemas = [],
  } = options;

  const outputPath = path.resolve(mergedSchemaOutputPath);
  const inputFiles = difference(
    await loadGlob(includes),
    await loadGlob(excludes)
  ).map(file => path.resolve(file));

  const schema = await mergeSchemas(await loadGlob(schemas));

  try {
    await writeSchema(schema, outputPath);
    generate(inputFiles, outputPath, output, "", target, tagName, project, {
      addTypename: true,
    });
  } catch (error) {
    console.log("error:", error);
  }
};
