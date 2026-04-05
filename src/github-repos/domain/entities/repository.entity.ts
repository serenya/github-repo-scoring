export interface IRepository {
  id: number;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: Date;
  updatedAt: Date;
  htmlUrl: string;
}

export class Repository implements IRepository {
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
