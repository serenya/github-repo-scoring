export class GitHubRepoFilter {
  constructor(
    public readonly language: string | null,
    public readonly createdAfter: Date | null,
    public readonly page: number,
    public readonly perPage: number,
  ) {}
}
