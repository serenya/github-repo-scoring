export interface IRepositoryFilter {
  language: string | null;
  createdAfter: Date | null;
  page: number;
  perPage: number;
}

export class RepositoryFilter implements IRepositoryFilter {
  constructor(
    public readonly language: string | null,
    public readonly createdAfter: Date | null,
    public readonly page: number,
    public readonly perPage: number,
  ) {}
}
