import { ScoringService } from './scoring.service';
import { GitHubRepo } from '../entities/github-repo.entity';

const NOW = new Date('2026-04-05T00:00:00.000Z');

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return new GitHubRepo(
    overrides.id ?? 1,
    overrides.fullName ?? 'owner/repo',
    overrides.description ?? null,
    overrides.language ?? null,
    overrides.stars ?? 0,
    overrides.forks ?? 0,
    overrides.createdAt ?? new Date('2020-01-01'),
    overrides.updatedAt ?? NOW,
    overrides.htmlUrl ?? 'https://github.com/owner/repo',
  );
}

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  describe('computeScore', () => {
    it('returns score=33 for 0 stars, 0 forks, updated today', () => {
      const repo = makeRepo({ stars: 0, forks: 0, updatedAt: NOW });
      const result = service.computeScore(repo, NOW);

      expect(result.breakdown.starsScore).toBe(0);
      expect(result.breakdown.forksScore).toBe(0);
      expect(result.breakdown.recencyScore).toBe(100);
      expect(result.score).toBe(33);
    });

    it('returns recencyScore=0 for repo updated 730+ days ago', () => {
      const staleDate = new Date(NOW.getTime() - 730 * 24 * 60 * 60 * 1000);
      const repo = makeRepo({ updatedAt: staleDate });
      const result = service.computeScore(repo, NOW);

      expect(result.breakdown.recencyScore).toBe(0);
    });

    it('returns recencyScore≈50 for repo updated 365 days ago', () => {
      const halfwayDate = new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000);
      const repo = makeRepo({ updatedAt: halfwayDate });
      const result = service.computeScore(repo, NOW);

      expect(result.breakdown.recencyScore).toBeCloseTo(50, 0);
    });

    it('caps starsScore at 100 for stars >= 100_000', () => {
      const repo = makeRepo({ stars: 100_000 });
      const result = service.computeScore(repo, NOW);

      expect(result.breakdown.starsScore).toBe(100);
    });

    it('caps forksScore at 100 for forks >= 50_000', () => {
      const repo = makeRepo({ forks: 50_000 });
      const result = service.computeScore(repo, NOW);

      expect(result.breakdown.forksScore).toBe(100);
    });

    it('applies log scaling: 1000 stars scores between 10-star and 100k-star repos', () => {
      const low = service.computeScore(makeRepo({ stars: 10 }), NOW);
      const mid = service.computeScore(makeRepo({ stars: 1_000 }), NOW);
      const high = service.computeScore(makeRepo({ stars: 100_000 }), NOW);

      expect(mid.breakdown.starsScore).toBeGreaterThan(low.breakdown.starsScore);
      expect(high.breakdown.starsScore).toBeGreaterThan(mid.breakdown.starsScore);
    });

    it('final score is always in [0, 100]', () => {
      const cases = [
        makeRepo({ stars: 0, forks: 0, updatedAt: new Date(0) }),
        makeRepo({ stars: 1_000_000, forks: 500_000, updatedAt: NOW }),
      ];
      for (const repo of cases) {
        const { score } = service.computeScore(repo, NOW);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it('uses current date when now is not provided', () => {
      const repo = makeRepo({ updatedAt: new Date() });
      const result = service.computeScore(repo);

      expect(result.breakdown.recencyScore).toBeGreaterThanOrEqual(99);
    });

    it('attaches the original repository to the result', () => {
      const repo = makeRepo({ id: 42, fullName: 'foo/bar' });
      const result = service.computeScore(repo, NOW);

      expect(result.repository).toBe(repo);
    });
  });
});
