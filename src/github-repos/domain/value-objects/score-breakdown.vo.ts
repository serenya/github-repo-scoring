export interface IScoreBreakdown {
  starsScore: number;
  forksScore: number;
  recencyScore: number;
}

export class ScoreBreakdown implements IScoreBreakdown {
  constructor(
    public readonly starsScore: number,
    public readonly forksScore: number,
    public readonly recencyScore: number,
  ) {}
}
