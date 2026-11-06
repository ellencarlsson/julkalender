/** Hint points: earned from completed side quests, spent on revealing crossword words. */

export const DEFAULT_SIDE_QUEST_REWARD = 1;

const rewardOf = (quest) => (Number.isInteger(quest?.reward) && quest.reward > 0 ? quest.reward : DEFAULT_SIDE_QUEST_REWARD);

/**
 * Current hint point balance, derived from what is stored rather than kept as a counter,
 * so saving from two devices at once can never double-count.
 *
 * Args:
 *   sideQuests: the side quests that currently exist ({ id, reward }).
 *   completedIds: iterable of completed side quest ids.
 *   revealedWords: iterable of word keys revealed with a hint point.
 *   usedHints: iterable of task keys whose hint text was bought with a hint point.
 * Returns:
 *   Earned minus spent, never below 0.
 */
export function hintBalance(sideQuests, completedIds, revealedWords, usedHints = []) {
  const completed = new Set(completedIds);
  const earned = sideQuests.filter((quest) => completed.has(quest.id)).reduce((sum, quest) => sum + rewardOf(quest), 0);
  return Math.max(0, earned - new Set(revealedWords).size - new Set(usedHints).size);
}

export function sideQuestReward(quest) {
  return rewardOf(quest);
}
