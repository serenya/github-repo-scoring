export class GitHubRepo {
  constructor(
    public readonly id: number,
    public readonly fullName: string,
    public readonly description: string | null,
    public readonly language: string | null,
    public readonly stars: number,
    public readonly forks: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly htmlUrl: string,
  ) {}
}
