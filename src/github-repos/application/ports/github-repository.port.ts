import { IRepository } from '../../domain/entities/repository.entity';
import { IRepositoryFilter } from '../../domain/value-objects/repository-filter.vo';

export const GITHUB_REPOSITORY_PORT = Symbol('GithubRepositoryPort');

export interface IPaginatedRepositories {
  items: IRepository[];
  total: number;
  page: number;
  perPage: number;
}

export interface IGithubRepositoryPort {
  search(filter: IRepositoryFilter): Promise<IPaginatedRepositories>;
}
