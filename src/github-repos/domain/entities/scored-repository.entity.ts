import { IRepository } from './repository.entity';
import { IScoreBreakdown } from '../value-objects/score-breakdown.vo';

export interface IScoredRepository {
  repository: IRepository;
  score: number;
  breakdown: IScoreBreakdown;
}

export class ScoredRepository implements IScoredRepository {
  constructor(
    public readonly repository: IRepository,
    public readonly score: number,
    public readonly breakdown: IScoreBreakdown,
  ) {}
}
