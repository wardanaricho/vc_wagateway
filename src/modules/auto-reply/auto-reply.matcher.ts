import type { MatchType } from "./auto-reply.types.js";

export function isMatch(
  incomingText: string,
  keyword: string,
  matchType: MatchType,
): boolean {
  const text = incomingText.toLowerCase().trim();
  const kw = keyword.toLowerCase().trim();

  switch (matchType) {
    case "exact":
      return text === kw;

    case "contains":
      return text.includes(kw);

    case "startsWith":
      return text.startsWith(kw);

    case "endsWith":
      return text.endsWith(kw);

    case "regex": {
      try {
        const regex = new RegExp(keyword, "i");
        return regex.test(incomingText);
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}

interface MatchableRule {
  keyword: string;
  matchType: string;
}

export function findMatchingRule<T extends MatchableRule>(
  incomingText: string,
  rules: T[],
): T | null {
  for (const rule of rules) {
    if (isMatch(incomingText, rule.keyword, rule.matchType as MatchType)) {
      return rule;
    }
  }
  return null;
}
