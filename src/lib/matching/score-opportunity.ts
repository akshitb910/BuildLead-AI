
export type MatchingProject = {
  name: string;
  description: string | null;
  location: string | null;
  projectType: string | null;
};

export type MatchingProduct = {
  name: string;
  category: string | null;
  applications: string[];
};

export type MatchingRules = {
  locations: string[];
  projectTypes: string[];
  keywords: string[];
};

export type MatchResult = {
  score: number | null;
  matchedPoints: number;
  availablePoints: number;
  reasons: string[];
  unknowns: string[];
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsTerm(
  text: string,
  term: string
): boolean {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedTerm = normalize(term);

  return (
    normalizedTerm.length > 0 &&
    normalizedText.includes(` ${normalizedTerm} `)
  );
}

export function scoreOpportunity(
  project: MatchingProject,
  products: MatchingProduct[],
  rules: MatchingRules
): MatchResult {
  let matchedPoints = 0;
  let availablePoints = 0;

  const reasons: string[] = [];
  const unknowns: string[] = [];

  // Location: 30 points
  if (rules.locations.length === 0) {
    unknowns.push("No target locations configured.");
  } else if (!project.location) {
    unknowns.push("Project location is unknown.");
  } else {
    availablePoints += 30;

    const matchedLocation = rules.locations.find(
      (location) =>
        containsTerm(project.location!, location)
    );

    if (matchedLocation) {
      matchedPoints += 30;
      reasons.push(
        `Location matches target: ${matchedLocation}`
      );
    }
  }

  // Project type: 25 points
  if (rules.projectTypes.length === 0) {
    unknowns.push("No target project types configured.");
  } else if (!project.projectType) {
    unknowns.push("Project type is unknown.");
  } else {
    availablePoints += 25;

    const matchedType = rules.projectTypes.find(
      (type) =>
        containsTerm(project.projectType!, type)
    );

    if (matchedType) {
      matchedPoints += 25;
      reasons.push(
        `Project type matches target: ${matchedType}`
      );
    }
  }

  const projectText = [
    project.name,
    project.description ?? "",
  ].join(" ");

  // Product relevance: 25 points
  if (products.length === 0) {
    unknowns.push("No products configured.");
  } else if (!project.description) {
    unknowns.push(
      "Project description is missing; product relevance cannot be assessed."
    );
  } else {
    availablePoints += 25;

    const productTerms = products.flatMap(
      (product) => [
        product.name,
        product.category ?? "",
        ...product.applications,
      ]
    );

    const matchedTerm = productTerms.find(
      (term) => containsTerm(projectText, term)
    );

    if (matchedTerm) {
      matchedPoints += 25;
      reasons.push(
        `Project mentions a product-related term: ${matchedTerm}`
      );
    }
  }

  // Keywords: 20 points
  if (rules.keywords.length === 0) {
    unknowns.push("No opportunity keywords configured.");
  } else {
    availablePoints += 20;

    const matchedKeyword = rules.keywords.find(
      (keyword) =>
        containsTerm(projectText, keyword)
    );

    if (matchedKeyword) {
      matchedPoints += 20;
      reasons.push(
        `Project mentions target keyword: ${matchedKeyword}`
      );
    }
  }

  // Score only the dimensions we can evaluate.
  const score =
    availablePoints === 0
      ? null
      : Math.round(
          (matchedPoints / availablePoints) * 100
        );

  return {
    score,
    matchedPoints,
    availablePoints,
    reasons,
    unknowns,
  };
}