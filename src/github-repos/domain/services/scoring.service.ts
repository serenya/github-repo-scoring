import { IRepository } from '../entities/repository.entity';
import { IScoredRepository, ScoredRepository } from '../entities/scored-repository.entity';
import { ScoreBreakdown } from '../value-objects/score-breakdown.vo';

const MAX_STARS_REFERENCE = 100_000;
const MAX_FORKS_REFERENCE = 50_000;
const MAX_STALE_DAYS = 730; // 2 years

export class ScoringService {
  computeScore(repo: IRepository, now: Date = new Date()): IScoredRepository {
    const starsScore = this.computeStarsScore(repo.stars);
    const forksScore = this.computeForksScore(repo.forks);
    const recencyScore = this.computeRecencyScore(repo.updatedAt, now);

    const score = Math.round((starsScore + forksScore + recencyScore) / 3);

    return new ScoredRepository(repo, score, new ScoreBreakdown(starsScore, forksScore, recencyScore));
  }

  private computeStarsScore(stars: number): number {
    const raw = (Math.log10(stars + 1) / Math.log10(MAX_STARS_REFERENCE + 1)) * 100;
    return Math.round(Math.min(100, raw) * 10) / 10;
  }

  private computeForksScore(forks: number): number {
    const raw = (Math.log10(forks + 1) / Math.log10(MAX_FORKS_REFERENCE + 1)) * 100;
    return Math.round(Math.min(100, raw) * 10) / 10;
  }

  private computeRecencyScore(updatedAt: Date, now: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSince = (now.getTime() - updatedAt.getTime()) / msPerDay;
    const raw = 100 - (daysSince / MAX_STALE_DAYS) * 100;
    return Math.round(Math.max(0, raw) * 10) / 10;
  }
}
