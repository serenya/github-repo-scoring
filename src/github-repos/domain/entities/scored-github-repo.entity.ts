import { GitHubRepo } from './github-repo.entity';
import { ScoreBreakdown } from '../value-objects/score-breakdown.vo';

export class ScoredGitHubRepo {
  constructor(
    public readonly repository: GitHubRepo,
    public readonly score: number,
    public readonly breakdown: ScoreBreakdown,
  ) {}
}
