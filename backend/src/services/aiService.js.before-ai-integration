const KEYWORD_CATEGORY_MAP = {
  water: ["water", "leak", "pipe", "flood", "drain", "tap", "faucet", "plumbing", "shortage"],
  electricity: ["electricity", "power", "outage", "light", "socket", "wiring", "bulb", "generator"],
  "toilet & sanitation": ["toilet", "sanitation", "drainage", "hygiene", "sewage", "restroom", "latrine"],
  classroom: ["classroom", "blackboard", "desk", "chair", "projector", "whiteboard", "lecture"],
  dormitory: ["dormitory", "hostel", "bed", "mattress", "room", "accommodation"],
  "it & internet": ["internet", "wifi", "wi-fi", "computer", "network", "printer", "wifi", "ethernet"],
  security: ["security", "safety", "theft", "fence", "gate", "lighting", "guard", "assault"],
  furniture: ["desk", "chair", "table", "bed", "cabinet", "shelf", "furniture"],
  infrastructure: ["building", "road", "wall", "roof", "ceiling", "floor", "window", "door"],
  cafeteria: ["cafeteria", "dining", "food", "kitchen", "canteen", "restaurant"],
  library: ["library", "book", "shelf", "reading", "study"],
  laboratory: ["lab", "laboratory", "equipment", "experiment", "microscope"],
  other: [],
};

const URGENCY_KEYWORDS = [
  "emergency", "urgent", "dangerous", "broken", "leaking", "overflow", "fire",
  "no power", "not working", "blocked", "collapsed", "flood", "risk", "injury",
  "accident", "burst", "spill", "gas", "smell",
];

/**
 * Suggest a complaint category based on title and description.
 * Uses keyword matching by default; optional AI provider can be plugged in.
 * Does NOT send sensitive student information (name, email, ID).
 *
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @returns {object} { suggestedCategoryId: number|null, confidence: number, reason: string }
 */
function suggestCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [categoryName, keywords] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = categoryName;
    }
  }

  const confidence = bestScore > 0 ? Math.min(bestScore / 5, 1) : 0;

  return {
    suggestedCategory: bestMatch,
    confidence: Number(confidence.toFixed(2)),
    reason: bestMatch
      ? `Matched ${bestScore} keyword(s) for "${bestMatch}"`
      : "No keyword match; default category recommended",
  };
}

/**
 * Summarize a long complaint description.
 * Returns a shorter version by extracting key sentences.
 *
 * @param {string} description - Complaint description
 * @param {number} maxLength - Maximum length of summary
 * @returns {string} Summarized text
 */
function summarizeDescription(description, maxLength = 200) {
  if (!description || description.length <= maxLength) {
    return description;
  }

  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let summary = "";
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (summary.length + trimmed.length + 2 <= maxLength) {
      summary += (summary ? ". " : "") + trimmed;
    } else {
      break;
    }
  }

  if (!summary) {
    summary = description.substring(0, maxLength - 3) + "...";
  }

  return summary.trim();
}

/**
 * Flag potentially urgent reports for staff review.
 * Only title and description are analyzed - no personal data.
 *
 * @param {string} title - Complaint title
 * @param {string} description - Complaint description
 * @returns {object} { isUrgent: boolean, urgencyScore: number, matchedKeywords: string[], reason: string }
 */
function flagUrgency(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const matched = [];

  for (const keyword of URGENCY_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    }
  }

  const urgencyScore = Math.min(matched.length / 5, 1);
  const isUrgent = matched.length >= 2;

  return {
    isUrgent,
    urgencyScore: Number(urgencyScore.toFixed(2)),
    matchedKeywords: matched,
    reason: isUrgent
      ? `Matched ${matched.length} urgency keyword(s): ${matched.join(", ")}`
      : "No urgency keywords detected",
  };
}

module.exports = {
  suggestCategory,
  summarizeDescription,
  flagUrgency,
};