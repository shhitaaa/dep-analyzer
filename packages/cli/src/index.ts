#!/usr/bin/env node

import { Command } from "commander";
import {
  buildDependencyGraph,
  findStronglyConnectedComponents,
  findDeadCode,
} from "@dep-analyzer/core";
import * as path from "path";

const program = new Command();

program
  .name("dep-analyzer")
  .description("Analyze dependency graphs in JS/TS repositories")
  .version("1.0.0");

program
  .command("analyze <targetPath>")
  .description("Build the dependency graph and print a summary")
  .action((targetPath: string) => {
    const rootDir = path.resolve(targetPath);
    const graph = buildDependencyGraph(rootDir);

    const sccs = findStronglyConnectedComponents(graph);
    const cycles = sccs.filter(scc => scc.length > 1);
    const deadCode = findDeadCode(graph);

    console.log(`Analyzed: ${rootDir}`);
    console.log(`Files: ${graph.nodes.size}`);
    console.log(`Imports: ${graph.edges.length}`);
    console.log(`Circular dependency groups: ${cycles.length}`);
    for (const cycle of cycles) {
      console.log("  -", cycle.map(id => path.relative(rootDir, id)).join(" <-> "));
    }
    console.log(`Dead code files: ${deadCode.length}`);
    for (const id of deadCode) {
      console.log("  -", path.relative(rootDir, id));
    }
  });

program.parse();