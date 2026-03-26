import { promises as fs } from "node:fs";
import path from "node:path";
import { reviewFiles } from "./spw-syntax-review";

type Options = {
  lenses: string[];
  masks: string[];
  bone: boolean;
  failFast: boolean;
  help: boolean;
  target: string;
};

const args = process.argv.slice(2);
const options = parseArgs(args);

if (options.help) {
  printHelp();
  process.exit(0);
}

void main(options);

async function main(opts: Options) {
  const spwFiles = await collectFiles(opts.target, (file) => file.endsWith(".spw"));
  const filteredSpw = spwFiles.filter((file) => shouldInclude(file, opts));
  const indexFiles = filteredSpw.filter((file) => file.endsWith(`${path.sep}index.spw`) || file === "index.spw");
  const review = await reviewFiles(filteredSpw, "working");

  const entries: string[] = [];
  for (const result of review) {
    const forms = result.patterns.map((pattern) => `\`${pattern.id}\``).join(", ");
    entries.push(`    .{ profile = \`${result.profile.label}\`, path = \`${result.normalizedPath}\`, forms = #[${forms}] },`);
  }

  if (opts.bone) return;

  const output: string[] = [];
  output.push("^seed[SpwSyntaxAudit v:1.1 @profile:Spw.b @intent:context_loader]");
  output.push("");
  output.push("spw_file_landscape = .{");
  output.push("");
  output.push("  stratum_map: #[");
  output.push(...entries);
  output.push("  ][reg=set]");
  output.push("");
  output.push("  entry_points: #[");
  for (const file of indexFiles.sort()) {
    output.push(`    \`${normalizePath(file)}\`,`);
  }
  output.push("  ][reg=set]");
  output.push("");
  output.push("  review_policy: .{");
  output.push("    discouraged_when_introduced = #[");
  output.push("      `@domain: outside historical profiles`,");
  output.push("      `^\"...\" frames on strict machine surfaces`,");
  output.push("      `~#... traits on strict machine surfaces`,");
  output.push("      `~name: traits on strict machine surfaces`,");
  output.push("    ][reg=set]");
  output.push("    waived_profiles = #[");
  output.push("      `historical`,");
  output.push("      `agent_surface`,");
  output.push("      `runtime_state`,");
  output.push("      `canon_surface`,");
  output.push("      `narrative_surface`,");
  output.push("    ][reg=set]");
  output.push("  }[reg=facet]");
  output.push("}[reg=facet]");
  output.push("");
  output.push("?affordances = #[");
  output.push("  .{ run = `npm run lint:spw`, intent = `parse-validate all .spw files` },");
  output.push(
    "  .{ run = `bash .agents/skills/spw-commit-review/scripts/layer-check.sh`, intent = `verify import boundaries` },"
  );
  output.push("  .{ run = `npm run lint:docs`, intent = `verify .spw path refs` },");
  output.push("][reg=set]");

  process.stdout.write(output.join("\n") + "\n");
}

function parseArgs(argv: string[]): Options {
  const lenses: string[] = [];
  const masks: string[] = [];
  let bone = false;
  let failFast = false;
  let help = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--lens" || arg === "--match" || arg === "-m") {
      const value = argv[i + 1];
      if (!value) throw new Error(`Missing value for ${arg}`);
      lenses.push(value);
      i += 1;
      continue;
    }
    if (arg.startsWith("--lens=") || arg.startsWith("--match=")) {
      lenses.push(arg.split("=").slice(1).join("="));
      continue;
    }
    if (arg === "--mask" || arg === "--exclude" || arg === "-e") {
      const value = argv[i + 1];
      if (!value) throw new Error(`Missing value for ${arg}`);
      masks.push(value);
      i += 1;
      continue;
    }
    if (arg.startsWith("--mask=") || arg.startsWith("--exclude=")) {
      masks.push(arg.split("=").slice(1).join("="));
      continue;
    }
    if (arg === "--bone" || arg === "--quiet" || arg === "-q") {
      bone = true;
      continue;
    }
    if (arg === "--fail-fast") {
      failFast = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option ${arg}`);
    }
    positional.push(arg);
  }

  return {
    lenses,
    masks,
    bone,
    failFast,
    help,
    target: positional[0] ?? ".",
  };
}

function printHelp() {
  const lines = [
    "",
    "^seed[SpwSyntaxAudit @intent:help]",
    "",
    "Usage:",
    "  node --import tsx .agents/skills/spw-commit-review/scripts/spw-syntax-audit.ts [options] [target]",
    "",
    "Spw Options (valence-aligned):",
    "  --lens, -m <p>     Focus on paths matching substring (can repeat)",
    "  --mask, -e <p>     Mask out paths matching substring (can repeat)",
    "  --bone, -q         Suppress output (the denial valence)",
    "  --fail-fast        Stop on first error",
    "  -h, --help         Show this help",
    "",
    "Legacy Aliases:",
    "  --match  →  --lens",
    "  --exclude → --mask",
    "  --quiet   → --bone",
    "",
  ];
  process.stdout.write(lines.join("\n"));
}

function shouldInclude(filePath: string, opts: Options): boolean {
  const normalized = normalizePath(filePath);
  if (normalized.includes("/node_modules/")) return false;
  if (normalized.includes("/__tests__/snapshots/")) return false;

  for (const mask of opts.masks) {
    if (normalized.includes(mask)) return false;
  }

  if (opts.lenses.length > 0) {
    return opts.lenses.some((lens) => normalized.includes(lens));
  }

  return true;
}

async function collectFiles(
  target: string,
  predicate: (filePath: string) => boolean
): Promise<string[]> {
  const entries: string[] = [];
  const resolved = path.resolve(target);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat) return entries;
  if (stat.isFile()) {
    if (predicate(resolved)) entries.push(resolved);
    return entries;
  }

  await walk(resolved, predicate, entries);
  return entries;
}

async function walk(
  dir: string,
  predicate: (filePath: string) => boolean,
  entries: string[]
) {
  const children = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const child of children) {
    const childPath = path.join(dir, child.name);
    if (child.isDirectory()) {
      const normalized = normalizePath(childPath);
      if (normalized.includes("/node_modules/") || normalized.includes("/.git/")) {
        continue;
      }
      await walk(childPath, predicate, entries);
    } else if (child.isFile()) {
      if (predicate(childPath)) {
        entries.push(childPath);
      }
    }
  }
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
