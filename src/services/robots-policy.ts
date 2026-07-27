interface RobotsRule {
  allow: boolean;
  path: string;
}

interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

function patternExpression(pattern: string): RegExp {
  const endAnchored = pattern.endsWith("$");
  const body = (endAnchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${endAnchored ? "$" : ""}`);
}

function parseGroups(content: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | undefined;
  let hasRules = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!current || hasRules) {
        current = { agents: [], rules: [] };
        groups.push(current);
        hasRules = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (
      current &&
      (field === "allow" || field === "disallow") &&
      value
    ) {
      current.rules.push({ allow: field === "allow", path: value });
      hasRules = true;
    }
  }

  return groups;
}

export function isPathAllowedByRobots(
  content: string,
  path: string,
  userAgent = "MatchDay-ZGZ",
): boolean {
  const normalizedAgent = userAgent.toLowerCase();
  const groups = parseGroups(content);
  const specific = groups.filter((group) =>
    group.agents.some(
      (agent) => agent !== "*" && normalizedAgent.includes(agent),
    ),
  );
  const applicable =
    specific.length > 0
      ? specific
      : groups.filter((group) => group.agents.includes("*"));
  const rules = applicable.flatMap((group) => group.rules);
  const matching = rules
    .filter((rule) => patternExpression(rule.path).test(path))
    .sort((first, second) => {
      const lengthDifference = second.path.length - first.path.length;
      return lengthDifference || Number(second.allow) - Number(first.allow);
    });
  return matching[0]?.allow ?? true;
}

