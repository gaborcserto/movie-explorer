import type {
  PersonFilmographyEntry,
  PersonSeriesCredit,
} from '@movie-explorer/contracts';

import {
  getFilmographyRoles,
  getFilmographySelection,
  filmographyIdentity,
} from './filmographyRules';

function movie(
  id: number,
  overrides: Partial<PersonFilmographyEntry> = {}
): PersonFilmographyEntry {
  return {
    id,
    title: `Movie ${id}`,
    posterUrl: `/poster-${id}.jpg`,
    genres: ['Drama'],
    releaseDate: '2020-01-01',
    actingCredits: ['Hero'],
    crewCredits: [],
    ...overrides,
  };
}

const seriesCredit: PersonSeriesCredit = {
  mediaType: 'tv',
  id: 1,
  title: 'Series',
  originalTitle: null,
  firstAirDate: '2022-01-01',
  posterUrl: null,
  genres: [],
  actingCredits: ['One', 'Two'],
  actingRoles: [
    { creditId: 'a', character: 'One', episodeCount: 4 },
    { creditId: 'b', character: 'Two', episodeCount: 3 },
  ],
  crewCredits: [
    { job: 'Writer', episodeCount: 2 },
    { job: 'Producer', episodeCount: null },
  ],
};

describe('Combined filmography rules', () => {
  it.each([null, 0, -1, 1.5, NaN, Infinity])(
    'omits unreliable episode count %s while preserving roles',
    (episodeCount) => {
      const credit: PersonSeriesCredit = {
        ...seriesCredit,
        actingRoles: [{ creditId: 'a', character: 'Guide', episodeCount }],
        crewCredits: [{ job: 'Writer', episodeCount }],
      };

      expect(getFilmographyRoles(credit, 'acting', '')).toEqual(['Guide']);
      expect(getFilmographyRoles(credit, 'crew', '')).toEqual(['Writer']);
    }
  );

  it('preserves characters and jobs without episode data', () => {
    const credit: PersonSeriesCredit = {
      ...seriesCredit,
      actingRoles: undefined,
      actingCredits: ['Cathy Ames'],
      crewCredits: [{ job: 'Writer' }],
    };

    expect(getFilmographyRoles(credit, 'acting', '')).toEqual(['Cathy Ames']);
    expect(getFilmographyRoles(credit, 'crew', '')).toEqual(['Writer']);
  });

  it('keeps numeric ID collisions separate and counts distinct titles across overlapping credits', () => {
    const entries = [
      movie(1),
      seriesCredit,
      { ...seriesCredit, actingCredits: ['Third'] },
    ];
    const before = JSON.stringify(entries);
    const selection = getFilmographySelection(entries, new URLSearchParams());
    expect(selection.sortedMovies.map(filmographyIdentity)).toEqual([
      'tv:1',
      'movie:1',
    ]);
    expect(selection.sortedMovies[0].actingCredits).toEqual([
      'One',
      'Two',
      'Third',
    ]);
    expect(JSON.stringify(entries)).toBe(before);
    expect(
      getFilmographySelection(entries, new URLSearchParams('personView=crew'))
        .sortedMovies
    ).toHaveLength(1);
  });

  it('composes media/view/job filters, dates and unrelated repeated URL parameters', () => {
    const entries = [
      movie(1),
      seriesCredit,
      { ...seriesCredit, id: 2, firstAirDate: null },
    ];
    const selection = getFilmographySelection(
      entries,
      new URLSearchParams(
        'personType=tv&personView=crew&personRole=job:Writer&personSort=oldest&tag=a&tag=b'
      )
    );
    expect(selection.sortedMovies.map(filmographyIdentity)).toEqual([
      'tv:1',
      'tv:2',
    ]);
    expect(new URLSearchParams(selection.canonicalQuery).getAll('tag')).toEqual(
      ['a', 'b']
    );
    expect(selection.role).toBe('job:Writer');
    expect(
      getFilmographySelection(entries, new URLSearchParams('personType=movie'))
        .sortedMovies
    ).toHaveLength(1);
    expect(
      getFilmographySelection([seriesCredit], new URLSearchParams())
        .sortedMovies
    ).toHaveLength(1);
  });

  it('retains unavailable-group selections until recovery and keeps episode counts at role level', () => {
    const params = new URLSearchParams(
      'personType=tv&personView=crew&personRole=job:Writer'
    );
    const selection = getFilmographySelection([movie(1)], params, true);
    expect(selection.view).toBe('crew');
    expect(selection.role).toBe('job:Writer');
    expect(getFilmographyRoles(seriesCredit, 'acting', '')).toEqual([
      'One · 4 episodes',
      'Two · 3 episodes',
    ]);
    expect(
      getFilmographyRoles(seriesCredit, 'crew', 'job:Writer')[0]
    ).toContain('2 episodes');
    expect(getFilmographySelection([movie(1)], params).role).toBe('');
  });
});

const mixed = [
  movie(1, {
    actingCredits: [' Hero ', 'Narrator', 'Hero'],
    crewCredits: [{ job: ' Director ', department: ' Directing ' }],
  }),
  movie(2, {
    actingCredits: undefined,
    crewCredits: [
      { job: ' Producer ', department: ' Production ' },
      { job: 'Executive Producer', department: 'Production' },
    ],
  }),
  movie(3, { actingCredits: [] }),
  movie(4, {
    actingCredits: undefined,
    crewCredits: [{ job: ' ', department: ' Production ' }, {}],
  }),
];

test('merges duplicate IDs with later metadata and first-seen distinct character order', () => {
  const first = movie(1, {
    actingCredits: [' Hero ', '', 'Narrator', 'Hero'],
    crewCredits: [{ job: 'Director' }],
  });
  const last = movie(1, {
    title: 'Replacement',
    posterUrl: '/replacement.jpg',
    posterSrcSet: '/replacement-large.jpg 2x',
    genres: ['Comedy'],
    releaseDate: undefined,
    actingCredits: ['Narrator', ' Villain '],
    crewCredits: [{ job: 'Director' }, { job: 'Writer' }],
  });

  const result = getFilmographySelection(
    [first, movie(2), last],
    new URLSearchParams()
  );

  expect(result.sortedMovies).toHaveLength(2);
  expect(result.sortedMovies[1]).toEqual({
    ...last,
    actingCredits: ['Hero', 'Narrator', 'Villain'],
    crewCredits: [{ job: 'Director' }, { job: 'Director' }, { job: 'Writer' }],
  });
});

test.each([
  [undefined, undefined, false],
  [[], undefined, true],
  [undefined, [], true],
  [['Hero'], undefined, true],
])(
  'preserves acting presence when duplicate credits are %j then %j',
  (first, last, hasActing) => {
    const result = getFilmographySelection(
      [movie(1, { actingCredits: first }), movie(1, { actingCredits: last })],
      new URLSearchParams()
    );

    expect(result.hasActing).toBe(hasActing);
    expect(result.sortedMovies).toHaveLength(hasActing ? 1 : 0);
  }
);

test('defaults to Acting, retaining empty acting lists and offering roles from all movies', () => {
  const result = getFilmographySelection(mixed, new URLSearchParams());

  expect(result).toMatchObject({
    hasActing: true,
    hasCrew: true,
    view: 'acting',
    role: '',
    sort: 'newest',
    canonicalQuery: '',
  });
  expect(result.sortedMovies.map(({ id }) => id)).toEqual([1, 3]);
  expect(result.roles).toEqual([
    'department:Production',
    'job:Director',
    'job:Executive Producer',
    'job:Producer',
  ]);
});

test('department fallback includes named jobs and labels only matching roles', () => {
  const result = getFilmographySelection(
    mixed,
    new URLSearchParams('personView=crew&personRole=department%3AProduction')
  );

  expect(result.sortedMovies.map(({ id }) => id)).toEqual([2, 4]);
  expect(
    getFilmographyRoles(result.sortedMovies[0], result.view, result.role)
  ).toEqual(['Producer — Production', 'Executive Producer — Production']);
  expect(
    getFilmographyRoles(result.sortedMovies[1], result.view, result.role)
  ).toEqual(['Production']);
});

test('job filtering uses exact identity and excludes other jobs in the same department', () => {
  const result = getFilmographySelection(
    mixed,
    new URLSearchParams(
      'personView=crew&personRole=job%3AProducer&personSort=oldest'
    )
  );

  expect(result.sortedMovies.map(({ id }) => id)).toEqual([2]);
  expect(
    getFilmographyRoles(result.sortedMovies[0], result.view, result.role)
  ).toEqual(['Producer — Production']);
  expect(result.sort).toBe('oldest');
});

test('crew participation includes blank credit objects without inventing role options or labels', () => {
  const entry = movie(1, { actingCredits: undefined, crewCredits: [{}] });
  const result = getFilmographySelection(
    [entry],
    new URLSearchParams('personView=acting')
  );

  expect(result).toMatchObject({
    hasActing: false,
    hasCrew: true,
    view: 'crew',
    roles: [],
    canonicalQuery: '',
  });
  expect(result.sortedMovies).toHaveLength(1);
  expect(getFilmographyRoles(entry, 'crew', '')).toEqual([]);
});

test.each([
  [
    'personView=invalid&personRole=job%3ADirector&personSort=invalid',
    'acting',
    '',
    'newest',
    '',
  ],
  [
    'personView=acting&personRole=job%3ADirector&personSort=newest',
    'acting',
    '',
    'newest',
    '',
  ],
  [
    'personView=crew&personRole=job%3AFake&personSort=title',
    'crew',
    '',
    'title',
    'personView=crew&personSort=title',
  ],
  [
    'personView=crew&personRole=job%3ADirector&personSort=oldest',
    'crew',
    'job:Director',
    'oldest',
    'personView=crew&personRole=job%3ADirector&personSort=oldest',
  ],
])(
  'resolves effective selection and canonical query for %s',
  (query, view, role, sort, canonicalQuery) => {
    const params = new URLSearchParams(`keep=one&${query}&keep=two`);
    const original = params.toString();

    const result = getFilmographySelection(mixed, params);

    expect(result).toMatchObject({
      view,
      role,
      sort,
      canonicalQuery: `keep=one&keep=two${canonicalQuery ? `&${canonicalQuery}` : ''}`,
    });
    expect(params.toString()).toBe(original);
    expect(
      getFilmographySelection(mixed, new URLSearchParams(result.canonicalQuery))
    ).toEqual(result);
  }
);

test('falls back from Crew when only Acting is available', () => {
  const result = getFilmographySelection(
    [movie(1)],
    new URLSearchParams('personView=crew&personRole=job%3ADirector')
  );

  expect(result).toMatchObject({
    view: 'acting',
    role: '',
    hasCrew: false,
    canonicalQuery: '',
  });
});

const unsorted = [
  movie(6, { title: 'Undated Z', releaseDate: undefined }),
  movie(4, { title: 'Bravo', releaseDate: '2020-01-01' }),
  movie(3, { title: 'Alpha', releaseDate: '2020-01-01' }),
  movie(2, { title: 'Alpha', releaseDate: '2020-01-01' }),
  movie(5, { title: 'Undated A', releaseDate: '' }),
  movie(1, { title: 'Future', releaseDate: '2099-01-01' }),
  movie(7, { title: 'Old', releaseDate: '1990-12-31' }),
  movie(8, { title: 'Earlier that year', releaseDate: '2020-01-02' }),
];

test.each([
  ['newest', [1, 8, 2, 3, 4, 7, 5, 6]],
  ['oldest', [7, 2, 3, 4, 8, 1, 5, 6]],
  ['title', [2, 3, 4, 8, 1, 7, 5, 6]],
])(
  'sorts %s by full dates or title, breaking ties by title then ID',
  (sort, ids) => {
    const result = getFilmographySelection(
      unsorted,
      new URLSearchParams(`personSort=${sort}`)
    );

    expect(result.sortedMovies.map(({ id }) => id)).toEqual(ids);
  }
);

test('empty and nonparticipating entries return no movies or fabricated selections', () => {
  [[], [movie(1, { actingCredits: undefined })]].forEach((entries) => {
    const result = getFilmographySelection(
      entries,
      new URLSearchParams('personView=acting&personRole=job%3AFake')
    );

    expect(result).toMatchObject({
      hasActing: false,
      hasCrew: false,
      view: 'crew',
      role: '',
      roles: [],
      sortedMovies: [],
      canonicalQuery: '',
    });
  });
});

test('deduplicates trimmed labels while retaining distinct jobs and departments', () => {
  const entry = movie(1, {
    actingCredits: [' Hero ', '', 'Narrator', 'Hero'],
    crewCredits: [
      { job: ' Director ', department: ' Directing ' },
      { job: 'Director', department: 'Directing' },
      { job: 'Writing', department: 'Writing' },
      { department: ' Production ' },
      {},
    ],
  });

  expect(getFilmographyRoles(entry, 'acting', '')).toEqual([
    'Hero',
    'Narrator',
  ]);
  expect(getFilmographyRoles(entry, 'crew', '')).toEqual([
    'Director — Directing',
    'Writing',
    'Production',
  ]);
  expect(getFilmographyRoles(entry, 'crew', 'job:Missing')).toEqual([]);
  expect(
    getFilmographyRoles(movie(2, { actingCredits: undefined }), 'acting', '')
  ).toEqual([]);
});

test('repeated selection and label derivation leave frozen input data unchanged', () => {
  const entries = [
    mixed[0],
    movie(1, {
      actingCredits: [' Villain '],
      crewCredits: [{ job: 'Writer' }],
    }),
    ...mixed.slice(1),
  ];
  const original = structuredClone(entries);
  entries.forEach((entry) => {
    entry.crewCredits.forEach(Object.freeze);
    Object.freeze(entry.crewCredits);
    Object.freeze(entry.actingCredits);
    Object.freeze(entry.genres);
    Object.freeze(entry);
  });
  Object.freeze(entries);
  const params = new URLSearchParams('personView=crew&personSort=title');

  const first = getFilmographySelection(entries, params);
  const second = getFilmographySelection(entries, params);
  first.sortedMovies.forEach((entry) =>
    getFilmographyRoles(entry, first.view, first.role)
  );

  expect(first).toEqual(second);
  expect(entries).toEqual(original);
  expect(params.toString()).toBe('personView=crew&personSort=title');
});
