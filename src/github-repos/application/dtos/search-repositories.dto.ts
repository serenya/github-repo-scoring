import { IScoredRepository } from '../../domain/entities/scored-repository.entity';

export interface SearchRepositoriesInput {
  language: string | null;
  createdAfter: Date | null;
  page: number;
  perPage: number;
}

export interface SearchRepositoriesOutput {
  items: IScoredRepository[];
  total: number;
  page: number;
  perPage: number;
}
