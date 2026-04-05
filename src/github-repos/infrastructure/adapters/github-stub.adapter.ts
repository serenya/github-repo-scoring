import { Injectable } from '@nestjs/common';
import { IGithubRepositoryPort, IPaginatedRepositories } from '../../application/ports/github-repository.port';
import { IRepositoryFilter } from '../../domain/value-objects/repository-filter.vo';
import { IRepository, Repository } from '../../domain/entities/repository.entity';

const STUB_REPOSITORIES: IRepository[] = [
  new Repository(10270250, 'nestjs/nest', 'A progressive Node.js framework for building efficient and scalable server-side applications', 'TypeScript', 68000, 7600, new Date('2017-02-04'), new Date('2026-03-30'), 'https://github.com/nestjs/nest'),
  new Repository(10270251, 'facebook/react', 'The library for web and native user interfaces', 'TypeScript', 225000, 46000, new Date('2013-05-24'), new Date('2026-03-28'), 'https://github.com/facebook/react'),
  new Repository(10270252, 'microsoft/TypeScript', 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output', 'TypeScript', 101000, 12500, new Date('2014-06-19'), new Date('2026-04-01'), 'https://github.com/microsoft/TypeScript'),
  new Repository(10270253, 'vuejs/vue', 'This is the repo for Vue 2. For Vue 3, go to https://github.com/vuejs/core', 'JavaScript', 207000, 33500, new Date('2013-07-29'), new Date('2026-02-10'), 'https://github.com/vuejs/vue'),
  new Repository(10270254, 'expressjs/express', 'Fast, unopinionated, minimalist web framework for node', 'JavaScript', 65000, 15000, new Date('2009-06-26'), new Date('2024-11-01'), 'https://github.com/expressjs/express'),
  new Repository(10270255, 'django/django', 'The Web framework for perfectionists with deadlines', 'Python', 81000, 31500, new Date('2012-04-28'), new Date('2026-03-25'), 'https://github.com/django/django'),
  new Repository(10270256, 'tiangolo/fastapi', 'FastAPI framework, high performance, easy to learn, fast to code, ready for production', 'Python', 79000, 6700, new Date('2018-12-08'), new Date('2026-03-15'), 'https://github.com/tiangolo/fastapi'),
  new Repository(10270257, 'golang/go', 'The Go programming language', 'Go', 125000, 17800, new Date('2014-08-19'), new Date('2026-04-02'), 'https://github.com/golang/go'),
];

@Injectable()
export class GithubStubAdapter implements IGithubRepositoryPort {
  async search(filter: IRepositoryFilter): Promise<IPaginatedRepositories> {
    let results = [...STUB_REPOSITORIES];

    if (filter.language) {
      const lang = filter.language.toLowerCase();
      results = results.filter((r) => r.language?.toLowerCase() === lang);
    }

    if (filter.createdAfter) {
      results = results.filter((r) => r.createdAt >= filter.createdAfter!);
    }

    const total = results.length;
    const start = (filter.page - 1) * filter.perPage;
    const items = results.slice(start, start + filter.perPage);

    return { items, total, page: filter.page, perPage: filter.perPage };
  }
}
