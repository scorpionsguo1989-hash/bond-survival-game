// api/validate.js

const VALID_GRADES = ['S', 'A', 'B', 'C', 'D'];
const VALID_REGIONS = ['east_core', 'central_capital', 'west_prefecture', 'northeast_old'];
const VALID_HEALTH = ['good', 'medium', 'weak'];
export const VALID_ROLES = ['cfo', 'im', 'gov'];

// 与前端 score.js getScoreGrade 保持一致
const GRADE_RANGES = {
  S: [90, 200],
  A: [75, 89],
  B: [60, 74],
  C: [40, 59],
  D: [0, 39],
};

export function validateScoreSubmission(data) {
  if (!data || typeof data !== 'object') {
    return fail('request body must be a JSON object');
  }

  // nickname: optional, max 20 chars
  if (data.nickname != null) {
    if (typeof data.nickname !== 'string' || data.nickname.length > 20) {
      return fail('nickname must be a string of at most 20 characters');
    }
  }

  // directorName: required, max 30
  if (!data.directorName || typeof data.directorName !== 'string' || data.directorName.length > 30) {
    return fail('directorName is required and must be at most 30 characters');
  }

  // platformName: required, max 30
  if (!data.platformName || typeof data.platformName !== 'string' || data.platformName.length > 30) {
    return fail('platformName is required and must be at most 30 characters');
  }

  // regionTier
  if (!VALID_REGIONS.includes(data.regionTier)) {
    return fail('regionTier must be one of: ' + VALID_REGIONS.join(', '));
  }

  // healthLevel
  if (!VALID_HEALTH.includes(data.healthLevel)) {
    return fail('healthLevel must be one of: ' + VALID_HEALTH.join(', '));
  }

  // role: optional for backward compatibility; missing role is defaulted to cfo by server.js.
  if (data.role !== undefined && !VALID_ROLES.includes(data.role)) {
    return fail('role must be one of: ' + VALID_ROLES.join(', '));
  }

  // score: integer 0-200
  if (!Number.isInteger(data.score) || data.score < 0 || data.score > 200) {
    return fail('score must be an integer between 0 and 200');
  }

  // grade
  if (!VALID_GRADES.includes(data.grade)) {
    return fail('grade must be one of: S, A, B, C, D');
  }

  // grade-score consistency
  const [min, max] = GRADE_RANGES[data.grade];
  if (data.score < min || data.score > max) {
    return fail(`grade ${data.grade} requires score ${min}-${max}, got ${data.score}`);
  }

  // quartersPassed: 1-12
  if (!Number.isInteger(data.quartersPassed) || data.quartersPassed < 1 || data.quartersPassed > 12) {
    return fail('quartersPassed must be an integer between 1 and 12');
  }

  // survived
  if (typeof data.survived !== 'boolean') {
    return fail('survived must be a boolean');
  }

  // survived + quarters consistency
  if (data.survived && data.quartersPassed !== 12) {
    return fail('survived=true requires quartersPassed=12');
  }

  return { valid: true };
}

function fail(error) {
  return { valid: false, error };
}
